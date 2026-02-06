import {PayloadAction, createSlice} from '@reduxjs/toolkit';
import {Snapshot} from '../domain/taskModels';

export interface BoardState {
  data: Snapshot;
  selectedTaskId: string | null;
  networkConnected: boolean;
  fakeServerAvailable: boolean;
  forceConflictForNextSyncRequest: boolean;
  initializationCompleted: boolean;
  loading: boolean;
  syncInProgress: boolean;
  errorMessage: string | null;
}

const initialState: BoardState = {
  data: {
    tasks: [],
    queueItems: [],
    conflicts: [],
  },
  selectedTaskId: null,
  networkConnected: true,
  fakeServerAvailable: true,
  forceConflictForNextSyncRequest: false,
  initializationCompleted: false,
  loading: false,
  syncInProgress: false,
  errorMessage: null,
};

function hasSelectedTask(id: string | null, data: Snapshot): boolean {
  if (!id) {
    return false;
  }

  return data.tasks.some(task => task.id === id);
}

const slice = createSlice({
  name: 'taskBoard',
  initialState,
  reducers: {
    setData(state, action: PayloadAction<Snapshot>) {
      state.data = action.payload;

      if (!hasSelectedTask(state.selectedTaskId, action.payload)) {
        state.selectedTaskId = null;
      }
    },
    setSelectedTaskId(state, action: PayloadAction<string | null>) {
      state.selectedTaskId = action.payload;
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
    setErrorMessage(state, action: PayloadAction<string | null>) {
      state.errorMessage = action.payload;
    },
  },
});

export const {
  setData,
  setSelectedTaskId,
  setNetworkConnected,
  setFakeServerAvailable,
  setForceConflictForNextSyncRequest,
  setInitializationCompleted,
  setLoading,
  setSyncInProgress,
  setErrorMessage,
} = slice.actions;

export const taskBoardReducer = slice.reducer;
