export function nowIso(): string {
  return new Date().toISOString();
}

export function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return 'Not available';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d} ${h}:${min}`;
}

export function retryDelaySeconds(attempts: number): number {
  return Math.min(180, Math.pow(2, Math.max(0, attempts)) * 3);
}
