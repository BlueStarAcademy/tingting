import type { GroupSchedule } from '@tingting/shared';

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Days until target (positive = future, 0 = today, negative = past) */
export function daysUntil(dateKey: string, from = new Date()): number {
  const target = startOfDay(parseDateKey(dateKey));
  const today = startOfDay(from);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDday(days: number): string {
  if (days === 0) return 'D-Day';
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

export function findNearestUpcomingSchedule(schedules: GroupSchedule[]): GroupSchedule | null {
  const todayKey = toDateKey(new Date());
  const upcoming = schedules
    .filter((s) => s.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return upcoming[0] ?? null;
}

export function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export function dateKeyFromParts(year: number, month: number, day: number): string {
  return toDateKey(new Date(year, month, day));
}
