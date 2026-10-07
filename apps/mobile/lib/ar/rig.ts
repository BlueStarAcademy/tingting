import type { FaceGeom, Vec } from '@/lib/editor/faces';
import { AR_SPRITES as SPRITES, type SpriteId } from './sprites';

export type ArSpriteId = SpriteId;

/** One sprite draw in image pixels; (x, y) is the sprite center, rot is clockwise radians. */
export type ArOp = { sprite: ArSpriteId; x: number; y: number; w: number; h: number; rot: number; alpha: number };

export type ArTrigger = 'mouth' | 'smile' | 'blink' | 'tilt';

export type ArFace = { face: FaceGeom; presence: number };

export type ArFrame = {
  width: number;
  height: number;
  /** seconds; drives particles and bobbing */
  time: number;
  faces: ArFace[];
};

export const aspect = (sprite: ArSpriteId) => SPRITES[sprite].h / SPRITES[sprite].w;

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const fract = (x: number) => x - Math.floor(x);
export const rand = (i: number, k: number) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });

export function triggerLevel(face: FaceGeom, trigger: ArTrigger | undefined): number {
  if (trigger === 'mouth') return smooth(0.35, 0.65, face.mouthOpen);
  if (trigger === 'smile') return face.smile < 0 ? 0 : smooth(0.55, 0.8, face.smile);
  if (trigger === 'blink') return face.eyesOpen < 0 ? 0 : 1 - smooth(0.12, 0.4, face.eyesOpen);
  if (trigger === 'tilt') return smooth(0.16, 0.32, Math.abs(face.angle));
  return 0;
}

export type Place = {
  /** where the anchor sits inside the sprite, 0 = top edge, 1 = bottom edge */
  pivot?: number;
  /** extra rotation on top of the face roll */
  tilt?: number;
  alpha?: number;
  /** keep the sprite flat-on (particles); otherwise it narrows as the head turns */
  flat?: boolean;
};

export class Rig {
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

  put(sprite: ArSpriteId, anchor: Vec, width: number, opts: Place = {}) {
    const rot = this.f.angle + (opts.tilt ?? 0);
    const w = width * (opts.flat ? 1 : this.turn);
    const h = width * aspect(sprite);
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

  cheeks(sprite: ArSpriteId, width: number, alpha = 1, inward = 0, lift = 0.06) {
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
  orbit(sprite: ArSpriteId, count: number, time: number, size: number, alpha = 1) {
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
  stream(sprite: ArSpriteId, origin: Vec, level: number, time: number, count: number, size: number, spread = 1) {
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

export type FallStyle = { sprites: ArSpriteId[]; count: number; size: number; speed: number; spin: number; alpha?: number };

/** full-frame falling particles (snow, petals, hearts, confetti) */
export function fall(ops: ArOp[], frame: ArFrame, style: FallStyle) {
  const { width, height, time } = frame;
  const unit = Math.min(width, height);
  for (let i = 0; i < style.count; i += 1) {
    const sprite = style.sprites[i % style.sprites.length];
    const speed = style.speed * (0.7 + rand(i, 1) * 0.6);
    const y = (fract(rand(i, 2) + time * speed) * 1.2 - 0.1) * height;
    const x = (rand(i, 3) + Math.sin(time * (0.6 + rand(i, 4)) + i) * 0.04) * width;
    const w = unit * style.size * (0.55 + rand(i, 5) * 0.7);
    ops.push({
      sprite,
      x,
      y,
      w,
      h: w * aspect(sprite),
      rot: Math.sin(time * style.spin * (0.5 + rand(i, 6)) + i * 2.1) * 0.9,
      alpha: (style.alpha ?? 0.92) * (0.75 + rand(i, 7) * 0.25),
    });
  }
}
