import type {ResultSet} from 'react-native-sqlite-storage';
import {
  ConflictRecord,
  LocalDatabaseSnapshot,
  LocalTaskUpdateInput,
  SyncQueueRecord,
  TaskRecord,
} from '../../domain/taskModels';
import {createUniqueIdentifier} from '../../shared/idHelpers';
import {
  addSecondsToIsoTimestamp,
  calculateRetryDelayInSeconds,
  getCurrentIsoTimestamp,
} from '../../shared/timeHelpers';
import {executeSqlQuery, executeTransaction} from './databaseConnection';
import {
  mapConflictRecordToDatabaseParameters,
  mapDatabaseRowToConflictRecord,
  mapDatabaseRowToSyncQueueRecord,
  mapDatabaseRowToTaskRecord,
  mapSyncQueueRecordToDatabaseParameters,
  mapTaskRecordToDatabaseParameters,
} from './databaseMappers';
import {initializeDatabaseSchemaAndSeedDataIfNeeded} from './databaseSchema';

const UPSERT_TASK_SQL = `
INSERT OR REPLACE INTO tasks (
  id,
  title,
  price,
  business_status,
  sync_status,
  location_lat,
  location_lng,
  location_address,
  image_uri,
  expires_at,
  notes,
  server_version,
  updated_at,
  last_synced_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const INSERT_SYNC_QUEUE_ITEM_SQL = `
