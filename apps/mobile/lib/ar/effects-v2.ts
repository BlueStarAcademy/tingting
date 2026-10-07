import type { Vec } from '@/lib/editor/faces';
import type { BeautyKey, BeautyValues } from '@/lib/editor/types';
import { Rig, aspect, fall, fract, rand, triggerLevel, type ArFrame, type ArOp, type ArSpriteId, type ArTrigger } from './rig';

export type ArCategory = 'cute' | 'couple' | 'travel' | 'season' | 'fun' | 'mood';

/** Tabs in the sticker picker; 'new' lists the second pack. */
export const AR_TABS: { id: ArCategory | 'new'; labelKey: string }[] = [
  { id: 'new', labelKey: 'ar.cat.new' },
  { id: 'cute', labelKey: 'ar.cat.cute' },
  { id: 'couple', labelKey: 'ar.cat.couple' },
  { id: 'travel', labelKey: 'ar.cat.travel' },
  { id: 'season', labelKey: 'ar.cat.season' },
  { id: 'fun', labelKey: 'ar.cat.fun' },
  { id: 'mood', labelKey: 'ar.cat.mood' },
];

/** Face-shape warp an effect adds on top of the beauty sliders (same units as BeautyValues). */
export type ArWarp = Partial<Record<BeautyKey, number>>;

export type ArEffectV2 = {
  id: string;
  labelKey: string;
  thumb: ArSpriteId;
  category: ArCategory;
  trigger?: ArTrigger;
  /** draws without a face (full-frame particles, light, frames) */
  ambient?: boolean;
  warp?: ArWarp;
};

export const AR_EFFECTS_V2: ArEffectV2[] = [
  { id: 'fox', labelKey: 'ar.fox', thumb: 'fox_ears', category: 'cute' },
  { id: 'hamster', labelKey: 'ar.hamster', thumb: 'hamster_ears', category: 'cute', trigger: 'mouth' },
  { id: 'panda', labelKey: 'ar.panda', thumb: 'panda_ears', category: 'cute' },
  { id: 'koala', labelKey: 'ar.koala', thumb: 'koala_ears', category: 'cute' },
  { id: 'sheep', labelKey: 'ar.sheep', thumb: 'sheep_wool', category: 'cute' },
  { id: 'lion', labelKey: 'ar.lion', thumb: 'lion_mane', category: 'cute', trigger: 'mouth' },
  { id: 'chick', labelKey: 'ar.chick', thumb: 'chick_hat', category: 'cute' },
  { id: 'strawberry', labelKey: 'ar.strawberry', thumb: 'strawberry_hat', category: 'cute' },
  { id: 'peach', labelKey: 'ar.peach', thumb: 'peach_hat', category: 'cute' },

  { id: 'half_heart', labelKey: 'ar.halfHeart', thumb: 'love_heart', category: 'couple' },
  { id: 'boppers', labelKey: 'ar.boppers', thumb: 'heart_boppers', category: 'couple' },
  { id: 'cupid', labelKey: 'ar.cupid', thumb: 'cupid_heart', category: 'couple' },
  { id: 'love_frame', labelKey: 'ar.loveFrame', thumb: 'love_frame', category: 'couple' },
  { id: 'kiss', labelKey: 'ar.kiss', thumb: 'kiss_mark', category: 'couple', trigger: 'mouth' },
  { id: 'love_link', labelKey: 'ar.loveLink', thumb: 'th_link', category: 'couple' },

  { id: 'gat', labelKey: 'ar.gat', thumb: 'gat', category: 'travel' },
  { id: 'jeju', labelKey: 'ar.jeju', thumb: 'dolhareubang', category: 'travel' },
  { id: 'busan', labelKey: 'ar.busan', thumb: 'seagull', category: 'travel', ambient: true },
  { id: 'traveler', labelKey: 'ar.traveler', thumb: 'sun_hat', category: 'travel' },
  { id: 'airplane', labelKey: 'ar.airplane', thumb: 'p_plane', category: 'travel', ambient: true },
  { id: 'sakura', labelKey: 'ar.sakura', thumb: 'p_blossom', category: 'travel', ambient: true },
  { id: 'autumn', labelKey: 'ar.autumn', thumb: 'p_maple', category: 'travel', ambient: true },

  { id: 'santa', labelKey: 'ar.santa', thumb: 'santa_hat', category: 'season', ambient: true },
  { id: 'rudolph', labelKey: 'ar.rudolph', thumb: 'antlers', category: 'season' },
  { id: 'witch', labelKey: 'ar.witch', thumb: 'witch_hat', category: 'season', ambient: true },
  { id: 'pumpkin', labelKey: 'ar.pumpkin', thumb: 'pumpkin_hat', category: 'season', ambient: true },
  { id: 'birthday', labelKey: 'ar.birthday', thumb: 'cake_hat', category: 'season', ambient: true },
  { id: 'new_year', labelKey: 'ar.newYear', thumb: 'bok_pouch', category: 'season', ambient: true },

  { id: 'big_eyes', labelKey: 'ar.bigEyes', thumb: 'th_bigeyes', category: 'fun', warp: { eyes: 2.2, nose: 0.6 } },
  {
    id: 'tiny_face',
    labelKey: 'ar.tinyFace',
    thumb: 'th_tiny',
    category: 'fun',
    warp: { slim: 2.4, jaw: 2, chin: -1.4, eyes: 1.2, nose: 1, cheek: 1.4 },
  },
  {
    id: 'alien',
    labelKey: 'ar.alien',
    thumb: 'alien_antenna',
    category: 'fun',
    warp: { eyes: 2.5, slim: 2.6, jaw: 2.3, chin: 1.8, nose: 2 },
  },
  { id: 'sparkle_eyes', labelKey: 'ar.sparkleEyes', thumb: 'fx_twinkle', category: 'fun', trigger: 'smile' },
  { id: 'tears', labelKey: 'ar.tears', thumb: 'p_tear', category: 'fun' },
  { id: 'dizzy', labelKey: 'ar.dizzy', thumb: 'p_star', category: 'fun' },

  { id: 'light_leak', labelKey: 'ar.lightLeak', thumb: 'fx_leak_warm', category: 'mood', ambient: true },
  { id: 'retro_cam', labelKey: 'ar.retroCam', thumb: 'th_retro', category: 'mood', ambient: true },
  { id: 'bokeh_love', labelKey: 'ar.bokehLove', thumb: 'fx_bokeh_heart', category: 'mood', ambient: true },
  { id: 'rain_glass', labelKey: 'ar.rainGlass', thumb: 'th_rain', category: 'mood', ambient: true },
  { id: 'starry', labelKey: 'ar.starry', thumb: 'th_night', category: 'mood', ambient: true },
  { id: 'polaroid', labelKey: 'ar.polaroid', thumb: 'th_polaroid', category: 'mood', ambient: true },
  { id: 'filmstrip', labelKey: 'ar.filmstrip', thumb: 'th_film', category: 'mood', ambient: true },
  { id: 'lace', labelKey: 'ar.lace', thumb: 'th_lace', category: 'mood', ambient: true },
];

