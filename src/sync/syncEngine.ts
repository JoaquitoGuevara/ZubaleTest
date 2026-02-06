import {Task} from '../domain/taskModels';
import {
  markQueueItemAsProcessing,
  markQueueItemForRetry,
  markTaskAsSyncError,
  markTaskAsSynced,
  markTaskAsSyncing,
  readQueueItemsReadyForProcessing,
  removeQueueItem,
  saveConflictForTask,
} from '../infrastructure/database/taskRepository';
import {upsertTaskOnFakeServer} from '../infrastructure/fakeServer/fakeServerGateway';
import {nowIso} from '../shared/timeHelpers';

let running = false;

interface SyncInput {
  online: boolean;
  ignoreRetryWindow?: boolean;
}

function parseTask(json: string): Task | null {
  try {
    return JSON.parse(json) as Task;
  } catch {
    return null;
  }
}

export async function syncQueue(input: SyncInput): Promise<void> {
  if (running || !input.online) {
    return;
  }

  running = true;

  try {
    const items = await readQueueItemsReadyForProcessing(
      nowIso(),
      Boolean(input.ignoreRetryWindow),
    );

    for (const item of items) {
      await markQueueItemAsProcessing(item.id);
      await markTaskAsSyncing(item.taskId);

      const task = parseTask(item.payloadJson);

      if (!task) {
        await markQueueItemForRetry(item.id, item.attemptCount + 1, 'Invalid queue payload');
        await markTaskAsSyncError(item.taskId);
        continue;
      }

      const result = await upsertTaskOnFakeServer(task, input.online);

      if (result.resultType === 'success') {
        await markTaskAsSynced(
          item.taskId,
          result.serverTask.serverVersion,
          result.serverTask.lastSyncedAt ?? nowIso(),
        );
        await removeQueueItem(item.id);
        continue;
      }

      if (result.resultType === 'conflict') {
        await saveConflictForTask(item.taskId, result.serverTask, item.payloadJson);
        await removeQueueItem(item.id);
        continue;
      }

      await markQueueItemForRetry(item.id, item.attemptCount + 1, result.reason);
      await markTaskAsSyncError(item.taskId);
      break;
    }
  } finally {
    running = false;
  }
}