INSERT OR REPLACE INTO sync_queue (
  id,
  task_id,
  action_type,
  payload_json,
  state,
  attempt_count,
  next_retry_at,
  last_error,
  created_at,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const INSERT_CONFLICT_SQL = `
INSERT OR REPLACE INTO conflicts (
  id,
  task_id,
  server_payload_json,
  local_payload_json,
  resolution,
  created_at,
  resolved_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
`;

function mapResultSetToArray<T>(
  resultSet: ResultSet,
  rowMapper: (row: any) => T,
): T[] {
  const mappedRows: T[] = [];

  for (let index = 0; index < resultSet.rows.length; index += 1) {
    mappedRows.push(rowMapper(resultSet.rows.item(index)));
  }

  return mappedRows;
}

export async function initializeLocalDatabase(): Promise<void> {
  await initializeDatabaseSchemaAndSeedDataIfNeeded();
}

export async function readLocalDatabaseSnapshot(): Promise<LocalDatabaseSnapshot> {
  const tasksResult = await executeSqlQuery('SELECT * FROM tasks ORDER BY updated_at DESC');
  const queueResult = await executeSqlQuery('SELECT * FROM sync_queue ORDER BY created_at ASC');
  const conflictsResult = await executeSqlQuery(
    "SELECT * FROM conflicts WHERE resolution = 'pending' ORDER BY created_at DESC",
  );

  return {
    tasks: mapResultSetToArray(tasksResult, mapDatabaseRowToTaskRecord),
    queueItems: mapResultSetToArray(queueResult, mapDatabaseRowToSyncQueueRecord),
    conflicts: mapResultSetToArray(conflictsResult, mapDatabaseRowToConflictRecord),
  };
}

export async function readTaskById(taskId: string): Promise<TaskRecord | null> {
  const taskResult = await executeSqlQuery('SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);

  if (taskResult.rows.length === 0) {
    return null;
  }

  return mapDatabaseRowToTaskRecord(taskResult.rows.item(0));
}

export async function saveTaskUpdateAndQueueSync(
  taskId: string,
  localTaskUpdateInput: LocalTaskUpdateInput,
): Promise<void> {
  const existingTask = await readTaskById(taskId);

  if (!existingTask) {
    throw new Error(`Task not found for id: ${taskId}`);
  }

  const now = getCurrentIsoTimestamp();

  const updatedTaskRecord: TaskRecord = {
    ...existingTask,
    businessStatus: localTaskUpdateInput.businessStatus ?? existingTask.businessStatus,
    notes: localTaskUpdateInput.notes ?? existingTask.notes,
    imageUri:
      localTaskUpdateInput.imageUri !== undefined
        ? localTaskUpdateInput.imageUri
        : existingTask.imageUri,
    syncStatus: 'pending_sync',
    updatedAt: now,
  };

  const queueRecord: SyncQueueRecord = {
    id: createUniqueIdentifier('queue'),
    taskId: updatedTaskRecord.id,
    actionType: 'UPSERT_TASK',
    payloadJson: JSON.stringify(updatedTaskRecord),
    state: 'queued',
    attemptCount: 0,
    nextRetryAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  await executeTransaction(async () => {
    await executeSqlQuery(UPSERT_TASK_SQL, mapTaskRecordToDatabaseParameters(updatedTaskRecord));
    await executeSqlQuery('DELETE FROM sync_queue WHERE task_id = ?', [taskId]);
    await executeSqlQuery(
      INSERT_SYNC_QUEUE_ITEM_SQL,
      mapSyncQueueRecordToDatabaseParameters(queueRecord),
    );
    await executeSqlQuery('DELETE FROM conflicts WHERE task_id = ?', [taskId]);
  });
}

export async function readQueueItemsReadyForProcessing(
  readyAtIsoTimestamp: string,
  ignoreRetryWindow = false,
): Promise<SyncQueueRecord[]> {
  const readyQueueItemsQuery = ignoreRetryWindow
    ? `SELECT * FROM sync_queue
       WHERE (state = 'queued' OR state = 'failed')
       ORDER BY created_at ASC
       LIMIT 50`
    : `SELECT * FROM sync_queue
       WHERE (state = 'queued' OR state = 'failed')
       AND next_retry_at <= ?
       ORDER BY created_at ASC
       LIMIT 50`;

  const readyQueueItemsParameters = ignoreRetryWindow ? [] : [readyAtIsoTimestamp];

  const readyQueueItems = await executeSqlQuery(
    readyQueueItemsQuery,
    readyQueueItemsParameters,
  );

  return mapResultSetToArray(readyQueueItems, mapDatabaseRowToSyncQueueRecord);
}

export async function markQueueItemAsProcessing(queueItemId: string): Promise<void> {
  await executeSqlQuery(
    "UPDATE sync_queue SET state = 'processing', updated_at = ? WHERE id = ?",
    [getCurrentIsoTimestamp(), queueItemId],
  );
}

export async function markQueueItemForRetry(
  queueItemId: string,
  newAttemptCount: number,
  errorMessage: string,
): Promise<void> {
  const now = getCurrentIsoTimestamp();
  const delaySeconds = calculateRetryDelayInSeconds(newAttemptCount);
  const nextRetryAt = addSecondsToIsoTimestamp(now, delaySeconds);

  await executeSqlQuery(
    `UPDATE sync_queue
     SET state = 'failed',
         attempt_count = ?,
         next_retry_at = ?,
         last_error = ?,
         updated_at = ?
     WHERE id = ?`,
    [newAttemptCount, nextRetryAt, errorMessage, now, queueItemId],
  );
}

export async function removeQueueItem(queueItemId: string): Promise<void> {
  await executeSqlQuery('DELETE FROM sync_queue WHERE id = ?', [queueItemId]);
}

export async function markTaskAsSyncing(taskId: string): Promise<void> {
  await executeSqlQuery(
    "UPDATE tasks SET sync_status = 'syncing', updated_at = ? WHERE id = ?",
    [getCurrentIsoTimestamp(), taskId],
  );
}

export async function markTaskAsSynced(
  taskId: string,
  newServerVersion: number,
  syncedAtIsoTimestamp: string,
): Promise<void> {
  await executeSqlQuery(
    `UPDATE tasks
     SET sync_status = 'synced',
         server_version = ?,
         last_synced_at = ?,
         updated_at = ?
     WHERE id = ?`,
    [newServerVersion, syncedAtIsoTimestamp, syncedAtIsoTimestamp, taskId],
  );
}

export async function markTaskAsSyncError(taskId: string): Promise<void> {
  await executeSqlQuery(
    "UPDATE tasks SET sync_status = 'error', updated_at = ? WHERE id = ?",
    [getCurrentIsoTimestamp(), taskId],
  );
}

export async function saveConflictForTask(
  taskId: string,
  serverTaskRecord: TaskRecord,
  localTaskPayloadJson: string,
): Promise<void> {
  const now = getCurrentIsoTimestamp();

  const taskWithConflictStatus: TaskRecord = {
    ...serverTaskRecord,
    syncStatus: 'conflict',
    updatedAt: now,
  };

  const conflictRecord: ConflictRecord = {
    id: createUniqueIdentifier('conflict'),
    taskId,
    serverPayloadJson: JSON.stringify(serverTaskRecord),
    localPayloadJson: localTaskPayloadJson,
    resolution: 'pending',
    createdAt: now,
    resolvedAt: null,
  };

  await executeTransaction(async () => {
    await executeSqlQuery(UPSERT_TASK_SQL, mapTaskRecordToDatabaseParameters(taskWithConflictStatus));
    await executeSqlQuery('DELETE FROM conflicts WHERE task_id = ?', [taskId]);
    await executeSqlQuery(INSERT_CONFLICT_SQL, mapConflictRecordToDatabaseParameters(conflictRecord));
  });
}

export async function acceptServerConflictResolution(taskId: string): Promise<void> {
  const now = getCurrentIsoTimestamp();

  await executeTransaction(async () => {
    await executeSqlQuery(
      `UPDATE tasks
       SET sync_status = 'synced',
           last_synced_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [now, now, taskId],
    );

    await executeSqlQuery(
      `UPDATE conflicts
       SET resolution = 'accept_server',
           resolved_at = ?
       WHERE task_id = ?`,
      [now, taskId],
    );
  });
}

export async function retryLocalConflictResolution(taskId: string): Promise<void> {
  const conflictResult = await executeSqlQuery(
    "SELECT * FROM conflicts WHERE task_id = ? AND resolution = 'pending' LIMIT 1",
    [taskId],
  );

  if (conflictResult.rows.length === 0) {
    return;
  }

  const conflictRecord = mapDatabaseRowToConflictRecord(conflictResult.rows.item(0));
  const localTaskRecord = JSON.parse(conflictRecord.localPayloadJson) as TaskRecord;
  const now = getCurrentIsoTimestamp();

  const retriedTaskRecord: TaskRecord = {
    ...localTaskRecord,
    syncStatus: 'pending_sync',
    updatedAt: now,
  };

  const newQueueRecord: SyncQueueRecord = {
    id: createUniqueIdentifier('queue'),
    taskId,
    actionType: 'UPSERT_TASK',
    payloadJson: JSON.stringify(retriedTaskRecord),
    state: 'queued',
    attemptCount: 0,
    nextRetryAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  await executeTransaction(async () => {
    await executeSqlQuery(UPSERT_TASK_SQL, mapTaskRecordToDatabaseParameters(retriedTaskRecord));
    await executeSqlQuery('DELETE FROM sync_queue WHERE task_id = ?', [taskId]);
    await executeSqlQuery(
      INSERT_SYNC_QUEUE_ITEM_SQL,
      mapSyncQueueRecordToDatabaseParameters(newQueueRecord),
    );
    await executeSqlQuery(
      `UPDATE conflicts
       SET resolution = 'retry_local',
           resolved_at = ?
       WHERE task_id = ?`,
      [now, taskId],
    );
  });
}
