let counter = 0;

export function makeId(prefix: string): string {
  counter += 1;
  const timestampPart = Date.now().toString(36);
  const sequencePart = counter.toString(36).padStart(4, '0');
  const randomPart = Math.floor(Math.random() * 1_000_000_000)
    .toString(36)
    .padStart(6, '0');
  return `${prefix}_${timestampPart}_${sequencePart}_${randomPart}`;
}
