import type { FaceGeom, Vec } from '@/lib/editor/faces';
import { AR_SPRITES, type SpriteId } from './sprites';

/** One sprite draw in image pixels; (x, y) is the sprite center, rot is clockwise radians. */
export type ArOp = { sprite: SpriteId; x: number; y: number; w: number; h: number; rot: number; alpha: number };

export type ArTrigger = 'mouth' | 'smile' | 'blink';

export type ArEffect = {
  id: string;
  /** translation key for the picker label */
  labelKey: string;
  thumb: SpriteId;
  trigger?: ArTrigger;
  /** draws without a face (full-frame particles) */
  ambient?: boolean;
};

export const AR_EFFECTS: ArEffect[] = [
  { id: 'bunny', labelKey: 'ar.bunny', thumb: 'bunny_ears' },
  { id: 'cat', labelKey: 'ar.cat', thumb: 'cat_ears' },
  { id: 'puppy', labelKey: 'ar.puppy', thumb: 'puppy_nose', trigger: 'mouth' },
  { id: 'bear', labelKey: 'ar.bear', thumb: 'bear_ears' },
  { id: 'heart_cheeks', labelKey: 'ar.heartCheeks', thumb: 'heart_sticker', trigger: 'mouth' },
  { id: 'flower', labelKey: 'ar.flower', thumb: 'flower_crown', ambient: true },
  { id: 'tiara', labelKey: 'ar.tiara', thumb: 'tiara' },
  { id: 'heart_glasses', labelKey: 'ar.heartGlasses', thumb: 'heart_glasses', trigger: 'smile' },
  { id: 'round_glasses', labelKey: 'ar.roundGlasses', thumb: 'round_glasses' },
  { id: 'ribbon', labelKey: 'ar.ribbon', thumb: 'bow' },
  { id: 'devil', labelKey: 'ar.devil', thumb: 'devil_horns' },
  { id: 'angel', labelKey: 'ar.angel', thumb: 'halo' },
  { id: 'party', labelKey: 'ar.party', thumb: 'party_hat', ambient: true },
  { id: 'blushy', labelKey: 'ar.blushy', thumb: 'blush' },
  { id: 'pig', labelKey: 'ar.pig', thumb: 'pig_nose' },
  { id: 'clown', labelKey: 'ar.clown', thumb: 'clown_nose' },
  { id: 'sparkle', labelKey: 'ar.sparkle', thumb: 'p_sparkle', trigger: 'blink' },
  { id: 'heart_rain', labelKey: 'ar.heartRain', thumb: 'p_heart', ambient: true },
  { id: 'snow', labelKey: 'ar.snow', thumb: 'p_snow', ambient: true },
];

export function getArEffect(id: string | null | undefined): ArEffect | null {
  return (id && AR_EFFECTS.find((e) => e.id === id)) || null;
}

/** Live tracking only needs ML Kit classification for smile / blink triggers. */
export function arNeedsClassification(id: string | null | undefined): boolean {
  const t = getArEffect(id)?.trigger;
  return t === 'smile' || t === 'blink';
}

export type ArFace = { face: FaceGeom; presence: number };

export type ArFrame = {
  width: number;
  height: number;
  /** seconds; drives particles and bobbing */
  time: number;
  faces: ArFace[];
};

/** Seconds used for saved photos, so particles land in a natural-looking scatter. */
export const STILL_TIME = 2.6;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const fract = (x: number) => x - Math.floor(x);
const rand = (i: number, k: number) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });

export function triggerLevel(face: FaceGeom, trigger: ArTrigger | undefined): number {
  if (trigger === 'mouth') return smooth(0.35, 0.65, face.mouthOpen);
  if (trigger === 'smile') return face.smile < 0 ? 0 : smooth(0.55, 0.8, face.smile);
  if (trigger === 'blink') return face.eyesOpen < 0 ? 0 : 1 - smooth(0.12, 0.4, face.eyesOpen);
  return 0;
}

