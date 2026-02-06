import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TaskFilterOption} from '../../domain/taskModels';
import {getFilterLabel} from '../../shared/taskPresentation';

interface TaskFilterBarProps {
  activeFilter: TaskFilterOption;
  onFilterChange: (nextFilter: TaskFilterOption) => void;
}

const availableFilters: TaskFilterOption[] = [
  'all',
  'pending_sync',
  'syncing',
  'synced',
  'error',
  'conflict',
];

export function TaskFilterBar({
  activeFilter,
  onFilterChange,
}: TaskFilterBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {availableFilters.map(filterOption => {
        const filterIsActive = filterOption === activeFilter;

        return (
          <Pressable
            key={filterOption}
            style={({pressed}) => [
              styles.filterButton,
              filterIsActive ? styles.activeFilterButton : styles.inactiveFilterButton,
              pressed ? styles.pressedBlackBackground : null,
            ]}
            onPress={() => onFilterChange(filterOption)}>
            <Text
              style={[
                styles.filterLabel,
                filterIsActive ? styles.activeFilterLabel : styles.inactiveFilterLabel,
              ]}>
              {getFilterLabel(filterOption)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeFilterButton: {
    backgroundColor: '#155EEF',
    borderColor: '#155EEF',
  },
  inactiveFilterButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  pressedBlackBackground: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterLabel: {
    color: '#FFFFFF',
  },
  inactiveFilterLabel: {
    color: '#334155',
  },
});
