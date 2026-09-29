export type FrameKey =
  | 'white_clean'
  | 'polaroid'
  | 'film_frame'
  | 'black_matte'
  | 'round'
  | 'soft_shadow'
  | 'postcard'
  | 'stamp'
  | 'love'
  | 'neon_pink_frame'
  | 'sky_frame'
  | 'gold_frame'
  | 'seoul';

export const FRAMES: { id: FrameKey; label: string; swatch: string }[] = [
  { id: 'white_clean', label: '화이트', swatch: '#FFFFFF' },
  { id: 'polaroid', label: '폴라로이드', swatch: '#FFFDF7' },
  { id: 'film_frame', label: '필름', swatch: '#161312' },
  { id: 'black_matte', label: '블랙 매트', swatch: '#1B1B1B' },
  { id: 'round', label: '라운드', swatch: '#F7EEEE' },
  { id: 'soft_shadow', label: '소프트 섀도우', swatch: '#F3ECEA' },
  { id: 'postcard', label: '엽서', swatch: '#FAF4E8' },
  { id: 'stamp', label: '우표', swatch: '#FFFFFF' },
  { id: 'love', label: '러브', swatch: '#FFD6E0' },
  { id: 'neon_pink_frame', label: '네온 핑크', swatch: '#1A0B14' },
  { id: 'sky_frame', label: '스카이', swatch: '#BFE3FF' },
  { id: 'gold_frame', label: '골드', swatch: '#D4AF37' },
  { id: 'seoul', label: '나이트', swatch: '#141A3A' },
];

export type Rect = { x: number; y: number; width: number; height: number };

export type FrameLayout = {
  frame: FrameKey | null;
  width: number;
  height: number;
  content: Rect;
  radius: number;
};

type Pads = { top: number; right: number; bottom: number; left: number; radius?: number };

const PADS: Record<FrameKey, Pads> = {
  white_clean: { top: 0.04, right: 0.04, bottom: 0.04, left: 0.04 },
  polaroid: { top: 0.05, right: 0.05, bottom: 0.22, left: 0.05 },
  film_frame: { top: 0.1, right: 0.03, bottom: 0.1, left: 0.03 },
  black_matte: { top: 0.06, right: 0.06, bottom: 0.06, left: 0.06 },
  round: { top: 0.035, right: 0.035, bottom: 0.035, left: 0.035, radius: 0.06 },
  soft_shadow: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08, radius: 0.03 },
  postcard: { top: 0.06, right: 0.06, bottom: 0.14, left: 0.06 },
  stamp: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 },
  love: { top: 0.07, right: 0.07, bottom: 0.14, left: 0.07, radius: 0.025 },
  neon_pink_frame: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05, radius: 0.02 },
  sky_frame: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05, radius: 0.02 },
  gold_frame: { top: 0.045, right: 0.045, bottom: 0.045, left: 0.045 },
  seoul: { top: 0.045, right: 0.045, bottom: 0.15, left: 0.045 },
};

export function isFrameKey(id: string | null | undefined): id is FrameKey {
  return !!id && id in PADS;
}

/** Frames add a border around the photo, so the output grows instead of covering the picture. */
export function frameLayout(frameId: string | null, width: number, height: number): FrameLayout {
  if (!isFrameKey(frameId)) {
    return { frame: null, width, height, content: { x: 0, y: 0, width, height }, radius: 0 };
  }
  const unit = Math.min(width, height);
  const pads = PADS[frameId];
  const left = Math.round(unit * pads.left);
  const right = Math.round(unit * pads.right);
  const top = Math.round(unit * pads.top);
  const bottom = Math.round(unit * pads.bottom);
  return {
    frame: frameId,
    width: width + left + right,
    height: height + top + bottom,
    content: { x: left, y: top, width, height },
    radius: unit * (pads.radius ?? 0),
  };
}
