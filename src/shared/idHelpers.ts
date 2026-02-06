let incrementalCounter = 0;

export function createUniqueIdentifier(prefix: string): string {
  incrementalCounter += 1;

  const currentTimePart = Date.now().toString(36);
  const counterPart = incrementalCounter.toString(36).padStart(4, '0');
  const randomPart = Math.floor(Math.random() * 1_000_000_000)
    .toString(36)
    .padStart(6, '0');

  return `${prefix}_${currentTimePart}_${counterPart}_${randomPart}`;
}