type Place = {
  /** where the anchor sits inside the sprite, 0 = top edge, 1 = bottom edge */
  pivot?: number;
  /** extra rotation on top of the face roll */
  tilt?: number;
  alpha?: number;
  /** keep the sprite flat-on (particles); otherwise it narrows as the head turns */
  flat?: boolean;
};

class Rig {
  readonly f: FaceGeom;
  readonly alpha: number;
  readonly eyeMid: Vec;
  readonly eyeDist: number;
  readonly headW: number;
  readonly turn: number;
  readonly ops: ArOp[];

  constructor({ face, presence }: ArFace, ops: ArOp[]) {
    this.f = face;
    this.alpha = presence;
    this.ops = ops;
    this.eyeMid = { x: (face.leftEye.x + face.rightEye.x) / 2, y: (face.leftEye.y + face.rightEye.y) / 2 };
    this.eyeDist = Math.max(1, Math.hypot(face.rightEye.x - face.leftEye.x, face.rightEye.y - face.leftEye.y));
    this.headW = Math.max(face.radius.x * 2, this.eyeDist * 2.3);
    this.turn = Math.max(0.55, Math.cos(face.yaw));
  }

  /** point in face space: dx along the eye line, dy toward the forehead, in eye distances */
  at(origin: Vec, dx: number, dy: number): Vec {
    const { ax, up } = this.f;
    return add(origin, add(mul(ax, dx * this.eyeDist), mul(up, dy * this.eyeDist)));
  }

  /** top-of-head anchor; the skull sits behind the face, so it trails a turning nose */
  crown(dy: number, dx = 0): Vec {
    return this.at(this.eyeMid, dx - Math.sin(this.f.yaw) * 0.35, dy);
  }

  put(sprite: SpriteId, anchor: Vec, width: number, opts: Place = {}) {
    const art = AR_SPRITES[sprite];
    const rot = this.f.angle + (opts.tilt ?? 0);
    const w = width * (opts.flat ? 1 : this.turn);
    const h = width * (art.h / art.w);
    const lift = h * ((opts.pivot ?? 0.5) - 0.5);
    const alpha = (opts.alpha ?? 1) * this.alpha;
    if (alpha < 0.01 || w < 1) return;
    this.ops.push({
      sprite,
      x: anchor.x + Math.sin(rot) * lift,
      y: anchor.y - Math.cos(rot) * lift,
      w,
      h,
      rot,
      alpha,
    });
  }

  cheeks(sprite: SpriteId, width: number, alpha = 1, inward = 0, lift = 0.06) {
    const { leftCheek, rightCheek, nose } = this.f;
    for (const [cheek, sign] of [
      [leftCheek, 1],
      [rightCheek, -1],
    ] as const) {
      const toward = { x: cheek.x + (nose.x - cheek.x) * inward, y: cheek.y + (nose.y - cheek.y) * inward };
      this.put(sprite, this.at(toward, 0, lift), width * this.eyeDist, { alpha, tilt: sign * 0.05 });
    }
  }

  /** particles twinkling on an ellipse around the head */
  orbit(sprite: SpriteId, count: number, time: number, size: number, alpha = 1) {
    for (let i = 0; i < count; i += 1) {
      const a = -Math.PI * 0.8 + (Math.PI * 1.6 * (i + rand(i, 3) * 0.6)) / count;
      const r = 1.05 + rand(i, 5) * 0.3;
      const pulse = 0.55 + 0.45 * Math.sin(time * (2.2 + rand(i, 7) * 1.6) + i * 1.7);
      const pos = this.at(this.eyeMid, Math.sin(a) * r * 1.3, 0.25 + Math.cos(a) * r * 1.15);
      this.put(sprite, pos, this.eyeDist * size * (0.6 + rand(i, 9) * 0.6) * (0.7 + 0.3 * pulse), {
        alpha: alpha * pulse,
        flat: true,
        tilt: time * 0.6 + i,
      });
    }
  }

