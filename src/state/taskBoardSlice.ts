import {PayloadAction, createSlice} from '@reduxjs/toolkit';
import {LocalDatabaseSnapshot, TaskFilterOption} from '../domain/taskModels';

export interface TaskBoardState {
  snapshot: LocalDatabaseSnapshot;
  selectedTaskId: string | null;
  activeFilter: TaskFilterOption;
  networkConnected: boolean;
  fakeServerAvailable: boolean;
  forceConflictForNextSyncRequest: boolean;
  initializationCompleted: boolean;
  loading: boolean;
  syncInProgress: boolean;
  lastSyncSummary: string;
  errorMessage: string | null;
}

const initialTaskBoardState: TaskBoardState = {
  snapshot: {
    tasks: [],
    queueItems: [],
    conflicts: [],
  },
  selectedTaskId: null,
  activeFilter: 'all',
  networkConnected: true,
  fakeServerAvailable: true,
  forceConflictForNextSyncRequest: false,
  initializationCompleted: false,
  loading: false,
  syncInProgress: false,
  lastSyncSummary: 'No sync has run yet.',
  errorMessage: null,
};

function selectedTaskStillExists(
  selectedTaskId: string | null,
  localDatabaseSnapshot: LocalDatabaseSnapshot,
): boolean {
  if (!selectedTaskId) {
    return false;
  }

  return localDatabaseSnapshot.tasks.some(taskRecord => taskRecord.id === selectedTaskId);
}

const taskBoardSlice = createSlice({
  name: 'taskBoard',
  initialState: initialTaskBoardState,
  reducers: {
    replaceLocalDatabaseSnapshot(
      state,
      action: PayloadAction<LocalDatabaseSnapshot>,
    ) {
      state.snapshot = action.payload;

      if (!selectedTaskStillExists(state.selectedTaskId, action.payload)) {
        state.selectedTaskId = null;
      }
    },
    setSelectedTaskId(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
    },
    setActiveFilter(state, action: PayloadAction<TaskFilterOption>) {
      state.activeFilter = action.payload;
    },
    setNetworkConnected(state, action: PayloadAction<boolean>) {
      state.networkConnected = action.payload;
    },
    setFakeServerAvailable(state, action: PayloadAction<boolean>) {
      state.fakeServerAvailable = action.payload;
    },
    setForceConflictForNextSyncRequest(state, action: PayloadAction<boolean>) {
      state.forceConflictForNextSyncRequest = action.payload;
    },
    setInitializationCompleted(state, action: PayloadAction<boolean>) {
      state.initializationCompleted = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSyncInProgress(state, action: PayloadAction<boolean>) {
      state.syncInProgress = action.payload;
    },
    setLastSyncSummary(state, action: PayloadAction<string>) {
      state.lastSyncSummary = action.payload;
    },
    setErrorMessage(state, action: PayloadAction<string | null>) {
      state.errorMessage = action.payload;
    },
  },
});

export const {
  replaceLocalDatabaseSnapshot,
  setSelectedTaskId,
  setActiveFilter,
  setNetworkConnected,
  setFakeServerAvailable,
  setForceConflictForNextSyncRequest,
  setInitializationCompleted,
  setLoading,
  setSyncInProgress,
  setLastSyncSummary,
  setErrorMessage,
} = taskBoardSlice.actions;

export const taskBoardReducer = taskBoardSlice.reducer;
