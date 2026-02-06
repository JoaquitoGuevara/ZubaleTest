import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Task} from '../../domain/taskModels';
import {
  syncBadgeBg,
  syncBadgeText,
  syncStatusLabel,
  taskStatusLabel,
} from '../../shared/taskPresentation';
import {formatDateTime} from '../../shared/timeHelpers';

interface TaskRowProps {
  task: Task;
  hasConflict: boolean;
  onSelectTask: (taskId: string) => void;
}

function TaskRowComponent({
  task,
  hasConflict,
  onSelectTask,
}: TaskRowProps): React.JSX.Element {
  const badgeLabel = syncStatusLabel(task.syncStatus);
  const badgeBackground = syncBadgeBg(task.syncStatus);
  const badgeTextColor = syncBadgeText(task.syncStatus);

  return (
    <Pressable
      style={({pressed}) => [styles.card, pressed ? styles.pressedBlackBackground : null]}
      onPress={() => onSelectTask(task.id)}>
      <View style={styles.headerRow}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={[styles.syncBadge, {backgroundColor: badgeBackground}]}>
          <Text style={[styles.syncBadgeText, {color: badgeTextColor}]}>{badgeLabel}</Text>
        </View>
      </View>

      <Text style={styles.secondaryText}>{task.location.address}</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Price: ${task.price.toFixed(2)}</Text>
        <Text style={styles.infoText}>Status: {taskStatusLabel(task.businessStatus)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Expires: {formatDateTime(task.expiresAt)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Updated: {formatDateTime(task.updatedAt)}</Text>
        {hasConflict ? <Text style={styles.conflictText}>Conflict pending</Text> : null}
      </View>

      {task.imageUri ? (
        <Image source={{uri: task.imageUri}} style={styles.previewImage} />
      ) : (
        <Text style={styles.infoText}>Image: None</Text>
      )}
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
  pressedBlackBackground: {
    backgroundColor: '#000000',
    borderColor: '#000000',
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
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
});
