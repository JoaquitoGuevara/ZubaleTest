import {TaskPatch} from '../domain/taskModels';
import {
  acceptServerConflictResolution,
  initializeLocalDatabase,
  readSnapshot,
  retryLocalConflictResolution,
  saveTaskUpdateAndQueueSync,
} from '../infrastructure/database/taskRepository';
import {
  clearForceConflictNextSync,
  setFakeServerAvailability,
  setForceConflictNextSync,
} from '../infrastructure/fakeServer/fakeServerGateway';
import {syncQueue} from '../sync/syncEngine';
import {
  setData,
  setErrorMessage,
  setForceConflictForNextSyncRequest,
  setInitializationCompleted,
  setLoading,
  setSyncInProgress,
} from './taskBoardSlice';
import {AppThunk, RootState} from './store';

export const refreshData = (): AppThunk<Promise<void>> => {
  return async dispatch => {
    dispatch(setData(await readSnapshot()));
  };
};

export const initializeApplication = (): AppThunk<Promise<void>> => {
  return async dispatch => {
    dispatch(setLoading(true));
    dispatch(setErrorMessage(null));

    try {
      await initializeLocalDatabase();
      await dispatch(refreshData());
      dispatch(setInitializationCompleted(true));
    } catch (error) {
      dispatch(
        setErrorMessage(error instanceof Error ? error.message : 'Initialization failed'),
      );
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const saveTaskChangesAndQueueSync = (
  taskId: string,
  patch: TaskPatch,
): AppThunk<Promise<void>> => {
  return async dispatch => {
    dispatch(setErrorMessage(null));

    try {
      await saveTaskUpdateAndQueueSync(taskId, patch);
      await dispatch(refreshData());
      await dispatch(runSyncNow());
    } catch (error) {
      dispatch(setErrorMessage(error instanceof Error ? error.message : 'Save failed'));
    }
  };
};

function applyServerFlags(state: RootState): void {
  setFakeServerAvailability(state.taskBoard.fakeServerAvailable);

  if (state.taskBoard.forceConflictForNextSyncRequest) {
    setForceConflictNextSync(true);
  }
}

interface SyncOptions {
  ignoreRetryWindow?: boolean;
}

export const runSyncNow = (
  options: SyncOptions = {},
): AppThunk<Promise<void>> => {
  return async (dispatch, getState) => {
    if (getState().taskBoard.syncInProgress) {
      return;
    }

    dispatch(setSyncInProgress(true));
    dispatch(setErrorMessage(null));

    try {
      const state = getState();
      applyServerFlags(state);

      await syncQueue({
        online: state.taskBoard.networkConnected,
        ignoreRetryWindow: Boolean(options.ignoreRetryWindow),
      });

      if (state.taskBoard.forceConflictForNextSyncRequest) {
        clearForceConflictNextSync();
        dispatch(setForceConflictForNextSyncRequest(false));
      }

      await dispatch(refreshData());
    } catch (error) {
      dispatch(setErrorMessage(error instanceof Error ? error.message : 'Sync failed'));
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
      await dispatch(refreshData());
    } catch (error) {
      dispatch(
        setErrorMessage(error instanceof Error ? error.message : 'Conflict resolve failed'),
      );
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
      await dispatch(refreshData());
      await dispatch(runSyncNow());
    } catch (error) {
      dispatch(
        setErrorMessage(error instanceof Error ? error.message : 'Conflict retry failed'),
      );
    }
  };
};
