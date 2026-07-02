import type { EditorFeature } from './types';

export const EDITOR_FEATURES: EditorFeature[] = [
  // --- 무료 기본 ---
  {
    id: 'filter_natural',
    category: 'filter',
    name: { ko: '내추럴', en: 'Natural' },
    free: true,
    previewColor: '#94A3B8',
    effectKey: 'natural',
  },
  {
    id: 'filter_warm',
    category: 'filter',
    name: { ko: '따뜻함', en: 'Warm' },
    free: true,
    previewColor: '#F59E0B',
    effectKey: 'warm',
  },

  // --- 필터 ---
  {
    id: 'filter_cool',
    category: 'filter',
    name: { ko: '시원함', en: 'Cool' },
    previewColor: '#38BDF8',
    effectKey: 'cool',
  },
  {
    id: 'filter_vintage',
    category: 'filter',
    name: { ko: '빈티지', en: 'Vintage' },
    previewColor: '#A16207',
    effectKey: 'vintage',
  },
  {
    id: 'filter_film',
    category: 'filter',
    name: { ko: '필름', en: 'Film' },
    previewColor: '#78716C',
    effectKey: 'film',
  },
  {
    id: 'filter_jeju_sea',
    category: 'filter',
    name: { ko: '제주 바다', en: 'Jeju Sea' },
    previewColor: '#0EA5E9',
    effectKey: 'jeju_sea',
    regionCode: 'JEJ',
  },
  {
    id: 'filter_vivid',
    category: 'filter',
    name: { ko: '선명', en: 'Vivid' },
    previewColor: '#EC4899',
    effectKey: 'vivid',
  },
  {
    id: 'filter_mono',
    category: 'filter',
    name: { ko: '흑백', en: 'Mono' },
    previewColor: '#64748B',
    effectKey: 'mono',
  },
  {
    id: 'filter_sunset',
    category: 'filter',
    name: { ko: '노을', en: 'Sunset' },
    previewColor: '#F97316',
    effectKey: 'sunset',
  },

  // --- 스티커 ---
  {
    id: 'sticker_camera',
    category: 'sticker',
    name: { ko: '카메라', en: 'Camera' },
    emoji: '📷',
    free: true,
  },
  {
    id: 'sticker_pin',
    category: 'sticker',
    name: { ko: '핀', en: 'Pin' },
    emoji: '📍',
    free: true,
  },
  {
    id: 'sticker_plane',
    category: 'sticker',
    name: { ko: '비행기', en: 'Plane' },
    emoji: '✈️',
  },
  {
    id: 'sticker_sakura',
    category: 'sticker',
    name: { ko: '벚꽃', en: 'Sakura' },
    emoji: '🌸',
  },
  {
    id: 'sticker_hallasan',
    category: 'sticker',
    name: { ko: '한라산', en: 'Hallasan' },
    emoji: '🏔️',
    regionCode: 'JEJ',
  },
  {
    id: 'sticker_heart',
    category: 'sticker',
    name: { ko: '하트', en: 'Heart' },
    emoji: '❤️',
  },
  {
    id: 'sticker_star',
    category: 'sticker',
    name: { ko: '별', en: 'Star' },
    emoji: '⭐',
  },

  // --- 프레임 ---
  {
    id: 'frame_polaroid',
    category: 'frame',
    name: { ko: '폴라로이드', en: 'Polaroid' },
    free: true,
    effectKey: 'polaroid',
  },
  {
    id: 'frame_film',
    category: 'frame',
    name: { ko: '필름 테두리', en: 'Film border' },
    effectKey: 'film_frame',
  },
  {
    id: 'frame_seoul',
    category: 'frame',
    name: { ko: '서울 야경', en: 'Seoul night' },
    effectKey: 'seoul',
    regionCode: 'SEO',
  },
  {
    id: 'frame_round',
    category: 'frame',
    name: { ko: '원형', en: 'Round' },
    effectKey: 'round',
  },

  // --- AI 효과 ---
  {
    id: 'ai_bbosyap',
    category: 'ai',
    name: { ko: '뽀샵', en: 'Glow up' },
    description: { ko: '피부톤을 밝고 화사하게', en: 'Brightens skin tones' },
    effectKey: 'bbosyap',
  },
  {
    id: 'ai_sky',
    category: 'ai',
    name: { ko: '하늘리터치', en: 'Sky touch' },
    description: { ko: '하늘색을 선명하고 맑게', en: 'Enhances sky tones' },
    effectKey: 'sky',
  },
  {
    id: 'ai_portrait',
    category: 'ai',
    name: { ko: '인물 보정', en: 'Portrait' },
    description: { ko: '인물 중심 소프트 포커스', en: 'Soft portrait focus' },
    effectKey: 'portrait',
  },
  {
    id: 'ai_cinematic',
    category: 'ai',
    name: { ko: '시네마', en: 'Cinematic' },
    description: { ko: '영화 같은 색감과 비네팅', en: 'Cinematic color & vignette' },
    effectKey: 'cinematic',
  },
  {
    id: 'ai_travel_pop',
    category: 'ai',
    name: { ko: '여행 POP', en: 'Travel pop' },
    description: { ko: '여행 사진 색감 강화', en: 'Boosts travel photo colors' },
    effectKey: 'travel_pop',
  },
  {
    id: 'ai_night_fix',
    category: 'ai',
    name: { ko: '야경 보정', en: 'Night fix' },
    description: { ko: '어두운 사진 밝기 복원', en: 'Recovers dark photos' },
    effectKey: 'night_fix',
  },

  // --- 보정 도구 ---
  {
    id: 'adjust_rotate',
    category: 'adjust',
    name: { ko: '회전', en: 'Rotate' },
    effectKey: 'rotate',
  },
  {
    id: 'adjust_flip',
    category: 'adjust',
    name: { ko: '좌우 반전', en: 'Flip' },
    effectKey: 'flip',
  },
  {
    id: 'adjust_crop_square',
    category: 'adjust',
    name: { ko: '정사각 크롭', en: 'Square crop' },
    effectKey: 'crop_square',
  },

  // --- 이펙트 ---
  {
    id: 'effect_vignette',
    category: 'effect',
    name: { ko: '비네팅', en: 'Vignette' },
    effectKey: 'vignette',
  },
  {
    id: 'effect_grain',
    category: 'effect',
    name: { ko: '필름 그레인', en: 'Film grain' },
    effectKey: 'grain',
  },
  {
    id: 'watermark_remove',
    category: 'effect',
    name: { ko: '워터마크 제거', en: 'Remove watermark' },
    effectKey: 'watermark_remove',
  },
];

export function getEditorFeature(id: string): EditorFeature | undefined {
  return EDITOR_FEATURES.find((f) => f.id === id);
}

export function getEditorFeaturesByCategory(category: EditorFeature['category']): EditorFeature[] {
  return EDITOR_FEATURES.filter((f) => f.category === category);
}