/** Picker category of each first-pack effect. */
export const AR_V1_CATEGORY: Record<string, ArCategory> = {
  bunny: 'cute',
  cat: 'cute',
  puppy: 'cute',
  bear: 'cute',
  ribbon: 'cute',
  pig: 'cute',
  blushy: 'cute',
  flower: 'cute',
  tiara: 'cute',
  heart_cheeks: 'couple',
  heart_glasses: 'couple',
  heart_rain: 'couple',
  party: 'season',
  devil: 'season',
  angel: 'season',
  snow: 'season',
  clown: 'fun',
  round_glasses: 'fun',
  sparkle: 'fun',
};

const V2 = new Map(AR_EFFECTS_V2.map((e) => [e.id, e]));

export const isArV2 = (id: string | null | undefined): boolean => !!id && V2.has(id);

/** Largest total per key that keeps the beauty warps fold-free (see warpFace in beauty-core). */
const WARP_LIMIT: Record<BeautyKey, number> = {
  smooth: 1,
  whiten: 1,
  tone: 1,
  clarity: 1,
  slim: 2.8,
  jaw: 2.5,
  chin: 2.3,
  eyes: 2.6,
  nose: 2.5,
  cheek: 3,
};

/** Beauty values with an effect's face warp added on top. */
export function addArWarp(beauty: BeautyValues, warp: ArWarp | undefined): BeautyValues {
  if (!warp) return beauty;
  const out = { ...beauty };
  for (const [k, v] of Object.entries(warp) as [BeautyKey, number][]) {
    const lim = WARP_LIMIT[k];
    out[k] = Math.max(-lim, Math.min(lim, out[k] + v));
  }
  return out;
}

// ---- full-frame helpers ------------------------------------------------------------

export const unitOf = (frame: ArFrame) => Math.min(frame.width, frame.height);

export function stretch(ops: ArOp[], sprite: ArSpriteId, x: number, y: number, w: number, h: number, alpha = 1, rot = 0) {
  if (alpha < 0.01 || w < 1 || h < 1) return;
  ops.push({ sprite, x, y, w, h, rot, alpha });
}

/** square-ish sprite of width `w` centered at (x, y) */
export function dot(ops: ArOp[], sprite: ArSpriteId, x: number, y: number, w: number, alpha = 1, rot = 0) {
  stretch(ops, sprite, x, y, w, w * aspect(sprite), alpha, rot);
}

export type DriftStyle = { sprites: ArSpriteId[]; count: number; size: number; speed: number; band: [number, number]; dir: 1 | -1; flap?: number };

