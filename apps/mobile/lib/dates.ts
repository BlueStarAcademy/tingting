const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(parseDateKey(value)) === value;
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** 9월 20일 (토) */
export function formatDateKey(key: string, withYear = false): string {
  const date = parseDateKey(key);
  const base = `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
  return withYear ? `${date.getFullYear()}년 ${base}` : base;
}

export function formatDateRange(start?: string, end?: string): string | null {
  if (!start) return null;
  if (!end || end === start) return formatDateKey(start);
  return `${formatDateKey(start)} ~ ${formatDateKey(end)}`;
}

/** D-3 / D-DAY / D+2 */
export function dDayLabel(key: string): string {
  const diff = Math.round((parseDateKey(key).getTime() - parseDateKey(todayKey()).getTime()) / 86_400_000);
  if (diff === 0) return 'D-DAY';
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function monthLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export { WEEKDAYS };
