import NetInfo from '@react-native-community/netinfo';
import React, {useEffect, useMemo, useRef} from 'react';
import {BackHandler, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {DebugPanel} from '../features/debug/DebugPanel';
import {TaskDetailsScreen} from '../features/taskDetails/TaskDetailsScreen';
import {TaskListScreen} from '../features/taskList/TaskListScreen';
import {registerBackgroundSync, unregisterBackgroundSync} from '../sync/backgroundSync';
import {useAppDispatch, useAppSelector} from '../state/hooks';
import {
  initializeApplication,
  resolveConflictByAcceptingServer,
  resolveConflictByRetryingLocal,
  runSyncNow,
  saveTaskChangesAndQueueSync,
} from '../state/taskBoardThunks';
import {
  setFakeServerAvailable,
  setForceConflictForNextSyncRequest,
  setNetworkConnected,
  setSelectedTaskId,
} from '../state/taskBoardSlice';
import {
  selectBoard,
  selectConflictCount,
  selectConflicts,
  selectQueueCount,
  selectSelectedTask,
  selectTasks,
} from '../state/taskBoardSelectors';

export function AppRoot(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const board = useAppSelector(selectBoard);
  const tasks = useAppSelector(selectTasks);
  const conflicts = useAppSelector(selectConflicts);
  const selectedTask = useAppSelector(selectSelectedTask);
  const queueCount = useAppSelector(selectQueueCount);
  const conflictCount = useAppSelector(selectConflictCount);

  const lastOnline = useRef<boolean | null>(null);
  const lastServerOn = useRef<boolean | null>(null);

  useEffect(() => {
    dispatch(initializeApplication());
  }, [dispatch]);

  useEffect(() => {
    if (board.initializationCompleted) {
      dispatch(runSyncNow());
    }
  }, [dispatch, board.initializationCompleted]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasOnline = lastOnline.current;
      lastOnline.current = online;

      dispatch(setNetworkConnected(online));

      if (wasOnline === false && online) {
        dispatch(runSyncNow({ignoreRetryWindow: true}));
      }
    });

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    const wasServerOn = lastServerOn.current;
    lastServerOn.current = board.fakeServerAvailable;

    if (
      wasServerOn === false &&
      board.fakeServerAvailable &&
      board.networkConnected &&
      queueCount > 0
    ) {
      dispatch(runSyncNow({ignoreRetryWindow: true}));
    }
  }, [dispatch, board.fakeServerAvailable, board.networkConnected, queueCount]);

  useEffect(() => {
    registerBackgroundSync(async () => {
      await dispatch(runSyncNow());
    }).catch(() => undefined);

    return () => {
      unregisterBackgroundSync().catch(() => undefined);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dispatch(setSelectedTaskId(null));
      return true;
    });

    return () => sub.remove();
  }, [dispatch, selectedTask]);

  const conflictTaskIds = useMemo(
    () => new Set(conflicts.map(conflict => conflict.taskId)),
    [conflicts],
  );

  if (board.loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing offline task workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />

      {selectedTask ? (
        <TaskDetailsScreen
          task={selectedTask}
          hasConflict={conflictTaskIds.has(selectedTask.id)}
          onBack={() => dispatch(setSelectedTaskId(null))}
          onSave={async (taskId, patch) => {
            await dispatch(saveTaskChangesAndQueueSync(taskId, patch));
          }}
          onAcceptConflict={async taskId => {
            await dispatch(resolveConflictByAcceptingServer(taskId));
          }}
          onRetryConflict={async taskId => {
            await dispatch(resolveConflictByRetryingLocal(taskId));
          }}
        />
      ) : (
        <TaskListScreen tasks={tasks} onSelectTask={id => dispatch(setSelectedTaskId(id))} />
      )}

      <DebugPanel
        networkConnected={board.networkConnected}
        fakeServerAvailable={board.fakeServerAvailable}
        forceConflictForNextSyncRequest={board.forceConflictForNextSyncRequest}
        queueLength={queueCount}
        conflictLength={conflictCount}
        onToggleFakeServerAvailability={value => dispatch(setFakeServerAvailable(value))}
        onToggleForceConflictForNextSync={value =>
          dispatch(setForceConflictForNextSyncRequest(value))
        }
        onRunSyncNow={() => dispatch(runSyncNow())}
      />

      {board.errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{board.errorMessage}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FDECEC',
    borderTopWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: '#9B1C1C',
    fontSize: 12,
    fontWeight: '700',
  },
});
