import type { Region } from '@tingting/shared';
import { theme } from '@/constants/theme';

export type KoreaMapVisualVariant = 'default' | 'naver';

export function regionFill(
  code: string,
  visited: Set<string>,
  selectedCode: string | null | undefined,
  region: Region,
  variant: KoreaMapVisualVariant = 'default',
): string {
  const isVisited = visited.has(code);
  const isSelected = selectedCode === code;
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
): string {
  if (variant === 'naver') return selectedCode === code ? '#FFFFFF' : '#F7FFF5';
  return selectedCode === code ? theme.colors.mapSelectedStroke : theme.colors.mapStroke;
}

export function regionStrokeWidth(
  selectedCode: string | null | undefined,
  code: string,
  variant: KoreaMapVisualVariant = 'default',
): number {
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

export function labelPillSize(text: string, fontSize: number): { w: number; h: number } {
  const w = Math.max(fontSize * text.length * 0.92 + 10, fontSize + 12);
  const h = fontSize + 8;
  return { w, h };
}