/** fliers crossing the frame horizontally (gulls, bats, planes) */
export function drift(ops: ArOp[], frame: ArFrame, s: DriftStyle) {
  const { width, height, time } = frame;
  const unit = unitOf(frame);
  for (let i = 0; i < s.count; i += 1) {
    const sprite = s.sprites[i % s.sprites.length];
    const p = fract(rand(i, 21) + time * s.speed * (0.75 + rand(i, 22) * 0.5));
    const x = (s.dir > 0 ? p * 1.3 - 0.15 : 1.15 - p * 1.3) * width;
    const y = (s.band[0] + (s.band[1] - s.band[0]) * rand(i, 23)) * height + Math.sin(time * 1.8 + i * 2) * unit * 0.015;
    const w = unit * s.size * (0.7 + rand(i, 24) * 0.5);
    const flap = s.flap ? 1 - s.flap * (0.5 + 0.5 * Math.sin(time * 9 + i * 1.3)) : 1;
    stretch(ops, sprite, x, y, w, w * aspect(sprite) * flap, 0.95, Math.sin(time * 1.3 + i) * 0.12);
  }
}

/** soft shapes floating upward with a slow sway (bokeh) */
function rise(ops: ArOp[], frame: ArFrame, sprites: ArSpriteId[], count: number, size: [number, number], alpha: number) {
  const { width, height, time } = frame;
  const unit = unitOf(frame);
  for (let i = 0; i < count; i += 1) {
    const sprite = sprites[i % sprites.length];
    const p = fract(rand(i, 31) + time * 0.035 * (0.6 + rand(i, 32)));
    const y = (1.15 - p * 1.3) * height;
    const x = (rand(i, 33) + Math.sin(time * 0.5 + i * 1.7) * 0.03) * width;
    const w = unit * (size[0] + (size[1] - size[0]) * rand(i, 34));
    const fade = Math.min(1, p * 6, (1 - p) * 6);
    dot(ops, sprite, x, y, w, alpha * (0.55 + 0.45 * rand(i, 35)) * fade);
  }
}

/** bursts that bloom and fade at random spots in the upper part of the frame (fireworks) */
function bursts(ops: ArOp[], frame: ArFrame, sprites: ArSpriteId[], count: number, size: number) {
  const { width, height, time } = frame;
  const unit = unitOf(frame);
  const period = 2.4;
  for (let i = 0; i < count; i += 1) {
    const t = time / period + i / count;
    const cycle = Math.floor(t);
    const age = fract(t);
    const x = (0.08 + 0.84 * rand(cycle * 7 + i, 41)) * width;
    const y = (0.05 + 0.22 * rand(cycle * 7 + i, 42)) * height;
    const grow = 0.35 + 0.65 * Math.sqrt(Math.min(1, age * 2.2));
    const alpha = Math.min(1, age * 8) * (1 - age) * 1.2;
    dot(ops, sprites[(cycle + i) % sprites.length], x, y, unit * size * (0.75 + rand(cycle + i, 43) * 0.5) * grow, alpha, rand(i, 44) * 3);
  }
}

function twinkles(ops: ArOp[], frame: ArFrame, count: number, yMax: number, size: number) {
  const { width, height, time } = frame;
  const unit = unitOf(frame);
  for (let i = 0; i < count; i += 1) {
    const pulse = 0.5 + 0.5 * Math.sin(time * (1.5 + rand(i, 51) * 2.5) + i * 2.3);
    const x = rand(i, 52) * width;
    const y = Math.pow(rand(i, 53), 1.4) * yMax * height;
    dot(ops, 'fx_twinkle', x, y, unit * size * (0.4 + rand(i, 54) * 0.8) * (0.6 + 0.4 * pulse), 0.25 + 0.75 * pulse);
  }
}

export function vignette(ops: ArOp[], frame: ArFrame, alpha: number) {
  stretch(ops, 'fx_vignette', frame.width / 2, frame.height / 2, frame.width * 1.08, frame.height * 1.08, alpha);
}

/** zero-mean film grain, re-jittered about 12 times a second */
export function grain(ops: ArOp[], frame: ArFrame, alpha: number) {
  const tile = unitOf(frame) * 0.34;
  const k = Math.floor(frame.time * 12);
  const ox = rand(k, 61) * tile;
  const oy = rand(k, 62) * tile;
  for (let y = -oy; y < frame.height; y += tile) {
    for (let x = -ox; x < frame.width; x += tile) stretch(ops, 'fx_grain', x + tile / 2, y + tile / 2, tile + 0.5, tile + 0.5, alpha);
  }
}

const DIGITS: ArSpriteId[] = ['fx_d0', 'fx_d1', 'fx_d2', 'fx_d3', 'fx_d4', 'fx_d5', 'fx_d6', 'fx_d7', 'fx_d8', 'fx_d9'];

