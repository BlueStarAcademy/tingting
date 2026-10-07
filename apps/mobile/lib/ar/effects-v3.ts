import type { FaceGeom, Vec } from '@/lib/editor/faces';
import { FUN_MODES } from '@/lib/editor/fun-core';
import { dateStamp, drift, stretch, unitOf, type ArEffectV2 } from './effects-v2';
import { Rig, aspect, fract, rand, smooth, triggerLevel, type ArFrame, type ArOp, type ArSpriteId } from './rig';

/** Shader-side fun effect (see fun-core): mode, strength 0..1 and an optional face tint (rgb, amount). */
export type FunSpec = { mode: number; amount: number; tint?: readonly [number, number, number, number] };

export type ArEffectV3 = ArEffectV2 & { fun?: FunSpec };

const F = FUN_MODES;

export const AR_EFFECTS_V3: ArEffectV3[] = [
  { id: 'big_head', labelKey: 'ar.bigHead', thumb: 'th_big_head', category: 'fun', fun: { mode: F.bigHead, amount: 1 } },
  { id: 'long_face', labelKey: 'ar.longFace', thumb: 'th_long_face', category: 'fun', fun: { mode: F.longFace, amount: 1 } },
  { id: 'wide_face', labelKey: 'ar.wideFace', thumb: 'th_wide_face', category: 'fun', fun: { mode: F.wideFace, amount: 1 } },
  { id: 'big_nose', labelKey: 'ar.bigNose', thumb: 'th_big_nose', category: 'fun', fun: { mode: F.bigNose, amount: 1 } },
  { id: 'puffy', labelKey: 'ar.puffy', thumb: 'th_puffy', category: 'fun', fun: { mode: F.puffyCheeks, amount: 1 } },
  { id: 'duck_lips', labelKey: 'ar.duckLips', thumb: 'th_duck_lips', category: 'fun', fun: { mode: F.duckLips, amount: 1 } },
  {
    id: 'hippo',
    labelKey: 'ar.hippo',
    thumb: 'th_hippo',
    category: 'fun',
    trigger: 'mouth',
    fun: { mode: F.bigMouth, amount: 1 },
  },
  { id: 'swirl', labelKey: 'ar.swirl', thumb: 'th_swirl', category: 'fun', fun: { mode: F.swirl, amount: 1 } },
  { id: 'jelly', labelKey: 'ar.jelly', thumb: 'th_jelly', category: 'fun', fun: { mode: F.jelly, amount: 1 } },
  {
    id: 'baby',
    labelKey: 'ar.baby',
    thumb: 'th_baby',
    category: 'fun',
    fun: { mode: F.baby, amount: 1 },
    warp: { eyes: 1.4, nose: 1.2 },
  },

  { id: 'rainbow', labelKey: 'ar.rainbow', thumb: 'th_rainbow', category: 'fun', trigger: 'mouth' },
  { id: 'fire_breath', labelKey: 'ar.fireBreath', thumb: 'p_flame', category: 'fun', trigger: 'mouth' },
  { id: 'bubbles', labelKey: 'ar.bubbles', thumb: 'p_bubble', category: 'fun', trigger: 'mouth' },
  { id: 'emoji_face', labelKey: 'ar.emojiFace', thumb: 'emoji_smile', category: 'fun', trigger: 'mouth' },
  { id: 'tilt_question', labelKey: 'ar.tiltQuestion', thumb: 'p_question', category: 'fun', trigger: 'tilt' },

  { id: 'cool_shades', labelKey: 'ar.coolShades', thumb: 'pixel_shades', category: 'fun' },
  { id: 'nerd', labelKey: 'ar.nerd', thumb: 'nerd_glasses', category: 'fun' },
  { id: 'mustache', labelKey: 'ar.mustache', thumb: 'mustache', category: 'fun' },
  { id: 'chef', labelKey: 'ar.chef', thumb: 'chef_hat', category: 'fun' },
  { id: 'frog', labelKey: 'ar.frog', thumb: 'frog_hat', category: 'fun' },
  { id: 'tiger', labelKey: 'ar.tiger', thumb: 'tiger_ears', category: 'fun' },
  { id: 'vampire', labelKey: 'ar.vampire', thumb: 'fangs', category: 'fun' },
  { id: 'shy', labelKey: 'ar.shy', thumb: 'blush_lines', category: 'fun' },

  { id: 'mirror', labelKey: 'ar.mirror', thumb: 'th_mirror', category: 'fun', ambient: true, fun: { mode: F.mirror, amount: 1 } },
  { id: 'kaleido', labelKey: 'ar.kaleido', thumb: 'th_kaleido', category: 'fun', ambient: true, fun: { mode: F.kaleido, amount: 1 } },
  { id: 'pop_art', labelKey: 'ar.popArt', thumb: 'th_pop_art', category: 'fun', ambient: true, fun: { mode: F.popArt, amount: 1 } },
  { id: 'pixel', labelKey: 'ar.pixel', thumb: 'th_pixel', category: 'fun', ambient: true, fun: { mode: F.pixel, amount: 1 } },
  { id: 'comic', labelKey: 'ar.comic', thumb: 'th_comic', category: 'fun', ambient: true, fun: { mode: F.comic, amount: 1 } },

  { id: 'glitch', labelKey: 'ar.glitch', thumb: 'th_glitch', category: 'mood', ambient: true, fun: { mode: F.glitch, amount: 1 } },
  { id: 'vhs', labelKey: 'ar.vhs', thumb: 'th_vhs', category: 'mood', ambient: true, fun: { mode: F.vhs, amount: 1 } },
  {
    id: 'color_pop',
    labelKey: 'ar.colorPop',
    thumb: 'th_color_pop',
    category: 'mood',
    ambient: true,
    fun: { mode: F.colorPop, amount: 1 },
  },
];

