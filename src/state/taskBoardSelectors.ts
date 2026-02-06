import {RootState} from './store';

export const selectTaskBoardState = (rootState: RootState) => rootState.taskBoard;

export const selectAllTasks = (rootState: RootState) => rootState.taskBoard.snapshot.tasks;

export const selectAllQueueItems = (rootState: RootState) =>
  rootState.taskBoard.snapshot.queueItems;

export const selectAllConflicts = (rootState: RootState) =>
  rootState.taskBoard.snapshot.conflicts;

export const selectSelectedTaskId = (rootState: RootState) =>
  rootState.taskBoard.selectedTaskId;

export const selectSelectedTask = (rootState: RootState) => {
  const selectedTaskId = rootState.taskBoard.selectedTaskId;

  if (!selectedTaskId) {
    return null;
  }

  return (
    rootState.taskBoard.snapshot.tasks.find(taskRecord => taskRecord.id === selectedTaskId) ??
    null
  );
};

export const selectQueueLength = (rootState: RootState) =>
  rootState.taskBoard.snapshot.queueItems.length;

export const selectConflictLength = (rootState: RootState) =>
  rootState.taskBoard.snapshot.conflicts.length;
