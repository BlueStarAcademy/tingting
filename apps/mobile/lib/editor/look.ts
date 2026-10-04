import AsyncStorage from '@react-native-async-storage/async-storage';
import { getArEffect } from '@/lib/ar/effects';
import { getFilter } from './color';
import { AUTO_PRESET_ID, BEAUTY_PRESETS, EMPTY_BEAUTY, type BeautyKey, type BeautyValues } from './types';

/** Everything the beauty camera hands to the editor so the result matches the live preview. */
export type CameraLook = {
  beauty: BeautyValues;
  lip: number;
  blush: number;
  filterId: string | null;
  filterIntensity: number;
  /** AR face effect (stickers that follow the face) */
  effectId: string | null;
};

export function presetLook(presetId: string, base?: CameraLook): CameraLook {
  const preset = BEAUTY_PRESETS.find((p) => p.id === presetId) ?? BEAUTY_PRESETS[0];
  return {
    beauty: { ...preset.values },
    lip: preset.makeup?.lip ?? 0,
    blush: preset.makeup?.blush ?? 0,
    filterId: base?.filterId ?? null,
    filterIntensity: base?.filterIntensity ?? 0.8,
    effectId: base?.effectId ?? null,
  };
}

export const DEFAULT_CAMERA_LOOK: CameraLook = presetLook(AUTO_PRESET_ID);

/** Preset whose values match the look exactly, if any. */
export function matchingPreset(look: CameraLook): string | null {
  const hit = BEAUTY_PRESETS.find(
    (p) =>
      (Object.keys(EMPTY_BEAUTY) as BeautyKey[]).every((k) => Math.abs(p.values[k] - look.beauty[k]) < 0.005) &&
      Math.abs((p.makeup?.lip ?? 0) - look.lip) < 0.005 &&
      Math.abs((p.makeup?.blush ?? 0) - look.blush) < 0.005,
  );
  return hit?.id ?? null;
}

const round = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function encodeLook(look: CameraLook): string {
  const b: Record<string, number> = {};
  for (const k of Object.keys(EMPTY_BEAUTY) as BeautyKey[]) if (Math.abs(look.beauty[k]) > 0.001) b[k] = round(look.beauty[k]);
  return JSON.stringify({
    b,
    l: round(look.lip),
    u: round(look.blush),
    f: look.filterId,
    i: round(look.filterIntensity),
    e: look.effectId,
  });
}

export function decodeLook(raw: string | null | undefined): CameraLook | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as {
      b?: Record<string, unknown>;
      l?: unknown;
      u?: unknown;
      f?: unknown;
      i?: unknown;
      e?: unknown;
    };
    const beauty = { ...EMPTY_BEAUTY };
    for (const k of Object.keys(EMPTY_BEAUTY) as BeautyKey[]) beauty[k] = num(o.b?.[k], -1, 1, 0);
    const filterId = typeof o.f === 'string' && getFilter(o.f) ? o.f : null;
    return {
      beauty,
      lip: num(o.l, 0, 1, 0),
      blush: num(o.u, 0, 1, 0),
      filterId,
      filterIntensity: num(o.i, 0, 1, 1),
      effectId: typeof o.e === 'string' && getArEffect(o.e) ? o.e : null,
    };
  } catch {
    return null;
  }
}

const STORAGE_KEY = 'tingting.cameraLook.v1';

export async function loadCameraLook(): Promise<CameraLook> {
  try {
    return decodeLook(await AsyncStorage.getItem(STORAGE_KEY)) ?? DEFAULT_CAMERA_LOOK;
  } catch {
    return DEFAULT_CAMERA_LOOK;
  }
}

export function saveCameraLook(look: CameraLook): void {
  AsyncStorage.setItem(STORAGE_KEY, encodeLook(look)).catch(() => {});
}

/** SNOW-style quick filters shown on the camera; ids come from the shared editor filter list. */
export const CAMERA_FILTER_IDS = [
  'ai_bbosyap',
  'filter_soft_clean',
  'filter_peach_skin',
  'filter_rosy',
  'filter_porcelain',
  'filter_clean_k',
  'filter_aegyo',
  'filter_dreamy',
  'filter_latte',
  'filter_kodak_gold',
  'filter_film',
  'filter_jeju_sea',
  'filter_mono',
];

export const CAMERA_FILTERS = CAMERA_FILTER_IDS.map((id) => getFilter(id)).filter(
  (f): f is NonNullable<ReturnType<typeof getFilter>> => !!f,
);
