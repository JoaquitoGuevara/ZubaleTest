export function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

export function addSecondsToIsoTimestamp(isoTimestamp: string, secondsToAdd: number): string {
  const baseDate = new Date(isoTimestamp);
  const resultingDate = new Date(baseDate.getTime() + secondsToAdd * 1000);
  return resultingDate.toISOString();
}

export function isIsoTimestampReached(isoTimestamp: string): boolean {
  const now = Date.now();
  const target = new Date(isoTimestamp).getTime();
  return now >= target;
}

export function formatTimestampForHumans(isoTimestamp: string | null): string {
  if (!isoTimestamp) {
    return 'Not available';
  }

  const dateObject = new Date(isoTimestamp);

  if (Number.isNaN(dateObject.getTime())) {
    return 'Invalid date';
  }

  const year = dateObject.getFullYear();
  const month = String(dateObject.getMonth() + 1).padStart(2, '0');
  const day = String(dateObject.getDate()).padStart(2, '0');
  const hours = String(dateObject.getHours()).padStart(2, '0');
  const minutes = String(dateObject.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function calculateRetryDelayInSeconds(attemptCount: number): number {
  const exponentialDelay = Math.pow(2, Math.max(0, attemptCount)) * 3;
  return Math.min(180, exponentialDelay);
}
