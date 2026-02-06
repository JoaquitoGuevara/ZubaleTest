import {makeId} from '../src/shared/idHelpers';
import {
  retryDelaySeconds,
  formatDateTime,
} from '../src/shared/timeHelpers';
import {
  taskStatusLabel,
  syncStatusLabel,
} from '../src/shared/taskPresentation';

test('retry delay increases and caps', () => {
  expect(retryDelaySeconds(0)).toBe(3);
  expect(retryDelaySeconds(1)).toBe(6);
  expect(retryDelaySeconds(2)).toBe(12);
  expect(retryDelaySeconds(20)).toBe(180);
});

test('labels are human readable', () => {
  expect(taskStatusLabel('in_progress')).toBe('In Progress');
  expect(syncStatusLabel('pending_sync')).toBe('Pending Sync');
});

test('identifier helper returns unique values', () => {
  const firstIdentifier = makeId('task');
  const secondIdentifier = makeId('task');

  expect(firstIdentifier).not.toBe(secondIdentifier);
  expect(firstIdentifier.startsWith('task_')).toBe(true);
  expect(secondIdentifier.startsWith('task_')).toBe(true);
});

test('timestamp formatter returns a readable string', () => {
  const formattedTimestamp = formatDateTime('2026-02-06T12:30:00.000Z');

  expect(formattedTimestamp).toMatch(/2026-02-06 \d{2}:\d{2}/);
});