  /** a looping burst of particles fanning out of `origin` and drifting up while `level` is on */
  stream(sprite: SpriteId, origin: Vec, level: number, time: number, count: number, size: number, spread = 1) {
    if (level < 0.02) return;
    for (let i = 0; i < count; i += 1) {
      const age = fract(time * 0.8 + i / count);
      const dir = i % 2 === 0 ? 1 : -1;
      const dx = dir * (0.2 + age * (0.9 + rand(i, 11) * 0.9)) * spread;
      const dy = -0.1 + age * (1.1 + rand(i, 13) * 0.8);
      const fade = Math.min(1, age * 5) * (1 - age * age);
      this.put(sprite, this.at(origin, dx, dy), this.eyeDist * size * (0.6 + age * 0.6), {
        alpha: level * fade * 1.2,
        flat: true,
        tilt: dir * (0.25 + age * 0.3),
      });
    }
  }
}

type FallStyle = { sprites: SpriteId[]; count: number; size: number; speed: number; spin: number; alpha?: number };

/** full-frame falling particles (snow, petals, hearts, confetti) */
function fall(ops: ArOp[], frame: ArFrame, style: FallStyle) {
  const { width, height, time } = frame;
  const unit = Math.min(width, height);
  for (let i = 0; i < style.count; i += 1) {
    const sprite = style.sprites[i % style.sprites.length];
    const art = AR_SPRITES[sprite];
    const speed = style.speed * (0.7 + rand(i, 1) * 0.6);
    const y = (fract(rand(i, 2) + time * speed) * 1.2 - 0.1) * height;
    const x = (rand(i, 3) + Math.sin(time * (0.6 + rand(i, 4)) + i) * 0.04) * width;
    const w = unit * style.size * (0.55 + rand(i, 5) * 0.7);
    ops.push({
      sprite,
      x,
      y,
      w,
      h: w * (art.h / art.w),
      rot: Math.sin(time * style.spin * (0.5 + rand(i, 6)) + i * 2.1) * 0.9,
      alpha: (style.alpha ?? 0.92) * (0.75 + rand(i, 7) * 0.25),
    });
  }
}

