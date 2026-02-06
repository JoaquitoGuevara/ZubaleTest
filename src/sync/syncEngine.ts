import {SyncCycleReport, TaskRecord} from '../domain/taskModels';
import {applyTaskUpsertToFakeServer} from '../infrastructure/fakeServer/fakeServerGateway';
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
import {getCurrentIsoTimestamp} from '../shared/timeHelpers';

let syncCycleAlreadyRunning = false;

interface RunTaskSyncCycleInput {
  reason: string;
  deviceIsOnline: boolean;
}

function createInitialSyncCycleReport(reason: string): SyncCycleReport {
  return {
    reason,
    queuedItemsChecked: 0,
    syncedItemsCount: 0,
    conflictItemsCount: 0,
    failedItemsCount: 0,
    skippedBecauseOffline: false,
    skippedBecauseSyncAlreadyRunning: false,
  };
}

function safelyParseTaskRecord(payloadJson: string): TaskRecord | null {
  try {
    return JSON.parse(payloadJson) as TaskRecord;
  } catch {
    return null;
  }
}

export async function runTaskSyncCycle(input: RunTaskSyncCycleInput): Promise<SyncCycleReport> {
  const syncCycleReport = createInitialSyncCycleReport(input.reason);

  if (syncCycleAlreadyRunning) {
    syncCycleReport.skippedBecauseSyncAlreadyRunning = true;
    return syncCycleReport;
  }

  if (!input.deviceIsOnline) {
    syncCycleReport.skippedBecauseOffline = true;
    return syncCycleReport;
  }

  syncCycleAlreadyRunning = true;

  try {
    const readyQueueItems = await readQueueItemsReadyForProcessing(getCurrentIsoTimestamp());
    syncCycleReport.queuedItemsChecked = readyQueueItems.length;

    for (const queueItem of readyQueueItems) {
      await markQueueItemAsProcessing(queueItem.id);
      await markTaskAsSyncing(queueItem.taskId);

      const localTaskRecord = safelyParseTaskRecord(queueItem.payloadJson);

      if (!localTaskRecord) {
        await markQueueItemForRetry(
          queueItem.id,
          queueItem.attemptCount + 1,
          'Queue payload could not be parsed as task record.',
        );
        await markTaskAsSyncError(queueItem.taskId);
        syncCycleReport.failedItemsCount += 1;
        continue;
      }

      const fakeServerResult = await applyTaskUpsertToFakeServer(localTaskRecord, input.deviceIsOnline);

      if (fakeServerResult.resultType === 'success') {
        await markTaskAsSynced(
          queueItem.taskId,
          fakeServerResult.serverTaskRecord.serverVersion,
          fakeServerResult.serverTaskRecord.lastSyncedAt ?? getCurrentIsoTimestamp(),
        );
        await removeQueueItem(queueItem.id);
        syncCycleReport.syncedItemsCount += 1;
        continue;
      }

      if (fakeServerResult.resultType === 'conflict') {
        await saveConflictForTask(
          queueItem.taskId,
          fakeServerResult.serverTaskRecord,
          queueItem.payloadJson,
        );
        await removeQueueItem(queueItem.id);
        syncCycleReport.conflictItemsCount += 1;
        continue;
      }

      await markQueueItemForRetry(
        queueItem.id,
        queueItem.attemptCount + 1,
        fakeServerResult.reason,
      );
      await markTaskAsSyncError(queueItem.taskId);
      syncCycleReport.failedItemsCount += 1;
      break;
    }

    return syncCycleReport;
  } finally {
    syncCycleAlreadyRunning = false;
  }
}