/** orange LED date like a 90s compact camera: 'YY MM DD, bottom right */
export function dateStamp(ops: ArOp[], frame: ArFrame, inset: number) {
  const unit = unitOf(frame);
  const h = unit * 0.052;
  const now = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const text = `'${two(now.getFullYear() % 100)} ${two(now.getMonth() + 1)} ${two(now.getDate())}`;
  const glyphs: (ArSpriteId | null)[] = [...text].map((ch) => (ch === "'" ? 'fx_dq' : ch === ' ' ? null : DIGITS[Number(ch)]));
  const widths = glyphs.map((g) => (g ? h / aspect(g) : h * 0.45));
  let x = frame.width - inset - widths.reduce((a, b) => a + b, 0);
  const y = frame.height - inset - h / 2;
  glyphs.forEach((g, i) => {
    if (g) stretch(ops, g, x + widths[i] / 2, y, widths[i], h, 0.95);
    x += widths[i];
  });
}

/** a band sprite repeated along all four edges, its top edge facing out */
function edgeBand(ops: ArOp[], frame: ArFrame, sprite: ArSpriteId, thickness: number) {
  const { width, height } = frame;
  const period = thickness / aspect(sprite);
  const nx = Math.max(1, Math.round(width / period));
  const ny = Math.max(1, Math.round(height / period));
  const lx = width / nx;
  const ly = height / ny;
  for (let i = 0; i < nx; i += 1) {
    stretch(ops, sprite, (i + 0.5) * lx, thickness / 2, lx + 0.5, thickness);
    stretch(ops, sprite, (i + 0.5) * lx, height - thickness / 2, lx + 0.5, thickness, 1, Math.PI);
  }
  for (let i = 0; i < ny; i += 1) {
    stretch(ops, sprite, thickness / 2, (i + 0.5) * ly, ly + 0.5, thickness, 1, -Math.PI / 2);
    stretch(ops, sprite, width - thickness / 2, (i + 0.5) * ly, ly + 0.5, thickness, 1, Math.PI / 2);
  }
}

