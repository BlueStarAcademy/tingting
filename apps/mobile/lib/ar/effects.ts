import { AR_EFFECTS_V2, AR_V1_CATEGORY, isArV2, layoutArEffectV2, type ArCategory, type ArWarp } from './effects-v2';
import { Rig, fall, triggerLevel, type ArFrame, type ArOp, type ArTrigger } from './rig';
import { AR_SPRITES, type SpriteId } from './sprites';

export { triggerLevel, type ArFace, type ArFrame, type ArOp, type ArTrigger } from './rig';
export { AR_TABS, applyArWarp, type ArCategory } from './effects-v2';

export type ArEffect = {
  id: string;
  /** translation key for the picker label */
  labelKey: string;
  thumb: SpriteId;
  category: ArCategory;
  /** second sticker pack, listed under the "new" tab */
  isNew?: boolean;
  trigger?: ArTrigger;
  /** draws without a face (full-frame particles) */
  ambient?: boolean;
  /** face-shape warp added on top of the beauty sliders */
  warp?: ArWarp;
};

const AR_EFFECTS_V1: Omit<ArEffect, 'category'>[] = [
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

export const AR_EFFECTS: ArEffect[] = [
  ...AR_EFFECTS_V1.map((e) => ({ ...e, category: AR_V1_CATEGORY[e.id] ?? 'cute' })),
  ...AR_EFFECTS_V2.map((e) => ({ ...e, isNew: true })),
];

export function getArEffect(id: string | null | undefined): ArEffect | null {
  return (id && AR_EFFECTS.find((e) => e.id === id)) || null;
}

/** Effects listed under a picker tab ('new' = the second pack). */
export function arEffectsInTab(tab: ArCategory | 'new'): ArEffect[] {
  return AR_EFFECTS.filter((e) => (tab === 'new' ? e.isNew : e.category === tab));
}

/** Tab to open the picker on: the selected effect's category, else the new pack. */
export function arTabOf(id: string | null | undefined): ArCategory | 'new' {
  const effect = getArEffect(id);
  return !effect || effect.isNew ? 'new' : effect.category;
}

/** Live tracking only needs ML Kit classification for smile / blink triggers. */
export function arNeedsClassification(id: string | null | undefined): boolean {
  const t = getArEffect(id)?.trigger;
  return t === 'smile' || t === 'blink';
}

/** Seconds used for saved photos, so particles land in a natural-looking scatter. */
export const STILL_TIME = 2.6;

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
  if (isArV2(effectId)) return layoutArEffectV2(effectId as string, frame);
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
