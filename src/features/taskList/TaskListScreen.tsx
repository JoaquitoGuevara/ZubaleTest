import React, {useMemo} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {TaskFilterOption, TaskRecord} from '../../domain/taskModels';
import {TaskFilterBar} from './TaskFilterBar';
import {TaskRow} from './TaskRow';

interface TaskListScreenProps {
  tasks: TaskRecord[];
  activeFilter: TaskFilterOption;
  queueLength: number;
  conflictLength: number;
  lastSyncSummary: string;
  syncInProgress: boolean;
  onFilterChange: (nextFilter: TaskFilterOption) => void;
  onSelectTask: (taskId: string) => void;
  onRunSyncNow: () => void;
}

function filterTasksBySyncStatus(
  tasks: TaskRecord[],
  activeFilter: TaskFilterOption,
): TaskRecord[] {
  if (activeFilter === 'all') {
    return tasks;
  }

  return tasks.filter(taskRecord => taskRecord.syncStatus === activeFilter);
}

function ListSeparator(): React.JSX.Element {
  return <View style={styles.listSeparator} />;
}

export function TaskListScreen({
  tasks,
  activeFilter,
  queueLength,
  conflictLength,
  lastSyncSummary,
  syncInProgress,
  onFilterChange,
  onSelectTask,
  onRunSyncNow,
}: TaskListScreenProps): React.JSX.Element {
  const filteredTasks = useMemo(
    () => filterTasksBySyncStatus(tasks, activeFilter),
    [tasks, activeFilter],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.screenTitle}>Offline Task Auditor</Text>
        <Text style={styles.summaryText}>{lastSyncSummary}</Text>

        <View style={styles.metricsRow}>
          <Text style={styles.metricText}>Queued: {queueLength}</Text>
          <Text style={styles.metricText}>Conflicts: {conflictLength}</Text>
        </View>

        <Pressable
          style={[styles.syncNowButton, syncInProgress ? styles.syncNowButtonDisabled : null]}
          disabled={syncInProgress}
          onPress={onRunSyncNow}>
          <Text style={styles.syncNowButtonLabel}>
            {syncInProgress ? 'Sync Running...' : 'Run Sync Now'}
          </Text>
        </Pressable>
      </View>

      <TaskFilterBar activeFilter={activeFilter} onFilterChange={onFilterChange} />

      <FlatList
        data={filteredTasks}
        keyExtractor={taskRecord => taskRecord.id}
        contentContainerStyle={styles.listContentContainer}
        ItemSeparatorComponent={ListSeparator}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        updateCellsBatchingPeriod={16}
        removeClippedSubviews
        renderItem={({item}) => (
          <TaskRow
            taskRecord={item}
            hasPendingConflict={item.syncStatus === 'conflict'}
            onSelectTask={onSelectTask}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No tasks for the selected filter.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE3EA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  screenTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
  },
  summaryText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  syncNowButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#155EEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncNowButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  syncNowButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  listSeparator: {
    height: 8,
  },
  emptyStateContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
