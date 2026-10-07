import { getFilter } from './color';
import type { CameraLook } from './look';
import { EMPTY_BEAUTY, type BeautyKey, type BeautyValues } from './types';

/** One-tap SNOW-style look: skin and face shape, lip tint, blush and a matching filter. */
export type MakeupLook = {
  id: string;
  label: string;
  /** two-tone swatch for the picker (lip, blush) */
  swatch: [string, string];
  beauty: BeautyValues;
  lip: { amount: number; color: string };
  blush: { amount: number; color: string };
  filterId: string | null;
  filterIntensity: number;
};

const b = (v: Partial<BeautyValues>): BeautyValues => ({ ...EMPTY_BEAUTY, ...v });

// colors come from the MAKEUP_ITEMS palettes so the editor swatches stay in sync
export const MAKEUP_LOOKS: MakeupLook[] = [
  {
    id: 'daily',
    label: '데일리',
    swatch: ['#F0627A', '#F58BA0'],
    beauty: b({ smooth: 0.45, whiten: 0.2, tone: 0.05, clarity: 0.1, slim: 0.15, jaw: 0.12, eyes: 0.12, nose: 0.08 }),
    lip: { amount: 0.3, color: '#F0627A' },
    blush: { amount: 0.2, color: '#F58BA0' },
    filterId: 'filter_daily_cam',
    filterIntensity: 0.7,
  },
  {
    id: 'pure',
    label: '청순',
    swatch: ['#F0627A', '#F7A1C4'],
    beauty: b({ smooth: 0.6, whiten: 0.35, tone: -0.12, slim: 0.22, jaw: 0.18, eyes: 0.2, nose: 0.1 }),
    lip: { amount: 0.22, color: '#F0627A' },
    blush: { amount: 0.28, color: '#F7A1C4' },
    filterId: 'filter_cream',
    filterIntensity: 0.7,
  },
  {
    id: 'peach',
    label: '복숭아',
    swatch: ['#E8746A', '#FF9E80'],
    beauty: b({ smooth: 0.55, whiten: 0.25, tone: 0.12, slim: 0.2, jaw: 0.15, eyes: 0.18, nose: 0.1, cheek: 0.05 }),
    lip: { amount: 0.42, color: '#E8746A' },
    blush: { amount: 0.5, color: '#FF9E80' },
    filterId: 'filter_peach',
    filterIntensity: 0.75,
  },
  {
    id: 'coral',
    label: '코랄',
    swatch: ['#E8746A', '#D9776B'],
    beauty: b({ smooth: 0.5, whiten: 0.2, tone: 0.18, clarity: 0.1, slim: 0.18, jaw: 0.15, eyes: 0.15 }),
    lip: { amount: 0.55, color: '#E8746A' },
    blush: { amount: 0.35, color: '#D9776B' },
    filterId: 'filter_warm',
    filterIntensity: 0.6,
  },
  {
    id: 'lovely',
    label: '러블리',
    swatch: ['#F0627A', '#F58BA0'],
    beauty: b({ smooth: 0.6, whiten: 0.3, slim: 0.25, jaw: 0.2, eyes: 0.28, nose: 0.12, cheek: 0.1 }),
    lip: { amount: 0.38, color: '#F0627A' },
    blush: { amount: 0.55, color: '#F58BA0' },
    filterId: 'filter_aegyo',
    filterIntensity: 0.7,
  },
  {
    id: 'mood',
    label: '무드',
    swatch: ['#9E3B52', '#D9776B'],
    beauty: b({ smooth: 0.45, whiten: 0.1, clarity: 0.25, slim: 0.2, jaw: 0.18, eyes: 0.1, nose: 0.12 }),
    lip: { amount: 0.55, color: '#9E3B52' },
    blush: { amount: 0.22, color: '#D9776B' },
    filterId: 'filter_latte',
    filterIntensity: 0.75,
  },
  {
    id: 'film',
    label: '필름',
    swatch: ['#B5213F', '#E86A92'],
    beauty: b({ smooth: 0.4, whiten: 0.1, tone: 0.1, clarity: 0.15, slim: 0.15, jaw: 0.12, eyes: 0.1 }),
    lip: { amount: 0.45, color: '#B5213F' },
    blush: { amount: 0.25, color: '#E86A92' },
    filterId: 'filter_disposable',
    filterIntensity: 0.85,
  },
  {
    id: 'boyfriend',
    label: '남친',
    swatch: ['#E8746A', '#D9776B'],
    beauty: b({ smooth: 0.3, tone: 0.1, clarity: 0.35, slim: 0.15, jaw: 0.2, eyes: 0.05, nose: 0.1, cheek: 0.1 }),
    lip: { amount: 0.08, color: '#E8746A' },
    blush: { amount: 0.05, color: '#D9776B' },
    filterId: 'filter_film',
    filterIntensity: 0.55,
  },
];

export const getMakeupLook = (id: string | null | undefined) => MAKEUP_LOOKS.find((l) => l.id === id);

/** Camera look with a makeup look applied; the sticker effect is kept. */
export function withMakeupLook(base: CameraLook, id: string): CameraLook {
  const l = getMakeupLook(id);
  if (!l) return base;
  const filterId = l.filterId && getFilter(l.filterId) ? l.filterId : null;
  return {
    ...base,
    beauty: { ...l.beauty },
    lip: l.lip.amount,
    blush: l.blush.amount,
    lipColor: l.lip.color,
    blushColor: l.blush.color,
    filterId,
    filterIntensity: filterId ? l.filterIntensity : base.filterIntensity,
  };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

/** Makeup look the values still match exactly, if any. */
export function matchingMakeupLook(v: {
  beauty: BeautyValues;
  lip: number;
  blush: number;
  lipColor?: string;
  blushColor?: string;
  filterId: string | null;
}): string | null {
  const hit = MAKEUP_LOOKS.find(
    (l) =>
      (Object.keys(EMPTY_BEAUTY) as BeautyKey[]).every((k) => near(l.beauty[k], v.beauty[k])) &&
      near(l.lip.amount, v.lip) &&
      near(l.blush.amount, v.blush) &&
      l.lip.color === v.lipColor &&
      l.blush.color === v.blushColor &&
      l.filterId === v.filterId,
  );
  return hit?.id ?? null;
}
