import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {TaskRecord} from '../../domain/taskModels';
import {TaskRow} from './TaskRow';

interface TaskListScreenProps {
  tasks: TaskRecord[];
  onSelectTask: (taskId: string) => void;
}

function ListSeparator(): React.JSX.Element {
  return <View style={styles.listSeparator} />;
}

export function TaskListScreen({
  tasks,
  onSelectTask,
}: TaskListScreenProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <View style={styles.singleTab}>
          <Text style={styles.singleTabLabel}>Tasks</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
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
            <Text style={styles.emptyStateText}>No tasks available.</Text>
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
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#DDE3EA',
    marginBottom: 10,
  },
  singleTab: {
    alignSelf: 'flex-start',
    borderBottomWidth: 3,
    borderBottomColor: '#155EEF',
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  singleTabLabel: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
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
