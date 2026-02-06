import {LocalTaskUpdateInput, SyncCycleReport} from '../domain/taskModels';
import {
  acceptServerConflictResolution,
  initializeLocalDatabase,
  readLocalDatabaseSnapshot,
  retryLocalConflictResolution,
  saveTaskUpdateAndQueueSync,
} from '../infrastructure/database/taskRepository';
import {
  clearForceConflictForNextSyncRequestFlag,
  setFakeServerAvailability,
  setForceConflictForNextSyncRequest as setFakeServerConflictForNextRequest,
} from '../infrastructure/fakeServer/fakeServerGateway';
import {runTaskSyncCycle} from '../sync/syncEngine';
import {
  replaceLocalDatabaseSnapshot,
  setErrorMessage,
  setForceConflictForNextSyncRequest,
  setInitializationCompleted,
  setLastSyncSummary,
  setLoading,
  setSyncInProgress,
} from './taskBoardSlice';
import {AppThunk, RootState} from './store';

function createSyncSummaryText(syncCycleReport: SyncCycleReport): string {
  if (syncCycleReport.skippedBecauseSyncAlreadyRunning) {
    return `Sync skipped: another cycle is already running (${syncCycleReport.reason}).`;
  }

  if (syncCycleReport.skippedBecauseOffline) {
    return `Sync skipped: device is offline (${syncCycleReport.reason}).`;
  }

  return `Sync ${syncCycleReport.reason}: checked ${syncCycleReport.queuedItemsChecked}, synced ${syncCycleReport.syncedItemsCount}, conflicts ${syncCycleReport.conflictItemsCount}, failed ${syncCycleReport.failedItemsCount}.`;
}

export const refreshLocalSnapshot = (): AppThunk<Promise<void>> => {
  return async dispatch => {
    const localDatabaseSnapshot = await readLocalDatabaseSnapshot();
    dispatch(replaceLocalDatabaseSnapshot(localDatabaseSnapshot));
  };
};

export const initializeApplication = (): AppThunk<Promise<void>> => {
  return async dispatch => {
    dispatch(setLoading(true));
    dispatch(setErrorMessage(null));

    try {
      await initializeLocalDatabase();
      await dispatch(refreshLocalSnapshot());
      dispatch(setInitializationCompleted(true));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      dispatch(setErrorMessage(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const saveTaskChangesAndQueueSync = (
  taskId: string,
  localTaskUpdateInput: LocalTaskUpdateInput,
): AppThunk<Promise<void>> => {
  return async dispatch => {
    dispatch(setErrorMessage(null));

    try {
      await saveTaskUpdateAndQueueSync(taskId, localTaskUpdateInput);
      await dispatch(refreshLocalSnapshot());
      await dispatch(runSyncNow('local-task-update'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown save error';
      dispatch(setErrorMessage(errorMessage));
    }
  };
};

function applyFakeServerFlagsFromCurrentState(rootState: RootState): void {
  setFakeServerAvailability(rootState.taskBoard.fakeServerAvailable);

  if (rootState.taskBoard.forceConflictForNextSyncRequest) {
    setFakeServerConflictForNextRequest(true);
  }
}

interface RunSyncNowOptions {
  ignoreRetryWindow?: boolean;
}

export const runSyncNow = (
  reason: string,
  options: RunSyncNowOptions = {},
): AppThunk<Promise<void>> => {
  return async (dispatch, getState) => {
    if (getState().taskBoard.syncInProgress) {
      return;
    }

    dispatch(setSyncInProgress(true));
    dispatch(setErrorMessage(null));

    try {
      const stateBeforeSync = getState();
      applyFakeServerFlagsFromCurrentState(stateBeforeSync);

      const syncCycleReport = await runTaskSyncCycle({
        reason,
        deviceIsOnline: stateBeforeSync.taskBoard.networkConnected,
        ignoreRetryWindow: Boolean(options.ignoreRetryWindow),
      });

      if (stateBeforeSync.taskBoard.forceConflictForNextSyncRequest) {
        clearForceConflictForNextSyncRequestFlag();
        dispatch(setForceConflictForNextSyncRequest(false));
      }

      await dispatch(refreshLocalSnapshot());
      dispatch(setLastSyncSummary(createSyncSummaryText(syncCycleReport)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      dispatch(setErrorMessage(errorMessage));
    } finally {
      dispatch(setSyncInProgress(false));
    }
  };
};

export const resolveConflictByAcceptingServer = (
  taskId: string,
): AppThunk<Promise<void>> => {
  return async dispatch => {
    dispatch(setErrorMessage(null));

    try {
      await acceptServerConflictResolution(taskId);
      await dispatch(refreshLocalSnapshot());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown conflict resolution error';
      dispatch(setErrorMessage(errorMessage));
    }
  };
};

export const resolveConflictByRetryingLocal = (
  taskId: string,
): AppThunk<Promise<void>> => {
  return async dispatch => {
    dispatch(setErrorMessage(null));

    try {
      await retryLocalConflictResolution(taskId);
      await dispatch(refreshLocalSnapshot());
      await dispatch(runSyncNow('retry-local-conflict'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown conflict retry error';
      dispatch(setErrorMessage(errorMessage));
    }
  };
};
