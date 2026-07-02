export function getTimezoneShortLabel(timeZone: string): string {
  const opt = TIMEZONE_OPTIONS.find((o) => o.id === timeZone);
  if (!opt) return timeZone;
  return opt.label.replace(/ \(/, '(');
}

/** 주요 타임존 목록 (IANA) */
export const TIMEZONE_OPTIONS = [
  { id: 'Asia/Seoul', label: 'KST (서울)' },
  { id: 'Asia/Tokyo', label: 'JST (도쿄)' },
  { id: 'Asia/Shanghai', label: 'CST (상하이)' },
  { id: 'Asia/Hong_Kong', label: 'HKT (홍콩)' },
  { id: 'Asia/Singapore', label: 'SGT (싱가포르)' },
  { id: 'Europe/London', label: 'GMT/BST (런던)' },
  { id: 'Europe/Paris', label: 'CET (파리)' },
  { id: 'America/New_York', label: 'EST (뉴욕)' },
  { id: 'America/Los_Angeles', label: 'PST (LA)' },
  { id: 'America/Chicago', label: 'CST (시카고)' },
  { id: 'Australia/Sydney', label: 'AEST (시드니)' },
  { id: 'Pacific/Auckland', label: 'NZST (오클랜드)' },
  { id: 'UTC', label: 'UTC' },
] as const;

export const DEFAULT_TIMEZONE = 'Asia/Seoul';
export const TIMEZONE_LOCK_DAYS = 7;

export function getDayKey(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function canChangeTimezone(lockedUntil?: string): boolean {
  if (!lockedUntil) return true;
  return Date.now() >= new Date(lockedUntil).getTime();
}

export function timezoneLockExpiry(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + TIMEZONE_LOCK_DAYS);
  return d.toISOString();
}

/** 선택한 타임존 기준 오늘 0시 (Date) */
export function getDayStartInTimezone(timeZone: string, date = new Date()): Date {
  const dayKey = getDayKey(timeZone, date);
  const [year, month, day] = dayKey.split('-').map(Number);
  let result = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  while (getDayKey(timeZone, result) !== dayKey) {
    result = new Date(result.getTime() + 3600000);
  }
  const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' });
  while (Number(hourFmt.format(result)) > 0) {
    result = new Date(result.getTime() - 3600000);
  }
  while (Number(hourFmt.format(result)) !== 0) {
    result = new Date(result.getTime() + 60000);
  }
  return result;
}
