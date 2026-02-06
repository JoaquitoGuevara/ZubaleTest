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
  if (status === 'synced') {
    return 'Synced';
  }
  return 'Pending Sync';
}

export function syncBadgeBg(status: SyncStatus): string {
  if (status === 'synced') {
    return '#E6F4EA';
  }
  return '#FFF4E5';
}

export function syncBadgeText(status: SyncStatus): string {
  if (status === 'synced') {
    return '#0D652D';
  }
  return '#8A5000';
}
