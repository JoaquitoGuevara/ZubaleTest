import {SyncStatus, TaskStatus} from '../domain/taskModels';

export function taskStatusLabel(status: TaskStatus): string {
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

export function syncStatusLabel(status: SyncStatus): string {
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

export function syncBadgeBg(status: SyncStatus): string {
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

export function syncBadgeText(status: SyncStatus): string {
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