function ambientOps(id: string, frame: ArFrame, ops: ArOp[]) {
  const { width: W, height: H, time } = frame;
  const unit = unitOf(frame);
  switch (id) {
    case 'busan':
      drift(ops, frame, { sprites: ['p_gull'], count: 3, size: 0.14, speed: 0.06, band: [0.05, 0.3], dir: -1, flap: 0.25 });
      break;
    case 'airplane':
      drift(ops, frame, { sprites: ['p_plane'], count: 2, size: 0.16, speed: 0.05, band: [0.06, 0.26], dir: 1 });
      fall(ops, frame, { sprites: ['p_stamp', 'p_stamp2'], count: 8, size: 0.12, speed: 0.05, spin: 0.5, alpha: 0.85 });
      break;
    case 'sakura':
      fall(ops, frame, { sprites: ['p_blossom', 'p_petal', 'p_petal'], count: 22, size: 0.06, speed: 0.1, spin: 1.2 });
      break;
    case 'autumn':
      fall(ops, frame, { sprites: ['p_maple', 'p_ginkgo'], count: 16, size: 0.075, speed: 0.085, spin: 1.6 });
      break;
    case 'santa':
      fall(ops, frame, { sprites: ['p_snow'], count: 16, size: 0.045, speed: 0.08, spin: 0.8, alpha: 0.85 });
      break;
    case 'witch':
      drift(ops, frame, { sprites: ['p_bat'], count: 4, size: 0.13, speed: 0.07, band: [0.04, 0.4], dir: 1, flap: 0.45 });
      break;
    case 'pumpkin':
      fall(ops, frame, { sprites: ['p_pumpkin', 'p_candy'], count: 10, size: 0.065, speed: 0.08, spin: 1.2 });
      break;
    case 'birthday':
      fall(ops, frame, { sprites: ['p_conf1', 'p_conf2', 'p_conf3', 'p_conf4'], count: 28, size: 0.032, speed: 0.14, spin: 3 });
      break;
    case 'new_year':
      bursts(ops, frame, ['p_firework', 'p_firework2'], 5, 0.3);
      twinkles(ops, frame, 8, 0.5, 0.05);
      break;
    case 'light_leak': {
      const s = Math.sin;
      dot(ops, 'fx_leak_warm', W * (0.02 + 0.08 * s(time * 0.4)), H * (0.14 + 0.05 * s(time * 0.3)), unit * 1.15, 0.78);
      dot(ops, 'fx_leak_pink', W * (1.04 - 0.05 * s(time * 0.35 + 1)), H * (0.94 + 0.03 * s(time * 0.25)), unit * 1.05, 0.55);
      dot(ops, 'fx_leak_warm', W * 0.92, H * (0.08 + 0.03 * s(time * 0.5 + 2)), unit * 0.55, 0.45);
      vignette(ops, frame, 0.18);
      break;
    }
    case 'retro_cam':
      grain(ops, frame, 0.55);
      vignette(ops, frame, 0.55);
      dot(ops, 'fx_leak_warm', W * 0.96, H * 0.04, unit * 0.7, 0.35);
      dateStamp(ops, frame, unit * 0.06);
      break;
    case 'bokeh_love':
      rise(ops, frame, ['fx_bokeh_heart', 'fx_bokeh', 'fx_bokeh_heart'], 22, [0.06, 0.15], 1);
      break;
    case 'rain_glass': {
      for (let i = 0; i < 40; i += 1) {
        const slide = Math.max(0, Math.sin(time * 0.4 + i * 3.1)) * 0.02 * rand(i, 71);
        const x = rand(i, 72) * W;
        const y = (rand(i, 73) + slide) * H;
        dot(ops, 'fx_drop', x, y, unit * (0.022 + 0.05 * Math.pow(rand(i, 74), 2)), 1);
      }
      for (let i = 0; i < 6; i += 1) {
        const p = fract(rand(i, 75) + time * 0.12 * (0.7 + rand(i, 76) * 0.6));
        const len = unit * (0.18 + rand(i, 77) * 0.12);
        stretch(ops, 'fx_streak', rand(i, 78) * W, -len + p * (H + len * 2), len * 0.15, len, Math.min(1, (1 - p) * 4));
      }
      vignette(ops, frame, 0.32);
      break;
    }
    case 'starry': {
      stretch(ops, 'fx_night', W / 2, H * 0.37, W + 2, H * 0.76);
      twinkles(ops, frame, 22, 0.55, 0.045);
      dot(ops, 'fx_moon', W * 0.82, H * 0.12, unit * 0.2, 0.95);
      const k = time / 4.5;
      const age = fract(k);
      if (age < 0.25) {
        const a = age / 0.25;
        const sx = (0.15 + 0.5 * rand(Math.floor(k), 81)) * W + a * unit * 0.45;
        const sy = (0.05 + 0.15 * rand(Math.floor(k), 82)) * H + a * unit * 0.22;
        stretch(ops, 'fx_shoot', sx, sy, unit * 0.32, unit * 0.05, Math.sin(a * Math.PI), 0.45);
      }
      break;
    }
    case 'polaroid': {
      const b = unit * 0.045;
      const B = unit * 0.17;
      stretch(ops, 'fx_paper', W / 2, b / 2, W + 1, b);
      stretch(ops, 'fx_paper', W / 2, H - B / 2, W + 1, B);
      stretch(ops, 'fx_paper', b / 2, H / 2, b, H + 1);
      stretch(ops, 'fx_paper', W - b / 2, H / 2, b, H + 1);
      dot(ops, 'p_heart', W - B * 0.95, H - B * 0.52, B * 0.3, 0.95, -0.2);
      dot(ops, 'p_heart', W - B * 0.62, H - B * 0.62, B * 0.2, 0.85, 0.25);
      dot(ops, 'p_sparkle', W - B * 1.25, H - B * 0.66, B * 0.18, 0.9);
      break;
    }
    case 'filmstrip': {
      const s = unit * 0.085;
      const n = Math.max(1, Math.round(H / s));
      const l = H / n;
      for (let i = 0; i < n; i += 1) {
        stretch(ops, 'fx_film', s / 2, (i + 0.5) * l, s, l + 0.5);
        stretch(ops, 'fx_film', W - s / 2, (i + 0.5) * l, s, l + 0.5);
      }
      grain(ops, frame, 0.3);
      vignette(ops, frame, 0.25);
      break;
    }
    case 'lace': {
      const t = unit * 0.05;
      edgeBand(ops, frame, 'fx_scallop', t);
      for (const [x, y] of [
        [t, t],
        [W - t, t],
        [t, H - t],
        [W - t, H - t],
      ] as const) {
        dot(ops, 'p_heart', x, y, t * 1.9, 1);
      }
      break;
    }
    default:
      break;
  }
}

// ---- per-face and paired layouts ----------------------------------------------------------

type Ctx = { time: number; index: number; count: number; outer: number; frame: ArFrame };

/** sides (in face-space dx sign) where a prop beside the head goes: away from the other faces */
function outerSides(c: Ctx): number[] {
  if (c.count <= 1) return [c.outer];
  if (c.index === 0) return [-1];
  if (c.index === c.count - 1) return [1];
  return [];
}

