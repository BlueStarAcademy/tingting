import { Skia, drawAsImage, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { breadcrumb, checkpoint, logEvent } from '@/lib/diagnostics';
import { buildSceneModel } from '@/lib/editor/scene';
import { createEditState } from '@/lib/editor/types';
import { EditorScene } from './EditorScene';

const PROBE_SIZE = 48;
/** The on-screen canvas compiles the same program again, so a slower probe means a similar freeze. */
export const EFFECT_SLOW_MS = 2500;

export type EffectProbe = { ok: true; ms: number } | { ok: false; ms: number; reason: string };

let pending: Promise<EffectProbe> | null = null;

/**
 * Renders the editor scene with the beauty shader once into a tiny offscreen image (same render
 * tree as the screen and the export) and checks the pixels, so a GPU driver that can't compile or
 * run the shader is caught before the on-screen canvas uses it. Runs once per app session.
 */
export function probeEditorEffect(effect: SkRuntimeEffect): Promise<EffectProbe> {
  pending ??= runProbe(effect);
  return pending;
}

export function resetEditorEffectProbe() {
  pending = null;
}

async function runProbe(effect: SkRuntimeEffect): Promise<EffectProbe> {
  checkpoint('editor_effect_probe');
  const t0 = Date.now();
  let result: EffectProbe;
  try {
    const surface = Skia.Surface.Make(PROBE_SIZE, PROBE_SIZE);
    if (!surface) throw new Error('no raster surface');
    surface.getCanvas().drawColor(Skia.Color('#D9A58C'));
    const image = surface.makeImageSnapshot();
    const state = createEditState({ uri: 'probe', width: PROBE_SIZE, height: PROBE_SIZE });
    state.beauty = { ...state.beauty, smooth: 0.6, whiten: 0.3 };
    const out = await drawAsImage(
      <EditorScene image={image} model={buildSceneModel(state, [])} effect={effect} scale={1} />,
      { width: PROBE_SIZE, height: PROBE_SIZE },
    );
    const ms = Date.now() - t0;
    const px = out?.readPixels() ?? null;
    if (!out || !px) {
      result = { ok: false, ms, reason: out ? 'readPixels failed' : 'draw returned null' };
    } else {
      const unit = px instanceof Float32Array ? 255 : 1;
      const i = ((PROBE_SIZE / 2) * PROBE_SIZE + PROBE_SIZE / 2) * 4;
      const [r, g, b, a] = [px[i] * unit, px[i + 1] * unit, px[i + 2] * unit, px[i + 3] * unit];
      if (a < 250 || r + g + b < 60) result = { ok: false, ms, reason: `bad pixel ${r},${g},${b},${a}` };
      else if (ms > EFFECT_SLOW_MS) result = { ok: false, ms, reason: 'slow' };
      else result = { ok: true, ms };
    }
  } catch (e) {
    result = { ok: false, ms: Date.now() - t0, reason: e instanceof Error ? e.message : String(e) };
  }
  if (result.ok) breadcrumb('editor_effect_probe_ok', { ms: result.ms });
  else logEvent('editor_effect_probe_failed', { ms: result.ms, reason: result.reason }, 'warn');
  return result;
}
