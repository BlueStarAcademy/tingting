export type BeautyKey = 'smooth' | 'whiten' | 'clarity' | 'slim' | 'jaw' | 'eyes' | 'nose' | 'cheek';
export type BeautyValues = Record<BeautyKey, number>;

export type MakeupKey = 'blush' | 'lip' | 'eyeshadow' | 'eyeliner' | 'concealer' | 'highlight';
export type MakeupLayer = { amount: number; color: string };
export type MakeupValues = Record<MakeupKey, MakeupLayer>;

export type AdjustKey =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'warmth'
  | 'tint'
  | 'highlights'
  | 'shadows'
  | 'fade'
  | 'sharpen'
  | 'vignette'
  | 'grain';
export type AdjustValues = Record<AdjustKey, number>;

export type EffectKey = 'light_leak' | 'prism' | 'dust' | 'soft_blur' | 'spotlight' | 'sunflare';
export type EffectValues = Record<EffectKey, number>;

export type StickerItem = {
  id: string;
  kind: 'sticker';
  emoji: string;
  /** center, normalized to the photo area */
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type TextLook = 'plain' | 'shadow' | 'box' | 'neon';

export type TextItem = {
  id: string;
  kind: 'text';
  text: string;
  color: string;
  look: TextLook;
  bold: boolean;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type OverlayItem = StickerItem | TextItem;

export type BaseImage = { uri: string; width: number; height: number };

export type EditState = {
  base: BaseImage;
  filterId: string | null;
  filterIntensity: number;
  adjust: AdjustValues;
  beauty: BeautyValues;
  makeup: MakeupValues;
  effects: EffectValues;
  lensId: string | null;
  frameId: string | null;
  items: OverlayItem[];
};

export const BEAUTY_ITEMS: { key: BeautyKey; label: string; icon: string }[] = [
  { key: 'smooth', label: '피부 보정', icon: '🧴' },
  { key: 'whiten', label: '미백', icon: '🤍' },
  { key: 'clarity', label: '피부 선명', icon: '✨' },
  { key: 'slim', label: '얼굴 슬림', icon: '🪞' },
  { key: 'jaw', label: '턱선', icon: '📐' },
  { key: 'eyes', label: '눈 확대', icon: '👀' },
  { key: 'nose', label: '코 슬림', icon: '👃' },
  { key: 'cheek', label: '광대', icon: '😊' },
];

/** Beauty keys that need a detected face (skin tools also work without one). */
export const FACE_ONLY_BEAUTY: BeautyKey[] = ['slim', 'jaw', 'eyes', 'nose', 'cheek'];

export const MAKEUP_ITEMS: { key: MakeupKey; label: string; icon: string; palette: string[] }[] = [
  { key: 'blush', label: '블러셔', icon: '🌸', palette: ['#F58BA0', '#FF9E80', '#E86A92', '#F7A1C4', '#D9776B'] },
  { key: 'lip', label: '립', icon: '💋', palette: ['#D8344F', '#F0627A', '#B5213F', '#E8746A', '#C2185B', '#9E3B52'] },
  { key: 'eyeshadow', label: '아이섀도', icon: '👁️', palette: ['#C68B77', '#B08BD6', '#E3A36B', '#E58FA8', '#8C6A5D'] },
  { key: 'eyeliner', label: '아이라인', icon: '✒️', palette: ['#1A1414', '#4A2E26', '#2B2350'] },
  { key: 'concealer', label: '컨실러', icon: '🧴', palette: ['#F6E3CF', '#F3D9C2', '#FBEBDD'] },
  { key: 'highlight', label: '하이라이트', icon: '💫', palette: ['#FFF4E0', '#FFE9F0', '#FFF8D6'] },
];

export const ADJUST_ITEMS: { key: AdjustKey; label: string; icon: string; bipolar: boolean }[] = [
  { key: 'brightness', label: '밝기', icon: '☀️', bipolar: true },
  { key: 'contrast', label: '대비', icon: '◐', bipolar: true },
  { key: 'saturation', label: '채도', icon: '🌈', bipolar: true },
  { key: 'warmth', label: '색온도', icon: '🌡️', bipolar: true },
  { key: 'tint', label: '색조', icon: '🎨', bipolar: true },
  { key: 'highlights', label: '하이라이트', icon: '⬆️', bipolar: true },
  { key: 'shadows', label: '그림자', icon: '⬇️', bipolar: true },
  { key: 'fade', label: '페이드', icon: '◌', bipolar: false },
  { key: 'sharpen', label: '선명하게', icon: '🔍', bipolar: false },
  { key: 'vignette', label: '비네팅', icon: '◎', bipolar: false },
  { key: 'grain', label: '그레인', icon: '▪', bipolar: false },
];

export const EFFECT_ITEMS: { key: EffectKey; label: string; icon: string }[] = [
  { key: 'light_leak', label: '빛샘', icon: '🌤️' },
  { key: 'sunflare', label: '햇살 플레어', icon: '☀️' },
  { key: 'soft_blur', label: '뽀얀 글로우', icon: '💭' },
  { key: 'prism', label: '프리즘', icon: '🔮' },
  { key: 'dust', label: '필름 먼지', icon: '·' },
  { key: 'spotlight', label: '스포트라이트', icon: '🔦' },
];

export const EMPTY_BEAUTY: BeautyValues = {
  smooth: 0,
  whiten: 0,
  clarity: 0,
  slim: 0,
  jaw: 0,
  eyes: 0,
  nose: 0,
  cheek: 0,
};

export const BEAUTY_PRESETS: { id: string; label: string; values: BeautyValues }[] = [
  { id: 'none', label: '원본', values: EMPTY_BEAUTY },
  { id: 'natural', label: '내추럴', values: { smooth: 0.35, whiten: 0.15, clarity: 0.15, slim: 0.15, jaw: 0.1, eyes: 0.12, nose: 0.08, cheek: 0.05 } },
  { id: 'bright', label: '화사', values: { smooth: 0.5, whiten: 0.4, clarity: 0.1, slim: 0.22, jaw: 0.18, eyes: 0.18, nose: 0.12, cheek: 0.1 } },
  { id: 'pure', label: '청순', values: { smooth: 0.6, whiten: 0.3, clarity: 0.05, slim: 0.3, jaw: 0.25, eyes: 0.28, nose: 0.15, cheek: 0.15 } },
  { id: 'doll', label: '인형', values: { smooth: 0.75, whiten: 0.35, clarity: 0.1, slim: 0.45, jaw: 0.4, eyes: 0.45, nose: 0.3, cheek: 0.25 } },
  { id: 'boy', label: '남친', values: { smooth: 0.3, whiten: 0.05, clarity: 0.35, slim: 0.15, jaw: 0.2, eyes: 0.05, nose: 0.1, cheek: 0.1 } },
];

function emptyMakeup(): MakeupValues {
  const out = {} as MakeupValues;
  for (const item of MAKEUP_ITEMS) out[item.key] = { amount: 0, color: item.palette[0] };
  return out;
}

export const EMPTY_ADJUST: AdjustValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  fade: 0,
  sharpen: 0,
  vignette: 0,
  grain: 0,
};

export const EMPTY_EFFECTS: EffectValues = {
  light_leak: 0,
  prism: 0,
  dust: 0,
  soft_blur: 0,
  spotlight: 0,
  sunflare: 0,
};

export function createEditState(base: BaseImage): EditState {
  return {
    base,
    filterId: null,
    filterIntensity: 1,
    adjust: { ...EMPTY_ADJUST },
    beauty: { ...EMPTY_BEAUTY },
    makeup: emptyMakeup(),
    effects: { ...EMPTY_EFFECTS },
    lensId: null,
    frameId: null,
    items: [],
  };
}

const anyNonZero = (values: Record<string, number>) =>
  Object.values(values).some((v) => Math.abs(v) > 0.001);

export function hasEdits(state: EditState, originalBase: BaseImage): boolean {
  return (
    state.base.uri !== originalBase.uri ||
    (state.filterId !== null && state.filterIntensity > 0.001) ||
    anyNonZero(state.adjust) ||
    anyNonZero(state.beauty) ||
    Object.values(state.makeup).some((layer) => layer.amount > 0.001) ||
    anyNonZero(state.effects) ||
    state.lensId !== null ||
    state.frameId !== null ||
    state.items.length > 0
  );
}

export const newItemId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
