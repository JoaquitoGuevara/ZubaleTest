import {
  Conflict,
  QueueItem,
  Task,
} from '../../domain/taskModels';

export function mapDatabaseRowToTask(row: any): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    price: Number(row.price),
    businessStatus: row.business_status,
    syncStatus: row.sync_status,
    location: {
      latitude: Number(row.location_lat),
      longitude: Number(row.location_lng),
      address: String(row.location_address),
    },
    imageUri: row.image_uri ?? null,
    expiresAt: String(row.expires_at),
    notes: row.notes ? String(row.notes) : '',
    serverVersion: Number(row.server_version ?? 0),
    updatedAt: String(row.updated_at),
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
  };
}

export function mapTaskToDatabaseParameters(task: Task): unknown[] {
  return [
    task.id,
    task.title,
    task.price,
    task.businessStatus,
    task.syncStatus,
    task.location.latitude,
    task.location.longitude,
    task.location.address,
    task.imageUri,
    task.expiresAt,
    task.notes,
    task.serverVersion,
    task.updatedAt,
    task.lastSyncedAt,
  ];
}

export function mapDatabaseRowToQueueItem(row: any): QueueItem {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    actionType: row.action_type,
    payloadJson: String(row.payload_json),
    state: row.state,
    attemptCount: Number(row.attempt_count),
    nextRetryAt: String(row.next_retry_at),
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapQueueItemToDatabaseParameters(item: QueueItem): unknown[] {
  return [
    item.id,
    item.taskId,
    item.actionType,
    item.payloadJson,
    item.state,
    item.attemptCount,
    item.nextRetryAt,
    item.lastError,
    item.createdAt,
    item.updatedAt,
  ];
}

export function mapDatabaseRowToConflict(row: any): Conflict {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    serverPayloadJson: String(row.server_payload_json),
    localPayloadJson: String(row.local_payload_json),
    resolution: row.resolution,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  };
}

export function mapConflictToDatabaseParameters(conflict: Conflict): unknown[] {
  return [
    conflict.id,
    conflict.taskId,
    conflict.serverPayloadJson,
    conflict.localPayloadJson,
    conflict.resolution,
    conflict.createdAt,
    conflict.resolvedAt,
  ];
}