function faceOps(id: string, rig: Rig, c: Ctx) {
  const { f, eyeMid, headW, eyeDist } = rig;
  const { time } = c;
  const effect = V2.get(id);
  const level = triggerLevel(f, effect?.trigger);
  const bob = (speed: number, amp: number, phase = 0) => Math.sin(time * speed + phase + c.index * 1.3) * amp;
  switch (id) {
    case 'fox':
      rig.put('fox_ears', rig.crown(1.1), headW * 1.15, { pivot: 0.82 });
      rig.cheeks('blush', 0.6, 0.65);
      break;
    case 'hamster':
      rig.put('hamster_ears', rig.crown(1.2), headW * 1.08, { pivot: 0.78 });
      rig.cheeks('blush', 0.85, 0.9, -0.05, 0.02);
      rig.stream('p_heart', f.mouth, level, time, 6, 0.36, 1.1);
      break;
    case 'panda':
      rig.put('panda_ears', rig.crown(1.15), headW * 1.18, { pivot: 0.72 });
      rig.put('koala_nose', rig.at(f.nose, 0, 0.1), eyeDist * 0.42);
      rig.cheeks('blush', 0.55, 0.6);
      break;
    case 'koala':
      rig.put('koala_ears', rig.crown(0.95), headW * 1.5, { pivot: 0.55 });
      rig.put('koala_nose', rig.at(f.nose, 0, 0.12), eyeDist * 0.62);
      break;
    case 'sheep':
      rig.put('sheep_wool', rig.crown(1.05), headW * 1.25, { pivot: 0.33 });
      rig.cheeks('blush', 0.55, 0.6);
      break;
    case 'lion':
      rig.put('lion_mane', rig.at(f.center, 0, 0.2), headW * 2.05, { pivot: 0.46 });
      rig.put('cat_nose', rig.at(f.nose, 0, 0.06), eyeDist * 2.3, { pivot: 0.38 });
      rig.stream('p_star', f.mouth, level, time, 6, 0.36, 1.4);
      break;
    case 'chick':
      rig.put('chick_hat', rig.crown(1.3, 0.1), headW * 0.62, { pivot: 0.9, tilt: 0.05 + bob(2, 0.04) });
      rig.cheeks('blush', 0.58, 0.7);
      break;
    case 'strawberry':
      rig.put('strawberry_hat', rig.crown(1.25), headW * 0.8, { pivot: 0.8 });
      rig.cheeks('blush', 0.56, 0.6);
      break;
    case 'peach':
      rig.put('peach_hat', rig.crown(1.25), headW * 0.85, { pivot: 0.8 });
      rig.cheeks('blush', 0.62, 0.75);
      break;

    case 'boppers':
      rig.put('heart_boppers', rig.crown(1.5), headW * 1.0, { pivot: 0.45, tilt: bob(3.2, 0.06) });
      rig.cheeks('blush', 0.55, 0.55);
      break;
    case 'cupid': {
      const sides = c.count <= 1 ? [-1, 1] : outerSides(c);
      for (const s of sides) {
        const ww = eyeDist * 1.75;
        const hh = ww * aspect('wing_r');
        rig.put(s > 0 ? 'wing_r' : 'wing_l', rig.at(f.center, s * (1.15 + ww / eyeDist / 2), 0.45 + hh / eyeDist / 2), ww, {
          tilt: s * bob(5, 0.07),
          flat: true,
        });
      }
      break;
    }
    case 'kiss': {
      const cheek = c.count >= 2 && c.index % 2 === 1 ? f.leftCheek : f.rightCheek;
      const s = cheek === f.rightCheek ? 1 : -1;
      rig.put('kiss_mark', rig.at(cheek, -s * 0.05, 0.1), eyeDist * 0.68, { tilt: s * 0.35, alpha: 0.95 });
      rig.stream('p_heart', f.mouth, level, time, 8, 0.4, 1.3);
      break;
    }

    case 'gat':
      rig.put('gat', rig.crown(1.3), headW * 1.55, { pivot: 0.78 });
      break;
    case 'jeju':
      rig.put('hallabong_hat', rig.crown(1.2), headW * 0.82, { pivot: 0.8 });
      for (const s of outerSides(c)) {
        rig.put('dolhareubang', rig.at(f.center, s * 1.5, -1.75 + bob(2, 0.04)), eyeDist * 1.15, { flat: true, tilt: bob(1.6, 0.05) });
      }
      break;
    case 'busan':
      rig.put('seagull', rig.crown(1.42, 0.12), headW * 0.6, { pivot: 0.9, tilt: bob(1.7, 0.06) });
      break;
    case 'traveler':
      rig.put('sun_hat', rig.crown(1.25), headW * 1.55, { pivot: 0.75 });
      rig.put('sunglasses', rig.at(eyeMid, 0, 0.02), eyeDist * 2.5);
      break;
    case 'airplane':
      rig.cheeks('blush', 0.55, 0.5);
      break;
    case 'sakura':
      rig.put('p_blossom', rig.crown(1.05, -1.0), eyeDist * 0.55, { tilt: -0.3 });
      rig.put('p_blossom', rig.crown(1.28, -0.72), eyeDist * 0.42, { tilt: 0.4 });
      rig.put('p_blossom', rig.crown(0.82, -1.15), eyeDist * 0.36, { tilt: 0.1 });
      rig.cheeks('blush', 0.55, 0.55);
      break;
    case 'autumn':
      rig.put('p_maple', rig.crown(1.12, -0.95), eyeDist * 0.6, { tilt: -0.4 });
      rig.put('p_ginkgo', rig.crown(0.88, -1.18), eyeDist * 0.45, { tilt: 0.3 });
      break;

    case 'santa':
      rig.put('santa_hat', rig.crown(1.2), headW * 1.32, { pivot: 0.74 });
      rig.cheeks('blush', 0.55, 0.55);
      break;
    case 'rudolph':
      rig.put('antlers', rig.crown(1.2), headW * 1.25, { pivot: 0.9 });
      rig.put('clown_nose', rig.at(f.nose, 0, 0.1), eyeDist * 0.62);
      rig.cheeks('blush', 0.6, 0.65);
      break;
    case 'witch':
      rig.put('witch_hat', rig.crown(1.2), headW * 1.55, { pivot: 0.85, tilt: -0.05 });
      break;
    case 'pumpkin':
      rig.put('pumpkin_hat', rig.crown(1.3), headW * 0.85, { pivot: 0.82 });
      break;
    case 'birthday':
      rig.put('cake_hat', rig.crown(1.32, 0.15), headW * 0.62, { pivot: 0.92, tilt: 0.08 });
      for (const s of outerSides(c)) {
        rig.put('balloons', rig.at(f.center, s * 1.65, 1.35), eyeDist * 1.45, { flat: true, tilt: bob(1.5, 0.08) });
      }
      break;
    case 'new_year':
      for (const s of outerSides(c)) {
        rig.put('bok_pouch', rig.at(f.center, s * 1.45, -1.7 + bob(2.2, 0.05)), eyeDist * 1.0, { flat: true, tilt: bob(1.8, 0.08) });
      }
      rig.cheeks('blush', 0.55, 0.5);
      break;

    case 'big_eyes':
      for (const [eye, k] of [
        [f.leftEye, 0],
        [f.rightEye, 1],
      ] as const) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 3 + k * 1.7);
        rig.put('fx_twinkle', rig.at(eye, 0.22, 0.2), eyeDist * (0.22 + 0.08 * pulse), { flat: true, alpha: 0.5 + 0.5 * pulse });
      }
      break;
    case 'tiny_face':
      rig.cheeks('blush', 0.5, 0.6);
      break;
    case 'alien':
      rig.put('alien_antenna', rig.crown(1.5), headW * 0.95, { pivot: 0.42, tilt: bob(4, 0.05) });
      break;
    case 'sparkle_eyes':
      rig.cheeks('blush', 0.62, 0.7);
      for (const [eye, k] of [
        [f.leftEye, 0],
        [f.rightEye, 1],
      ] as const) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 4 + k * 2);
        rig.put('fx_twinkle', rig.at(eye, 0.14, 0.1), eyeDist * (0.26 + 0.1 * pulse), { flat: true, alpha: 0.6 + 0.4 * pulse });
        rig.stream('p_star', eye, level, time + k * 0.5, 4, 0.34, 0.8);
      }
      break;
    case 'tears':
      rig.cheeks('blush', 0.6, 0.6);
      for (const [eye, s] of [
        [f.leftEye, -1],
        [f.rightEye, 1],
      ] as const) {
        for (let k = 0; k < 5; k += 1) {
          const age = fract(time * 0.9 + k / 5 + (s > 0 ? 0.1 : 0));
          const fade = Math.min(1, age * 6) * (1 - age * age * age);
          rig.put('p_tear', rig.at(eye, s * (0.3 + age * 0.22), -0.12 - age * 1.35), eyeDist * (0.17 + age * 0.07), { flat: true, alpha: fade });
        }
      }
      break;
    case 'dizzy':
      rig.cheeks('blush', 0.55, 0.55);
      for (let k = 0; k < 5; k += 1) {
        const a = time * 2.2 + (k * Math.PI * 2) / 5;
        const depth = Math.sin(a);
        rig.put('p_star', rig.crown(1.3 + depth * 0.16, Math.cos(a) * 1.25), eyeDist * (0.3 + 0.1 * depth), {
          flat: true,
          alpha: 0.65 + 0.35 * depth,
          tilt: a,
        });
      }
      break;
    default:
      break;
  }
}

