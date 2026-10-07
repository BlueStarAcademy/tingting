/* eslint-disable @typescript-eslint/no-require-imports */
import { AR_SPRITES_V2 } from './sprites-v2';
import { AR_SPRITES_V3 } from './sprites-v3';

const AR_SPRITES_V1 = {
  bunny_ears: { src: require('../../assets/ar/bunny_ears.png'), w: 388, h: 318 },
  cat_ears: { src: require('../../assets/ar/cat_ears.png'), w: 416, h: 242 },
  bear_ears: { src: require('../../assets/ar/bear_ears.png'), w: 444, h: 203 },
  puppy_ear_l: { src: require('../../assets/ar/puppy_ear_l.png'), w: 160, h: 324 },
  puppy_ear_r: { src: require('../../assets/ar/puppy_ear_r.png'), w: 160, h: 325 },
  flower_crown: { src: require('../../assets/ar/flower_crown.png'), w: 471, h: 215 },
  tiara: { src: require('../../assets/ar/tiara.png'), w: 415, h: 257 },
  devil_horns: { src: require('../../assets/ar/devil_horns.png'), w: 364, h: 207 },
  halo: { src: require('../../assets/ar/halo.png'), w: 334, h: 162 },
  party_hat: { src: require('../../assets/ar/party_hat.png'), w: 284, h: 418 },
  bow: { src: require('../../assets/ar/bow.png'), w: 349, h: 336 },
  heart_glasses: { src: require('../../assets/ar/heart_glasses.png'), w: 452, h: 188 },
  round_glasses: { src: require('../../assets/ar/round_glasses.png'), w: 449, h: 198 },
  puppy_nose: { src: require('../../assets/ar/puppy_nose.png'), w: 260, h: 244 },
  puppy_tongue: { src: require('../../assets/ar/puppy_tongue.png'), w: 241, h: 268 },
  pig_nose: { src: require('../../assets/ar/pig_nose.png'), w: 291, h: 251 },
  clown_nose: { src: require('../../assets/ar/clown_nose.png'), w: 261, h: 263 },
  cat_nose: { src: require('../../assets/ar/cat_nose.png'), w: 402, h: 132 },
  blush: { src: require('../../assets/ar/blush.png'), w: 287, h: 206 },
  heart_sticker: { src: require('../../assets/ar/heart_sticker.png'), w: 285, h: 249 },
  freckles: { src: require('../../assets/ar/freckles.png'), w: 290, h: 198 },
  p_heart: { src: require('../../assets/ar/p_heart.png'), w: 160, h: 148 },
  p_sparkle: { src: require('../../assets/ar/p_sparkle.png'), w: 149, h: 160 },
  p_petal: { src: require('../../assets/ar/p_petal.png'), w: 160, h: 159 },
  p_snow: { src: require('../../assets/ar/p_snow.png'), w: 139, h: 160 },
} as const;

/** Transparent sticker art for the AR face effects, with pixel sizes for aspect ratios. */
export const AR_SPRITES = { ...AR_SPRITES_V1, ...AR_SPRITES_V2, ...AR_SPRITES_V3 };

export type SpriteId = keyof typeof AR_SPRITES;

export const SPRITE_IDS = Object.keys(AR_SPRITES) as SpriteId[];
