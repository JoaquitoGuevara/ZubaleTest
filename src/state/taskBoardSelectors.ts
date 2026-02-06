import {RootState} from './store';

export const selectBoard = (state: RootState) => state.taskBoard;

export const selectTasks = (state: RootState) => state.taskBoard.data.tasks;

export const selectConflicts = (state: RootState) => state.taskBoard.data.conflicts;

export const selectSelectedTask = (state: RootState) => {
  const selectedTaskId = state.taskBoard.selectedTaskId;

  if (!selectedTaskId) {
    return null;
  }

  return state.taskBoard.data.tasks.find(task => task.id === selectedTaskId) ?? null;
};

export const selectQueueCount = (state: RootState) =>
  state.taskBoard.data.queueItems.length;

export const selectConflictCount = (state: RootState) =>
  state.taskBoard.data.conflicts.length;
