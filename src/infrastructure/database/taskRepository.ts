import type {ResultSet} from 'react-native-sqlite-storage';
import {Conflict, QueueItem, Snapshot, Task, TaskPatch} from '../../domain/taskModels';
import {makeId} from '../../shared/idHelpers';
import {addSeconds, nowIso, retryDelaySeconds} from '../../shared/timeHelpers';
import {executeSqlQuery, executeTransaction} from './databaseConnection';
import {
  mapConflictToDatabaseParameters,
  mapDatabaseRowToConflict,
  mapDatabaseRowToQueueItem,
  mapDatabaseRowToTask,
  mapQueueItemToDatabaseParameters,
  mapTaskToDatabaseParameters,
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

function rowsToArray<T>(result: ResultSet, mapRow: (row: any) => T): T[] {
  const items: T[] = [];

  for (let index = 0; index < result.rows.length; index += 1) {
    items.push(mapRow(result.rows.item(index)));
  }

  return items;
}

export async function initializeLocalDatabase(): Promise<void> {
  await initializeDatabaseSchemaAndSeedDataIfNeeded();
}

export async function readSnapshot(): Promise<Snapshot> {
  const tasksResult = await executeSqlQuery('SELECT * FROM tasks ORDER BY updated_at DESC');
  const queueResult = await executeSqlQuery('SELECT * FROM sync_queue ORDER BY created_at ASC');
  const conflictsResult = await executeSqlQuery(
    "SELECT * FROM conflicts WHERE resolution = 'pending' ORDER BY created_at DESC",
  );

  return {
    tasks: rowsToArray(tasksResult, mapDatabaseRowToTask),
    queueItems: rowsToArray(queueResult, mapDatabaseRowToQueueItem),
    conflicts: rowsToArray(conflictsResult, mapDatabaseRowToConflict),
  };
}

async function readTask(taskId: string): Promise<Task | null> {
  const taskResult = await executeSqlQuery('SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);

  if (taskResult.rows.length === 0) {
    return null;
  }

  return mapDatabaseRowToTask(taskResult.rows.item(0));
}

export async function saveTaskUpdateAndQueueSync(
  taskId: string,
  patch: TaskPatch,
): Promise<void> {
  const existingTask = await readTask(taskId);

  if (!existingTask) {
    throw new Error(`Task not found for id: ${taskId}`);
  }

  const now = nowIso();

  const updatedTask: Task = {
    ...existingTask,
    businessStatus: patch.businessStatus ?? existingTask.businessStatus,
    notes: patch.notes ?? existingTask.notes,
    imageUri:
      patch.imageUri !== undefined
        ? patch.imageUri
        : existingTask.imageUri,
    syncStatus: 'pending_sync',
    updatedAt: now,
  };

  const queueItem: QueueItem = {
    id: makeId('queue'),
    taskId: updatedTask.id,
    actionType: 'UPSERT_TASK',
    payloadJson: JSON.stringify(updatedTask),
    state: 'queued',
    attemptCount: 0,
    nextRetryAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  await executeTransaction(async () => {
    await executeSqlQuery(UPSERT_TASK_SQL, mapTaskToDatabaseParameters(updatedTask));
    await executeSqlQuery('DELETE FROM sync_queue WHERE task_id = ?', [taskId]);
    await executeSqlQuery(
      INSERT_SYNC_QUEUE_ITEM_SQL,
      mapQueueItemToDatabaseParameters(queueItem),
    );
    await executeSqlQuery('DELETE FROM conflicts WHERE task_id = ?', [taskId]);
  });
}

export async function readQueueItemsReadyForProcessing(
  now: string,
  ignoreRetryWindow = false,
): Promise<QueueItem[]> {
  const sql = ignoreRetryWindow
    ? `SELECT * FROM sync_queue
       WHERE (state = 'queued' OR state = 'failed')
       ORDER BY created_at ASC
       LIMIT 50`
    : `SELECT * FROM sync_queue
       WHERE (state = 'queued' OR state = 'failed')
       AND next_retry_at <= ?
       ORDER BY created_at ASC
       LIMIT 50`;

  const params = ignoreRetryWindow ? [] : [now];

  const result = await executeSqlQuery(sql, params);

  return rowsToArray(result, mapDatabaseRowToQueueItem);
}

export async function markQueueItemAsProcessing(queueItemId: string): Promise<void> {
  await executeSqlQuery(
    "UPDATE sync_queue SET state = 'processing', updated_at = ? WHERE id = ?",
    [nowIso(), queueItemId],
  );
}

export async function markQueueItemForRetry(
  queueItemId: string,
  attemptCount: number,
  error: string,
): Promise<void> {
  const now = nowIso();
  const delaySeconds = retryDelaySeconds(attemptCount);
  const nextRetryAt = addSeconds(now, delaySeconds);

  await executeSqlQuery(
    `UPDATE sync_queue
     SET state = 'failed',
         attempt_count = ?,
         next_retry_at = ?,
         last_error = ?,
         updated_at = ?
     WHERE id = ?`,
    [attemptCount, nextRetryAt, error, now, queueItemId],
  );
}

export async function removeQueueItem(queueItemId: string): Promise<void> {
  await executeSqlQuery('DELETE FROM sync_queue WHERE id = ?', [queueItemId]);
}

export async function markTaskAsSyncing(taskId: string): Promise<void> {
  await executeSqlQuery(
    "UPDATE tasks SET sync_status = 'syncing', updated_at = ? WHERE id = ?",
    [nowIso(), taskId],
  );
}

export async function markTaskAsSynced(
  taskId: string,
  serverVersion: number,
  syncedAt: string,
): Promise<void> {
  await executeSqlQuery(
    `UPDATE tasks
     SET sync_status = 'synced',
         server_version = ?,
         last_synced_at = ?,
         updated_at = ?
     WHERE id = ?`,
    [serverVersion, syncedAt, syncedAt, taskId],
  );
}

export async function markTaskAsSyncError(taskId: string): Promise<void> {
  await executeSqlQuery(
    "UPDATE tasks SET sync_status = 'error', updated_at = ? WHERE id = ?",
    [nowIso(), taskId],
  );
}

export async function saveConflictForTask(
  taskId: string,
  serverTask: Task,
  localPayload: string,
): Promise<void> {
  const now = nowIso();

  const conflictedTask: Task = {
    ...serverTask,
    syncStatus: 'conflict',
    updatedAt: now,
  };

  const conflict: Conflict = {
    id: makeId('conflict'),
    taskId,
    serverPayloadJson: JSON.stringify(serverTask),
    localPayloadJson: localPayload,
    resolution: 'pending',
    createdAt: now,
    resolvedAt: null,
  };

  await executeTransaction(async () => {
    await executeSqlQuery(UPSERT_TASK_SQL, mapTaskToDatabaseParameters(conflictedTask));
    await executeSqlQuery('DELETE FROM conflicts WHERE task_id = ?', [taskId]);
    await executeSqlQuery(INSERT_CONFLICT_SQL, mapConflictToDatabaseParameters(conflict));
  });
}

export async function acceptServerConflictResolution(taskId: string): Promise<void> {
  const now = nowIso();

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

  const conflict = mapDatabaseRowToConflict(conflictResult.rows.item(0));
  const localTask = JSON.parse(conflict.localPayloadJson) as Task;
  const now = nowIso();

  const retriedTask: Task = {
    ...localTask,
    syncStatus: 'pending_sync',
    updatedAt: now,
  };

  const queueItem: QueueItem = {
    id: makeId('queue'),
    taskId,
    actionType: 'UPSERT_TASK',
    payloadJson: JSON.stringify(retriedTask),
    state: 'queued',
    attemptCount: 0,
    nextRetryAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  await executeTransaction(async () => {
    await executeSqlQuery(UPSERT_TASK_SQL, mapTaskToDatabaseParameters(retriedTask));
    await executeSqlQuery('DELETE FROM sync_queue WHERE task_id = ?', [taskId]);
    await executeSqlQuery(
      INSERT_SYNC_QUEUE_ITEM_SQL,
      mapQueueItemToDatabaseParameters(queueItem),
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
