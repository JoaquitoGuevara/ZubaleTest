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
  selectAllConflicts,
  selectAllTasks,
  selectConflictLength,
  selectQueueLength,
  selectSelectedTask,
  selectTaskBoardState,
} from '../state/taskBoardSelectors';

export function AppRoot(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const taskBoardState = useAppSelector(selectTaskBoardState);
  const allTasks = useAppSelector(selectAllTasks);
  const allConflicts = useAppSelector(selectAllConflicts);
  const selectedTask = useAppSelector(selectSelectedTask);
  const queueLength = useAppSelector(selectQueueLength);
  const conflictLength = useAppSelector(selectConflictLength);

  const previousNetworkConnectedRef = useRef<boolean | null>(null);
  const previousFakeServerAvailableRef = useRef<boolean | null>(null);

  useEffect(() => {
    dispatch(initializeApplication());
  }, [dispatch]);

  useEffect(() => {
    if (taskBoardState.initializationCompleted) {
      dispatch(runSyncNow('application-startup'));
    }
  }, [dispatch, taskBoardState.initializationCompleted]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(networkState => {
      const connected = Boolean(
        networkState.isConnected && networkState.isInternetReachable !== false,
      );

      const previousConnected = previousNetworkConnectedRef.current;
      previousNetworkConnectedRef.current = connected;

      dispatch(setNetworkConnected(connected));

      if (previousConnected === false && connected) {
        dispatch(runSyncNow('network-reconnected', {ignoreRetryWindow: true}));
      }
    });

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    const previousFakeServerAvailable = previousFakeServerAvailableRef.current;
    previousFakeServerAvailableRef.current = taskBoardState.fakeServerAvailable;

    if (
      previousFakeServerAvailable === false &&
      taskBoardState.fakeServerAvailable &&
      taskBoardState.networkConnected &&
      queueLength > 0
    ) {
      dispatch(runSyncNow('fake-server-restored', {ignoreRetryWindow: true}));
    }
  }, [
    dispatch,
    taskBoardState.fakeServerAvailable,
    taskBoardState.networkConnected,
    queueLength,
  ]);

  useEffect(() => {
    const registrationPromise = registerBackgroundSync(async () => {
      await dispatch(runSyncNow('background-fetch'));
    });

    registrationPromise.catch(() => undefined);

    return () => {
      unregisterBackgroundSync().catch(() => undefined);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const backPressSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        dispatch(setSelectedTaskId(null));
        return true;
      },
    );

    return () => {
      backPressSubscription.remove();
    };
  }, [dispatch, selectedTask]);

  const conflictTaskIdSet = useMemo(() => {
    return new Set(allConflicts.map(conflictRecord => conflictRecord.taskId));
  }, [allConflicts]);

  const loadingIndicatorVisible = taskBoardState.loading && allTasks.length === 0;

  if (loadingIndicatorVisible) {
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
          taskRecord={selectedTask}
          hasPendingConflict={conflictTaskIdSet.has(selectedTask.id)}
          onGoBack={() => dispatch(setSelectedTaskId(null))}
          onSaveTaskChanges={async (taskId, localTaskUpdateInput) => {
            await dispatch(saveTaskChangesAndQueueSync(taskId, localTaskUpdateInput));
          }}
          onAcceptServerConflict={async taskId => {
            await dispatch(resolveConflictByAcceptingServer(taskId));
          }}
          onRetryLocalConflict={async taskId => {
            await dispatch(resolveConflictByRetryingLocal(taskId));
          }}
        />
      ) : (
        <TaskListScreen
          tasks={allTasks}
          onSelectTask={taskId => dispatch(setSelectedTaskId(taskId))}
        />
      )}

      <DebugPanel
        networkConnected={taskBoardState.networkConnected}
        fakeServerAvailable={taskBoardState.fakeServerAvailable}
        forceConflictForNextSyncRequest={taskBoardState.forceConflictForNextSyncRequest}
        queueLength={queueLength}
        conflictLength={conflictLength}
        onToggleFakeServerAvailability={value => dispatch(setFakeServerAvailable(value))}
        onToggleForceConflictForNextSync={value =>
          dispatch(setForceConflictForNextSyncRequest(value))
        }
        onRunSyncNow={() => dispatch(runSyncNow('debug-panel'))}
      />

      {taskBoardState.errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{taskBoardState.errorMessage}</Text>
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
