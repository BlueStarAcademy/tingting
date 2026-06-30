export const TOTAL_REGIONS = 17;
export const FIRST_GROUP_FREE = true;
export const ADDITIONAL_GROUP_COST = 50;
export const DEMO_EMAIL = 'demo@tingting.app';
export const INITIAL_STARS = 100;
export const QUEST_REWARD_DEFAULT = 10;
export const GPS_QUEST_RADIUS_METERS = 200;

export const SHOP_ITEMS = [
  { id: 'ai-bbosyap', name: '뽀샵', description: 'AI 밝기 보정 효과', cost: 20, type: 'ai_effect' as const },
  { id: 'ai-sky', name: '하늘리터치', description: 'AI 하늘 틴트 효과', cost: 25, type: 'ai_effect' as const },
  { id: 'boost-stars', name: '별 부스트', description: '퀘스트 보상 +5', cost: 30, type: 'boost' as const },
];

export const AI_EFFECTS = {
  bbosyap: { id: 'bbosyap', label: '뽀샵', type: 'brightness' as const, value: 0.3 },
  sky: { id: 'sky', label: '하늘리터치', type: 'tint' as const, value: 0.2 },
};
