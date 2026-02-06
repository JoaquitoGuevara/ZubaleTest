import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TaskRecord} from '../../domain/taskModels';
import {
  getSyncStatusBadgeBackgroundColor,
  getSyncStatusBadgeTextColor,
  getTaskBusinessStatusLabel,
  getTaskSyncStatusLabel,
} from '../../shared/taskPresentation';
import {formatTimestampForHumans} from '../../shared/timeHelpers';

interface TaskRowProps {
  taskRecord: TaskRecord;
  hasPendingConflict: boolean;
  onSelectTask: (taskId: string) => void;
}

function TaskRowComponent({
  taskRecord,
  hasPendingConflict,
  onSelectTask,
}: TaskRowProps): React.JSX.Element {
  const syncStatusLabel = getTaskSyncStatusLabel(taskRecord.syncStatus);
  const syncBadgeBackground = getSyncStatusBadgeBackgroundColor(taskRecord.syncStatus);
  const syncBadgeText = getSyncStatusBadgeTextColor(taskRecord.syncStatus);

  return (
    <Pressable style={styles.card} onPress={() => onSelectTask(taskRecord.id)}>
      <View style={styles.headerRow}>
        <Text style={styles.taskTitle}>{taskRecord.title}</Text>
        <View style={[styles.syncBadge, {backgroundColor: syncBadgeBackground}]}>
          <Text style={[styles.syncBadgeText, {color: syncBadgeText}]}>{syncStatusLabel}</Text>
        </View>
      </View>

      <Text style={styles.secondaryText}>{taskRecord.location.address}</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Price: ${taskRecord.price.toFixed(2)}</Text>
        <Text style={styles.infoText}>Status: {getTaskBusinessStatusLabel(taskRecord.businessStatus)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Updated: {formatTimestampForHumans(taskRecord.updatedAt)}</Text>
        {hasPendingConflict ? <Text style={styles.conflictText}>Conflict pending</Text> : null}
      </View>
    </Pressable>
  );
}

export const TaskRow = React.memo(TaskRowComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#DDE3EA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  taskTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  syncBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  conflictText: {
    color: '#8B1A1A',
    fontSize: 12,
    fontWeight: '700',
  },
});