const V3 = new Map(AR_EFFECTS_V3.map((e) => [e.id, e]));

/** Shader fun effects added to earlier-pack effects. */
const FUN_EXTRA: Record<string, FunSpec> = {
  alien: { mode: F.alien, amount: 1, tint: [0.62, 1, 0.55, 0.5] },
};

export const isArV3 = (id: string | null | undefined): boolean => !!id && V3.has(id);

export function arFunSpec(id: string | null | undefined): FunSpec | null {
  if (!id) return null;
  return V3.get(id)?.fun ?? FUN_EXTRA[id] ?? null;
}

/** `uFun` / `uFun2` for the camera and editor shaders; mode 0 turns the fun pass off. */
export function arFunUniforms(id: string | null | undefined, time: number): { uFun: number[]; uFun2: number[] } {
  const spec = arFunSpec(id);
  return {
    uFun: spec ? [spec.mode, spec.amount, time, 0] : [0, 0, 0, 0],
    uFun2: spec?.tint ? [...spec.tint] : [1, 1, 1, 0],
  };
}

// ---- layout ---------------------------------------------------------------------------

const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** point on the mouth's centre line, `along` pixels toward the forehead from the lip box centre */
const lipPoint = (f: FaceGeom, along: number): Vec => ({ x: f.mouth.x + f.up.x * along, y: f.mouth.y + f.up.y * along });

/** middle of the gap between the lips (on the lip line when closed) */
const mouthGap = (f: FaceGeom) => lipPoint(f, (f.lipInnerTop + f.lipInnerBottom) / 2);

/** sprite whose top edge sits on `top`, hanging toward the chin; `grow` scales only its length */
function hang(rig: Rig, sprite: ArSpriteId, top: Vec, width: number, grow: number, alpha: number) {
  const a = alpha * rig.alpha;
  if (a < 0.01 || grow <= 0) return;
  const rot = rig.f.angle;
  const h = width * aspect(sprite) * grow;
  rig.ops.push({ sprite, x: top.x - Math.sin(rot) * (h / 2), y: top.y + Math.cos(rot) * (h / 2), w: width * rig.turn, h, rot, alpha: a });
}

function mustache(rig: Rig) {
  const { f, eyeDist } = rig;
  const lipTop = lipPoint(f, f.lipHalfHeight);
  rig.put('mustache', lerp(f.nose, lipTop, 0.6), Math.max(f.mouthHalfWidth * 2.9, eyeDist * 1.1), { pivot: 0.45 });
}

