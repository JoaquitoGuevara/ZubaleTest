export type TaskStatus = 'available' | 'in_progress' | 'done' | 'cancelled';

export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'error' | 'conflict';

export interface Task {
  id: string;
  title: string;
  price: number;
  businessStatus: TaskStatus;
  syncStatus: SyncStatus;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  imageUri: string | null;
  expiresAt: string;
  notes: string;
  serverVersion: number;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export type QueueState = 'queued' | 'processing' | 'failed';

export interface QueueItem {
  id: string;
  taskId: string;
  actionType: 'UPSERT_TASK';
  payloadJson: string;
  state: QueueState;
  attemptCount: number;
  nextRetryAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conflict {
  id: string;
  taskId: string;
  serverPayloadJson: string;
  localPayloadJson: string;
  resolution: 'pending' | 'accept_server' | 'retry_local';
  createdAt: string;
  resolvedAt: string | null;
}

export interface TaskPatch {
  businessStatus?: TaskStatus;
  notes?: string;
  imageUri?: string | null;
}

export interface Snapshot {
  tasks: Task[];
  queueItems: QueueItem[];
  conflicts: Conflict[];
}
