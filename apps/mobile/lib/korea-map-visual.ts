import type { Region, RegionVisitStat } from '@tingting/shared';
import { theme } from '@/constants/theme';

/** Upper bound (visited places + photos) of each heat level; the last level is open-ended. */
export const HEAT_STEPS = [2, 9, 29] as const;
export const HEAT_LEGEND = ['1~2', '3~9', '10~29', '30+'];

export function heatLevel(stat: RegionVisitStat | undefined): number {
  if (!stat?.visited) return 0;
  const score = stat.visitedPlaceCount + stat.photoCount;
  const idx = HEAT_STEPS.findIndex((max) => score <= max);
  return (idx === -1 ? HEAT_STEPS.length : idx) + 1;
}

export function heatColor(level: number): string {
  return level <= 0 ? theme.colors.mapUnvisited : theme.colors.mapHeat[Math.min(level, theme.colors.mapHeat.length) - 1];
}

/** Region code → fill for visited regions; unvisited regions keep the neutral map color. */
export function heatFills(stats: RegionVisitStat[]): Record<string, string> {
  const fills: Record<string, string> = {};
  for (const s of stats) {
    const level = heatLevel(s);
    if (level > 0) fills[s.regionCode] = heatColor(level);
  }
  return fills;
}

export type KoreaMapVisualVariant = 'default' | 'naver';

export function regionFill(
  code: string,
  visited: Set<string>,
  selectedCode: string | null | undefined,
  region: Region,
  variant: KoreaMapVisualVariant = 'default',
  fillByCode?: Record<string, string>,
): string {
  const isVisited = visited.has(code);
  const isSelected = selectedCode === code;
  if (fillByCode) return fillByCode[code] ?? theme.colors.mapUnvisited;
  if (variant === 'naver') {
    if (isSelected) return '#03C75A';
    if (isVisited) return '#8ED7A6';
    return '#DCEBD6';
  }
  if (isSelected) return theme.colors.mapSelected;
  if (isVisited) return region.color;
  return theme.colors.mapUnvisited;
}

export function regionStroke(
  selectedCode: string | null | undefined,
  code: string,
  variant: KoreaMapVisualVariant = 'default',
  outlineSelected = false,
): string {
  if (outlineSelected) return theme.colors.mapStroke;
  if (variant === 'naver') return selectedCode === code ? '#FFFFFF' : '#F7FFF5';
  return selectedCode === code ? theme.colors.mapSelectedStroke : theme.colors.mapStroke;
}

export function regionStrokeWidth(
  selectedCode: string | null | undefined,
  code: string,
  variant: KoreaMapVisualVariant = 'default',
  outlineSelected = false,
): number {
  if (outlineSelected) return 1.4;
  if (variant === 'naver') return selectedCode === code ? 3 : 1.2;
  return selectedCode === code ? 2.2 : 1.4;
}

export function labelFontSize(code: string, selectedCode: string | null | undefined): number {
  if (selectedCode === code) return 12;
  if (code === 'SJG' || code === 'SEO') return 9.5;
  return 11;
}

export function labelText(region: Region): string {
  return region.name.length <= 3 ? region.name : region.name.slice(0, 2);
}

/** Nudges (viewBox units) that keep pixel-sized metro labels from colliding with their neighbours. */
const READABLE_LABEL_OFFSETS: Record<string, [number, number]> = {
  ICN: [-28, 8],
  SEO: [0, -14],
  GGD: [18, 30],
  SJG: [-2, -14],
  SCB: [-30, 10],
  DJN: [8, 16],
  ULS: [14, -14],
  BUS: [-6, 14],
  GWJ: [-10, -6],
  SJB: [0, 22],
};

const METRO_LABEL_SCALE = 0.85;

/** Label position and font size (viewBox units) so the text renders at `labelPx` on screen. */
export function readableLabel(
  code: string,
  label: { cx: number; cy: number },
  mapWidth: number,
  labelPx: number,
  isMetro: boolean,
): { cx: number; cy: number; fontSize: number } {
  const [dx, dy] = READABLE_LABEL_OFFSETS[code] ?? [0, 0];
  const unitsPerPx = 1000 / mapWidth;
  return { cx: label.cx + dx, cy: label.cy + dy, fontSize: labelPx * (isMetro ? METRO_LABEL_SCALE : 1) * unitsPerPx };
}

/** Readable labels double as a visited marker, since metro shapes hide under their pills. */
export function readableLabelColors(isVisited: boolean, isSelected: boolean): { bg: string; fg: string; stroke: string } {
  if (isSelected) return { bg: theme.colors.mapSelectedOutline, fg: '#FFFFFF', stroke: 'rgba(255,255,255,0.6)' };
  if (isVisited) return { bg: theme.colors.primaryDark, fg: '#FFFFFF', stroke: 'rgba(255,255,255,0.6)' };
  return { bg: 'rgba(255,255,255,0.94)', fg: theme.colors.textMuted, stroke: theme.colors.borderStrong };
}

export function labelPillSize(text: string, fontSize: number): { w: number; h: number } {
  const w = Math.max(fontSize * text.length * 0.92 + 10, fontSize + 12);
  const h = fontSize + 8;
  return { w, h };
}