function faceOps(id: string, rig: Rig, time: number, index: number) {
  const { f, eyeMid, headW, eyeDist } = rig;
  const level = triggerLevel(f, V3.get(id)?.trigger);
  const mw = Math.max(f.mouthHalfWidth, eyeDist * 0.3);
  switch (id) {
    case 'puffy':
      rig.cheeks('blush', 0.72, 0.8, -0.05);
      break;
    case 'baby':
      rig.cheeks('blush', 0.62, 0.8);
      break;

    case 'rainbow': {
      const top = mouthGap(f);
      hang(rig, 'fx_rainbow_beam', top, mw * 1.9, 0.3 + 0.7 * level, Math.min(1, level * 1.6));
      if (level < 0.02) break;
      for (let i = 0; i < 6; i += 1) {
        const age = fract(time * 0.8 + i / 6);
        const pos = rig.at(top, (rand(i, 71) - 0.5) * 1.1, -0.35 - age * 2.4);
        rig.put('p_star', pos, eyeDist * 0.26 * (0.7 + rand(i, 72) * 0.6), {
          alpha: level * Math.min(1, age * 6) * (1 - age),
          flat: true,
          tilt: time * 2 + i,
        });
      }
      break;
    }
    case 'fire_breath': {
      if (level < 0.02) break;
      const o = mouthGap(f);
      const n = 14;
      // a cone of flames shooting down; each flame's tip trails back toward the mouth
      const parts = Array.from({ length: n }, (_, i) => ({ age: fract(time * 1.5 + i / n), dir: (rand(i, 81) - 0.5) * 1.2 }));
      parts.sort((a, b) => b.age - a.age);
      for (const p of parts) {
        const dist = 0.12 + p.age * 2.1;
        rig.put('p_flame', rig.at(o, Math.sin(p.dir) * dist, -Math.cos(p.dir) * dist), eyeDist * (0.3 + p.age * 0.9), {
          alpha: level * Math.min(1, p.age * 7) * Math.pow(1 - p.age, 0.6),
          flat: true,
          tilt: -p.dir,
          pivot: 0.35,
        });
      }
      break;
    }
    case 'bubbles':
      rig.stream('p_bubble', mouthGap(f), level, time, 10, 0.58, 1.6);
      break;
    case 'emoji_face':
      rig.put(level > 0.5 ? 'emoji_laugh' : 'emoji_smile', rig.at(f.center, 0, 0.05), headW * 1.12, { flat: true });
      break;
    case 'tilt_question': {
      const idle = Math.sin(time * 2.4 + index) * 0.06;
      rig.put('p_question', rig.crown(1.5 + idle, 0.95), eyeDist * 0.42 * (1 - level * 0.5), { alpha: 1 - level, flat: true, tilt: 0.25 });
      if (level < 0.02) break;
      [-1, 0, 1].forEach((s, i) => {
        const pop = level * (1 + 0.12 * Math.sin(time * 9 + i * 2));
        rig.put('p_question', rig.crown(1.75 - Math.abs(s) * 0.3, s * 1.05), eyeDist * 0.6 * pop, { flat: true, tilt: s * 0.35 });
      });
      break;
    }

    case 'cool_shades': {
      const t = Math.min(1, time / 0.9);
      const drop = (1 - t) * (1 - t) * 3.4;
      rig.put('pixel_shades', rig.at(eyeMid, 0, drop), eyeDist * 2.15, { pivot: 0.45 });
      break;
    }
    case 'nerd':
      rig.put('nerd_glasses', rig.at(eyeMid, 0, 0), eyeDist * 2.05);
      rig.put('buck_teeth', lipPoint(f, f.lipInnerTop + f.lipHalfHeight * 0.12), mw * 0.72, { pivot: 0.03 });
      break;
    case 'mustache':
      mustache(rig);
      break;
    case 'chef':
      rig.put('chef_hat', rig.crown(1.3), headW * 0.98, { pivot: 0.88 });
      mustache(rig);
      break;
    case 'frog':
      rig.put('frog_hat', rig.crown(0.72), headW * 1.12, { pivot: 0.95 });
      rig.cheeks('blush', 0.6, 0.7);
      break;
    case 'tiger':
      rig.put('tiger_ears', rig.crown(1.15), headW * 1.25, { pivot: 0.8 });
      rig.put('tiger_muzzle', rig.at(f.nose, 0, 0.05), eyeDist * 1.9, { pivot: 0.18 });
      break;
    case 'vampire':
      rig.put('fangs', lipPoint(f, f.lipInnerTop + f.lipHalfHeight * 0.08), mw * 1.7, { pivot: 0.04 });
      break;
    case 'shy': {
      rig.cheeks('blush_lines', 0.78, 0.95, 0, 0.04);
      const slide = fract(time * 0.35);
      rig.put('sweat_drop', rig.at(eyeMid, 1.05, 0.95 - slide * 0.35), eyeDist * 0.26, {
        alpha: Math.min(1, slide * 6) * (1 - smooth(0.75, 1, slide)),
      });
      break;
    }
    default:
      break;
  }
}

function ambientOps(id: string, frame: ArFrame, ops: ArOp[]) {
  const unit = unitOf(frame);
  switch (id) {
    case 'vampire':
      drift(ops, frame, { sprites: ['p_bat'], count: 4, size: 0.09, speed: 0.06, band: [0.04, 0.26], dir: 1, flap: 0.45 });
      break;
    case 'vhs': {
      const w = unit * 0.065;
      const inset = unit * 0.06;
      stretch(ops, 'fx_play', inset + w / 2, inset + (w * aspect('fx_play')) / 2, w, w * aspect('fx_play'), 0.9);
      dateStamp(ops, frame, inset);
      break;
    }
    default:
      break;
  }
}

/** Every sprite for a third-pack effect, in draw order, in the frame's pixel space. */
export function layoutArEffectV3(effectId: string, frame: ArFrame): ArOp[] {
  if (!V3.has(effectId)) return [];
  const ops: ArOp[] = [];
  ambientOps(effectId, frame, ops);
  frame.faces
    .filter((fc) => fc.presence > 0.01)
    .sort((a, b) => a.face.center.x - b.face.center.x)
    .forEach((fc, index) => faceOps(effectId, new Rig(fc, ops), frame.time, index));
  return ops;
}