function faceOps(effect: ArEffect, rig: Rig, time: number) {
  const { f, eyeMid, headW, eyeDist } = rig;
  const level = triggerLevel(f, effect.trigger);
  switch (effect.id) {
    case 'bunny':
      rig.put('bunny_ears', rig.crown(1.0), headW * 1.0, { pivot: 0.93 });
      rig.cheeks('blush', 0.62, 0.7);
      break;
    case 'cat':
      rig.put('cat_ears', rig.crown(1.1), headW * 1.12, { pivot: 0.84 });
      rig.put('cat_nose', rig.at(f.nose, 0, 0.06), eyeDist * 2.3, { pivot: 0.38 });
      break;
    case 'puppy': {
      rig.put('puppy_ear_l', rig.crown(1.5, -1.05), headW * 0.46, { pivot: 0.04, tilt: 0.2 });
      rig.put('puppy_ear_r', rig.crown(1.5, 1.05), headW * 0.46, { pivot: 0.04, tilt: -0.2 });
      if (level > 0.02) {
        const art = AR_SPRITES.puppy_tongue;
        const width = Math.max(f.mouthHalfWidth * 1.45, eyeDist * 0.5);
        const grow = 0.35 + 0.65 * level;
        const rot = f.angle;
        const h = width * (art.h / art.w) * grow;
        const top = rig.at(f.mouth, 0, -0.05);
        rig.ops.push({
          sprite: 'puppy_tongue',
          x: top.x - Math.sin(rot) * (h / 2),
          y: top.y + Math.cos(rot) * (h / 2),
          w: width * rig.turn,
          h,
          rot,
          alpha: Math.min(1, level * 1.6) * rig.alpha,
        });
      }
      rig.put('puppy_nose', rig.at(f.nose, 0, 0.16), eyeDist * 0.68);
      break;
    }
    case 'bear':
      rig.put('bear_ears', rig.crown(1.05), headW * 1.2, { pivot: 0.72 });
      rig.cheeks('blush', 0.6, 0.65);
      break;
    case 'heart_cheeks':
      rig.cheeks('heart_sticker', 0.5, 1, 0.1, 0.1);
      rig.stream('p_heart', f.mouth, level, time, 8, 0.42, 1.3);
      break;
    case 'flower':
      rig.put('flower_crown', rig.crown(1.2), headW * 1.22, { pivot: 0.62 });
      break;
    case 'tiara':
      rig.put('tiara', rig.crown(1.3), headW * 0.76, { pivot: 0.92 });
      rig.orbit('p_sparkle', 5, time, 0.4, 0.9);
      break;
    case 'heart_glasses':
      rig.put('heart_glasses', rig.at(eyeMid, 0, 0.02), eyeDist * 2.45);
      rig.stream('p_heart', rig.at(eyeMid, 0, -0.6), level, time, 10, 0.4, 1.6);
      break;
    case 'round_glasses':
      rig.put('round_glasses', rig.at(eyeMid, 0, 0.01), eyeDist * 2.4);
      rig.cheeks('freckles', 0.46, 0.85, 0.3, 0.12);
      break;
    case 'ribbon':
      rig.put('bow', rig.crown(1.25, 0.95), headW * 0.42, { pivot: 0.55, tilt: 0.35 });
      rig.cheeks('blush', 0.58, 0.6);
      break;
    case 'devil':
      rig.put('devil_horns', rig.crown(1.4), headW * 0.92, { pivot: 0.9 });
      break;
    case 'angel': {
      const bob = Math.sin(time * 2.2) * 0.06;
      rig.put('halo', rig.crown(2.05 + bob), headW * 0.78, { pivot: 0.5 });
      rig.orbit('p_sparkle', 3, time, 0.32, 0.75);
      break;
    }
    case 'party':
      rig.put('party_hat', rig.crown(1.45, 0.3), headW * 0.5, { pivot: 0.95, tilt: 0.22 });
      break;
    case 'blushy':
      rig.cheeks('blush', 0.66, 0.85);
      rig.cheeks('freckles', 0.42, 0.75, 0.3, 0.16);
      break;
    case 'pig':
      rig.put('pig_nose', rig.at(f.nose, 0, 0.1), eyeDist * 0.85);
      rig.cheeks('blush', 0.6, 0.7);
      break;
    case 'clown':
      rig.put('clown_nose', rig.at(f.nose, 0, 0.1), eyeDist * 0.7);
      rig.cheeks('blush', 0.66, 0.9);
      break;
    case 'sparkle':
      rig.orbit('p_sparkle', 8, time, 0.5);
      rig.stream('p_sparkle', f.leftEye, level, time, 4, 0.42, 0.7);
      rig.stream('p_sparkle', f.rightEye, level, time + 0.5, 4, 0.42, 0.7);
      break;
    case 'heart_rain':
    case 'snow':
      rig.cheeks('blush', 0.6, 0.55);
      break;
    default:
      break;
  }
}

/** Every sprite to draw for an effect, front-to-back order, in the frame's pixel space. */
export function layoutArEffect(effectId: string | null | undefined, frame: ArFrame): ArOp[] {
  const effect = getArEffect(effectId);
  if (!effect) return [];
  const ops: ArOp[] = [];
  for (const face of frame.faces) {
    if (face.presence > 0.01) faceOps(effect, new Rig(face, ops), frame.time);
  }
  switch (effect.id) {
    case 'flower':
      fall(ops, frame, { sprites: ['p_petal'], count: 12, size: 0.06, speed: 0.11, spin: 1.4 });
      break;
    case 'party':
      fall(ops, frame, { sprites: ['p_heart', 'p_sparkle'], count: 12, size: 0.05, speed: 0.13, spin: 2 });
      break;
    case 'heart_rain':
      fall(ops, frame, { sprites: ['p_heart'], count: 14, size: 0.065, speed: 0.12, spin: 1 });
      break;
    case 'snow':
      fall(ops, frame, { sprites: ['p_snow'], count: 18, size: 0.05, speed: 0.09, spin: 0.8, alpha: 0.85 });
      break;
    default:
      break;
  }
  return ops;
}
