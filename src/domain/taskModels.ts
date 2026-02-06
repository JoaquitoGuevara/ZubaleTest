export type TaskBusinessStatus = 'available' | 'in_progress' | 'done' | 'cancelled';

export type TaskSyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'error' | 'conflict';

export type TaskFilterOption =
  | 'all'
  | 'pending_sync'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'conflict';

export interface TaskLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  price: number;
  businessStatus: TaskBusinessStatus;
  syncStatus: TaskSyncStatus;
  location: TaskLocation;
  imageUri: string | null;
  expiresAt: string;
  notes: string;
  serverVersion: number;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export type QueueActionType = 'UPSERT_TASK';

export type QueueState = 'queued' | 'processing' | 'failed';

export interface SyncQueueRecord {
  id: string;
  taskId: string;
  actionType: QueueActionType;
  payloadJson: string;
  state: QueueState;
  attemptCount: number;
  nextRetryAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConflictResolution = 'pending' | 'accept_server' | 'retry_local';

export interface ConflictRecord {
  id: string;
  taskId: string;
  serverPayloadJson: string;
  localPayloadJson: string;
  resolution: ConflictResolution;
  createdAt: string;
  resolvedAt: string | null;
}

export interface LocalTaskUpdateInput {
  businessStatus?: TaskBusinessStatus;
  notes?: string;
  imageUri?: string | null;
}

export interface LocalDatabaseSnapshot {
  tasks: TaskRecord[];
  queueItems: SyncQueueRecord[];
  conflicts: ConflictRecord[];
}

export interface SyncCycleReport {
  reason: string;
  queuedItemsChecked: number;
  syncedItemsCount: number;
  conflictItemsCount: number;
  failedItemsCount: number;
  skippedBecauseOffline: boolean;
  skippedBecauseSyncAlreadyRunning: boolean;
}
