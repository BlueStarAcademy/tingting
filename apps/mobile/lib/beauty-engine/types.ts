export type BeautyParamKey =
  | 'smooth'
  | 'whiten'
  | 'clarity'
  | 'slimFace'
  | 'jaw'
  | 'eyes'
  | 'nose'
  | 'cheek';

export type MakeupParamKey =
  | 'blush'
  | 'lip'
  | 'eyeshadow'
  | 'eyeliner'
  | 'concealer'
  | 'highlight';

export type BeautyParams = Record<BeautyParamKey, number>;
export type MakeupParams = Record<MakeupParamKey, number>;

export interface FaceLandmarkPoint {
  x: number;
  y: number;
}

/** Normalized 0..1 face geometry used by beauty/makeup/AR layers */
export interface FaceLandmarks {
  /** Bounding box center */
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  leftEye: FaceLandmarkPoint;
  rightEye: FaceLandmarkPoint;
  nose: FaceLandmarkPoint;
  mouth: FaceLandmarkPoint;
  chin: FaceLandmarkPoint;
  forehead: FaceLandmarkPoint;
  leftCheek: FaceLandmarkPoint;
  rightCheek: FaceLandmarkPoint;
  confidence: number;
}

export interface BeautyEngineState {
  filterEffectKey: string | null;
  beauty: BeautyParams;
  makeup: MakeupParams;
  lensId: string | null;
  face: FaceLandmarks | null;
  watermark: boolean;
}

export const DEFAULT_BEAUTY: BeautyParams = {
  smooth: 0,
  whiten: 0,
  clarity: 0,
  slimFace: 0,
  jaw: 0,
  eyes: 0,
  nose: 0,
  cheek: 0,
};

export const DEFAULT_MAKEUP: MakeupParams = {
  blush: 0,
  lip: 0,
  eyeshadow: 0,
  eyeliner: 0,
  concealer: 0,
  highlight: 0,
};

export const BEAUTY_KEY_BY_EFFECT: Record<string, BeautyParamKey> = {
  beauty_smooth: 'smooth',
  beauty_whiten: 'whiten',
  beauty_clarity: 'clarity',
  beauty_slim_face: 'slimFace',
  beauty_jaw: 'jaw',
  beauty_eyes: 'eyes',
  beauty_nose: 'nose',
  beauty_cheek: 'cheek',
  // AI stubs mapped into beauty presets
  bbosyap: 'smooth',
  portrait: 'whiten',
};

export const MAKEUP_KEY_BY_EFFECT: Record<string, MakeupParamKey> = {
  makeup_blush: 'blush',
  makeup_lip: 'lip',
  makeup_eyeshadow: 'eyeshadow',
  makeup_eyeliner: 'eyeliner',
  makeup_concealer: 'concealer',
  makeup_highlight: 'highlight',
};

export const AI_BEAUTY_PRESETS: Record<string, Partial<BeautyParams>> = {
  bbosyap: { smooth: 0.55, whiten: 0.35, clarity: 0.2 },
  portrait: { smooth: 0.4, whiten: 0.25, eyes: 0.15 },
  cinematic: { clarity: 0.2, slimFace: 0.1 },
  sky: { clarity: 0.3, whiten: 0.1 },
  night_fix: { whiten: 0.2, clarity: 0.25 },
  travel_pop: { clarity: 0.2 },
  food_pop: { clarity: 0.25 },
  dehaze: { clarity: 0.45 },
};
