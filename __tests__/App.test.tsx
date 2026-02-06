import {createUniqueIdentifier} from '../src/shared/idHelpers';
import {
  calculateRetryDelayInSeconds,
  formatTimestampForHumans,
} from '../src/shared/timeHelpers';
import {
  getFilterLabel,
  getTaskBusinessStatusLabel,
  getTaskSyncStatusLabel,
} from '../src/shared/taskPresentation';

test('retry delay increases and caps', () => {
  expect(calculateRetryDelayInSeconds(0)).toBe(3);
  expect(calculateRetryDelayInSeconds(1)).toBe(6);
  expect(calculateRetryDelayInSeconds(2)).toBe(12);
  expect(calculateRetryDelayInSeconds(20)).toBe(180);
});

test('labels are human readable', () => {
  expect(getTaskBusinessStatusLabel('in_progress')).toBe('In Progress');
  expect(getTaskSyncStatusLabel('pending_sync')).toBe('Pending Sync');
  expect(getFilterLabel('conflict')).toBe('Conflicts');
});

test('identifier helper returns unique values', () => {
  const firstIdentifier = createUniqueIdentifier('task');
  const secondIdentifier = createUniqueIdentifier('task');

  expect(firstIdentifier).not.toBe(secondIdentifier);
  expect(firstIdentifier.startsWith('task_')).toBe(true);
  expect(secondIdentifier.startsWith('task_')).toBe(true);
});

test('timestamp formatter returns a readable string', () => {
  const formattedTimestamp = formatTimestampForHumans('2026-02-06T12:30:00.000Z');

  expect(formattedTimestamp).toMatch(/2026-02-06 \d{2}:\d{2}/);
});
