export type EditorAssetType = 'filter' | 'sticker' | 'frame' | 'font' | 'template' | 'effect';

export interface EditorAsset {
  id: string;
  type: EditorAssetType;
  name: string;
  emoji?: string;
  starCost: number;
  free: boolean;
  regionCode?: string;
  previewColor?: string;
}

export const EDITOR_ASSETS: EditorAsset[] = [
  { id: 'filter_natural', type: 'filter', name: '내추럴', starCost: 0, free: true, previewColor: '#94A3B8' },
  { id: 'filter_warm', type: 'filter', name: '따뜻함', starCost: 0, free: true, previewColor: '#F59E0B' },
  { id: 'filter_cool', type: 'filter', name: '시원함', starCost: 0, free: true, previewColor: '#38BDF8' },
  { id: 'filter_vintage', type: 'filter', name: '빈티지', starCost: 20, free: false, previewColor: '#A16207' },
  { id: 'filter_film', type: 'filter', name: '필름', starCost: 25, free: false, previewColor: '#78716C' },
  { id: 'filter_jeju_sea', type: 'filter', name: '제주 바다', starCost: 20, free: false, regionCode: 'JEJ', previewColor: '#0EA5E9' },
  { id: 'sticker_camera', type: 'sticker', name: '카메라', emoji: '📷', starCost: 0, free: true },
  { id: 'sticker_pin', type: 'sticker', name: '핀', emoji: '📍', starCost: 0, free: true },
  { id: 'sticker_plane', type: 'sticker', name: '비행기', emoji: '✈️', starCost: 30, free: false },
  { id: 'sticker_sakura', type: 'sticker', name: '벚꽃', emoji: '🌸', starCost: 25, free: false },
  { id: 'sticker_hallasan', type: 'sticker', name: '한라산', emoji: '🏔️', starCost: 30, free: false, regionCode: 'JEJ' },
  { id: 'frame_polaroid', type: 'frame', name: '폴라로이드', starCost: 0, free: true },
  { id: 'frame_film', type: 'frame', name: '필름 테두리', starCost: 30, free: false },
  { id: 'frame_seoul', type: 'frame', name: '서울 야경', starCost: 35, free: false, regionCode: 'SEO' },
];

export function getAssetsByType(type: EditorAssetType): EditorAsset[] {
  return EDITOR_ASSETS.filter((a) => a.type === type);
}

export function getAsset(id: string): EditorAsset | undefined {
  return EDITOR_ASSETS.find((a) => a.id === id);
}

export function isAssetUnlocked(asset: EditorAsset, unlockedIds: string[]): boolean {
  return asset.free || unlockedIds.includes(asset.id);
}
