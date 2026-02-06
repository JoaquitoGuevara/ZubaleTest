import {
  TaskBusinessStatus,
  TaskFilterOption,
  TaskSyncStatus,
} from '../domain/taskModels';

export function getTaskBusinessStatusLabel(status: TaskBusinessStatus): string {
  if (status === 'available') {
    return 'Available';
  }
  if (status === 'in_progress') {
    return 'In Progress';
  }
  if (status === 'done') {
    return 'Done';
  }
  return 'Cancelled';
}

export function getTaskSyncStatusLabel(status: TaskSyncStatus): string {
  if (status === 'pending_sync') {
    return 'Pending Sync';
  }
  if (status === 'syncing') {
    return 'Syncing';
  }
  if (status === 'synced') {
    return 'Synced';
  }
  if (status === 'error') {
    return 'Sync Error';
  }
  return 'Conflict';
}

export function getFilterLabel(filter: TaskFilterOption): string {
  if (filter === 'all') {
    return 'All';
  }
  if (filter === 'pending_sync') {
    return 'Pending';
  }
  if (filter === 'syncing') {
    return 'Syncing';
  }
  if (filter === 'synced') {
    return 'Synced';
  }
  if (filter === 'error') {
    return 'Errors';
  }
  return 'Conflicts';
}

export function getSyncStatusBadgeBackgroundColor(status: TaskSyncStatus): string {
  if (status === 'pending_sync') {
    return '#FFF4E5';
  }
  if (status === 'syncing') {
    return '#E8F0FE';
  }
  if (status === 'synced') {
    return '#E6F4EA';
  }
  if (status === 'error') {
    return '#FCE8E6';
  }
  return '#FEE8FF';
}

export function getSyncStatusBadgeTextColor(status: TaskSyncStatus): string {
  if (status === 'pending_sync') {
    return '#8A5000';
  }
  if (status === 'syncing') {
    return '#174EA6';
  }
  if (status === 'synced') {
    return '#0D652D';
  }
  if (status === 'error') {
    return '#A50E0E';
  }
  return '#7B1FA2';
}
