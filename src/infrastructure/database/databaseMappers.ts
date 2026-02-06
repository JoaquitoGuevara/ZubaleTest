import {
  ConflictRecord,
  SyncQueueRecord,
  TaskRecord,
} from '../../domain/taskModels';

export function mapDatabaseRowToTaskRecord(databaseRow: any): TaskRecord {
  return {
    id: String(databaseRow.id),
    title: String(databaseRow.title),
    price: Number(databaseRow.price),
    businessStatus: databaseRow.business_status,
    syncStatus: databaseRow.sync_status,
    location: {
      latitude: Number(databaseRow.location_lat),
      longitude: Number(databaseRow.location_lng),
      address: String(databaseRow.location_address),
    },
    imageUri: databaseRow.image_uri ?? null,
    expiresAt: String(databaseRow.expires_at),
    notes: databaseRow.notes ? String(databaseRow.notes) : '',
    serverVersion: Number(databaseRow.server_version ?? 0),
    updatedAt: String(databaseRow.updated_at),
    lastSyncedAt: databaseRow.last_synced_at ? String(databaseRow.last_synced_at) : null,
  };
}

export function mapTaskRecordToDatabaseParameters(taskRecord: TaskRecord): unknown[] {
  return [
    taskRecord.id,
    taskRecord.title,
    taskRecord.price,
    taskRecord.businessStatus,
    taskRecord.syncStatus,
    taskRecord.location.latitude,
    taskRecord.location.longitude,
    taskRecord.location.address,
    taskRecord.imageUri,
    taskRecord.expiresAt,
    taskRecord.notes,
    taskRecord.serverVersion,
    taskRecord.updatedAt,
    taskRecord.lastSyncedAt,
  ];
}

export function mapDatabaseRowToSyncQueueRecord(databaseRow: any): SyncQueueRecord {
  return {
    id: String(databaseRow.id),
    taskId: String(databaseRow.task_id),
    actionType: databaseRow.action_type,
    payloadJson: String(databaseRow.payload_json),
    state: databaseRow.state,
    attemptCount: Number(databaseRow.attempt_count),
    nextRetryAt: String(databaseRow.next_retry_at),
    lastError: databaseRow.last_error ? String(databaseRow.last_error) : null,
    createdAt: String(databaseRow.created_at),
    updatedAt: String(databaseRow.updated_at),
  };
}

export function mapSyncQueueRecordToDatabaseParameters(syncQueueRecord: SyncQueueRecord): unknown[] {
  return [
    syncQueueRecord.id,
    syncQueueRecord.taskId,
    syncQueueRecord.actionType,
    syncQueueRecord.payloadJson,
    syncQueueRecord.state,
    syncQueueRecord.attemptCount,
    syncQueueRecord.nextRetryAt,
    syncQueueRecord.lastError,
    syncQueueRecord.createdAt,
    syncQueueRecord.updatedAt,
  ];
}

export function mapDatabaseRowToConflictRecord(databaseRow: any): ConflictRecord {
  return {
    id: String(databaseRow.id),
    taskId: String(databaseRow.task_id),
    serverPayloadJson: String(databaseRow.server_payload_json),
    localPayloadJson: String(databaseRow.local_payload_json),
    resolution: databaseRow.resolution,
    createdAt: String(databaseRow.created_at),
    resolvedAt: databaseRow.resolved_at ? String(databaseRow.resolved_at) : null,
  };
}

export function mapConflictRecordToDatabaseParameters(conflictRecord: ConflictRecord): unknown[] {
  return [
    conflictRecord.id,
    conflictRecord.taskId,
    conflictRecord.serverPayloadJson,
    conflictRecord.localPayloadJson,
    conflictRecord.resolution,
    conflictRecord.createdAt,
    conflictRecord.resolvedAt,
  ];
}