const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** effects that place things in relation to several faces at once */
function groupOps(id: string, rigs: Rig[], frame: ArFrame, ops: ArOp[]) {
  const { time } = frame;
  const n = rigs.length;
  switch (id) {
    case 'half_heart': {
      for (let i = 0; i < n; i += 2) {
        const a = rigs[i];
        const b = rigs[i + 1];
        if (!b) {
          // alone: the two halves keep finding each other above the head
          const gap = 0.03 + 0.12 * (0.5 + 0.5 * Math.sin(time * 2.6));
          const hw = a.eyeDist * 0.62;
          a.put('heart_half_l', a.crown(1.8, -0.31 - gap), hw, { flat: true });
          a.put('heart_half_r', a.crown(1.8, 0.31 + gap), hw, { flat: true });
          if (gap < 0.06) a.orbit('p_sparkle', 3, time, 0.3, 0.8);
          continue;
        }
        const hw = (a.eyeDist + b.eyeDist) * 0.38;
        const pa = a.crown(1.7, 1.0);
        const pb = b.crown(1.7, -1.0);
        a.put('heart_half_l', pa, hw, { flat: true, tilt: -0.1 });
        b.put('heart_half_r', pb, hw, { flat: true, tilt: 0.1 });
        const meet = Math.hypot(pa.x - pb.x, pa.y - pb.y) / (hw * 1.4);
        if (meet < 1) {
          const m = mid(pa, pb);
          for (let k = 0; k < 4; k += 1) {
            const ang = time * 1.5 + (k * Math.PI) / 2;
            dot(ops, 'p_sparkle', m.x + Math.cos(ang) * hw * 0.9, m.y + Math.sin(ang) * hw * 0.7, hw * 0.35, (1 - meet) * Math.min(a.alpha, b.alpha));
          }
        }
      }
      break;
    }
    case 'cupid': {
      if (n >= 2) {
        const [a, b] = rigs;
        const m = mid(a.at(a.eyeMid, 0, 0.7), b.at(b.eyeMid, 0, 0.7));
        const ed = (a.eyeDist + b.eyeDist) / 2;
        dot(ops, 'cupid_heart', m.x, m.y + Math.sin(time * 2.4) * ed * 0.08, ed * 1.65, Math.min(a.alpha, b.alpha), Math.sin(time * 1.6) * 0.08);
      } else if (n === 1) {
        const a = rigs[0];
        a.put('cupid_heart', a.crown(1.85 + Math.sin(time * 2.4) * 0.08, 0.2), a.eyeDist * 1.2, { flat: true, tilt: Math.sin(time * 1.6) * 0.08 });
      }
      break;
    }
    case 'love_frame': {
      if (!n) break;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      let roll = 0;
      let alpha = 1;
      for (const r of rigs) {
        for (const p of [r.crown(1.6), r.f.chin, r.at(r.f.center, -1.25, 0), r.at(r.f.center, 1.25, 0)]) {
          x0 = Math.min(x0, p.x);
          y0 = Math.min(y0, p.y);
          x1 = Math.max(x1, p.x);
          y1 = Math.max(y1, p.y);
        }
        roll += r.f.angle / n;
        alpha = Math.min(alpha, r.alpha);
      }
      const k = aspect('love_frame');
      const pulse = 1 + 0.02 * Math.sin(time * 2.2);
      // the heart's hollow is wide at the lobes and narrow at the tip: faces go in its upper part
      const w = Math.max((x1 - x0) / 0.6, (y1 - y0) / 0.52 / k) * pulse;
      dot(ops, 'love_frame', (x0 + x1) / 2, (y0 + y1) / 2 + w * k * 0.1, w, alpha, roll * 0.6);
      break;
    }
    case 'love_link': {
      if (n >= 2) {
        for (let i = 0; i + 1 < n; i += 1) {
          const a = rigs[i];
          const b = rigs[i + 1];
          const p0 = a.crown(1.7);
          const p1 = b.crown(1.7);
          const d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          const ctrl = { x: (p0.x + p1.x) / 2, y: Math.min(p0.y, p1.y) - d * 0.7 };
          const ed = (a.eyeDist + b.eyeDist) / 2;
          const K = 9;
          for (let k = 0; k < K; k += 1) {
            const t = (k + 0.5) / K;
            const u = 1 - t;
            const x = u * u * p0.x + 2 * u * t * ctrl.x + t * t * p1.x;
            const y = u * u * p0.y + 2 * u * t * ctrl.y + t * t * p1.y;
            const wave = 0.5 + 0.5 * Math.sin(time * 4 - k * 0.8);
            dot(ops, 'p_heart', x, y, ed * (0.34 + 0.18 * wave), Math.min(a.alpha, b.alpha) * (0.75 + 0.25 * wave), Math.sin(time * 2 + k) * 0.2);
          }
        }
        for (const r of rigs) r.cheeks('blush', 0.55, 0.55);
      } else if (n === 1) {
        rigs[0].orbit('p_heart', 6, time, 0.42);
        rigs[0].cheeks('blush', 0.55, 0.55);
      }
      break;
    }
    default:
      break;
  }
}

/** Every sprite for a second-pack effect, in draw order, in the frame's pixel space. */
export function layoutArEffectV2(effectId: string, frame: ArFrame): ArOp[] {
  if (!V2.has(effectId)) return [];
  const ops: ArOp[] = [];
  const live = frame.faces.filter((fc) => fc.presence > 0.01).sort((a, b) => a.face.center.x - b.face.center.x);
  const rigs = live.map((fc) => new Rig(fc, ops));
  // frames and atmosphere sit under the face props
  ambientOps(effectId, frame, ops);
  rigs.forEach((rig, index) =>
    faceOps(effectId, rig, {
      time: frame.time,
      index,
      count: rigs.length,
      outer: rig.eyeMid.x < frame.width / 2 ? -1 : 1,
      frame,
    }),
  );
  groupOps(effectId, rigs, frame, ops);
  return ops;
}
