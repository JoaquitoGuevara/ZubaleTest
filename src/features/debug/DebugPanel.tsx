import React, {useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';

interface DebugPanelProps {
  networkConnected: boolean;
  fakeServerAvailable: boolean;
  forceConflictForNextSyncRequest: boolean;
  queueLength: number;
  conflictLength: number;
  onToggleFakeServerAvailability: (value: boolean) => void;
  onToggleForceConflictForNextSync: (value: boolean) => void;
  onRunSyncNow: () => void;
}

export function DebugPanel({
  networkConnected,
  fakeServerAvailable,
  forceConflictForNextSyncRequest,
  queueLength,
  conflictLength,
  onToggleFakeServerAvailability,
  onToggleForceConflictForNextSync,
  onRunSyncNow,
}: DebugPanelProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        style={({pressed}) => [
          styles.headerButton,
          pressed ? styles.pressedBlackBackground : null,
        ]}
        onPress={() => setIsExpanded(previous => !previous)}>
        <Text style={styles.headerLabel}>Debug Panel</Text>
        <Text style={styles.headerActionLabel}>{isExpanded ? 'Hide' : 'Show'}</Text>
      </Pressable>

      {isExpanded ? (
        <View style={styles.contentContainer}>
          <Text style={styles.metricText}>Device network: {networkConnected ? 'Online' : 'Offline'}</Text>
          <Text style={styles.metricText}>Queued items: {queueLength}</Text>
          <Text style={styles.metricText}>Pending conflicts: {conflictLength}</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Fake server available</Text>
            <Switch
              value={fakeServerAvailable}
              onValueChange={onToggleFakeServerAvailability}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Force conflict on next sync</Text>
            <Switch
              value={forceConflictForNextSyncRequest}
              onValueChange={onToggleForceConflictForNextSync}
            />
          </View>

          <Pressable
            style={({pressed}) => [
              styles.syncNowButton,
              pressed ? styles.pressedBlackBackground : null,
            ]}
            onPress={onRunSyncNow}>
            <Text style={styles.syncNowButtonLabel}>Run sync now</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderColor: '#CBD5E1',
  },
  headerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  headerActionLabel: {
    color: '#155EEF',
    fontSize: 12,
    fontWeight: '700',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  metricText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  syncNowButton: {
    backgroundColor: '#155EEF',
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncNowButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pressedBlackBackground: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
});
