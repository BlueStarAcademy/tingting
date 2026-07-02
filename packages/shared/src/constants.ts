export const TOTAL_REGIONS = 17;
export const FIRST_GROUP_FREE = true;
export const ADDITIONAL_GROUP_COST = 50;
export const DEMO_EMAIL = 'demo@tingting.app';
export const INITIAL_STARS = 100;
export const QUEST_REWARD_DEFAULT = 10;
export const GPS_QUEST_RADIUS_METERS = 200;
export const MAX_GROUP_SLOTS = 6;
export const MBTI_TEST_REWARD = 100;
export const NICKNAME_CHANGE_BASE_COST = 200;
export const NICKNAME_CHANGE_MAX_COST = 1000;
/** 그룹 기본 무료 구성원 수 (방장 포함) */
export const FREE_GROUP_MEMBER_COUNT = 2;
export const MAX_GROUP_MEMBER_SLOTS = 20;
/** 그룹 갤러리 기본 무료 슬롯 수 */
export const FREE_GALLERY_SLOTS = 10;
/** 갤러리 슬롯 추가 시 한 번에 해금되는 슬롯 수 */
export const GALLERY_SLOT_BATCH_SIZE = 10;
/** 갤러리 슬롯 10개 추가 비용 */
export const GALLERY_SLOT_BATCH_COST = 100;

/** 슬롯 2~6 해금 비용 (1번 슬롯 무료, unlockedSlotCount = 현재 해금된 슬롯 수) */
const GROUP_SLOT_UNLOCK_COSTS: Record<number, number> = {
  1: 100,
  2: 200,
  3: 400,
  4: 700,
  5: 1000,
};

export function getGroupSlotUnlockCost(unlockedSlotCount: number): number {
  return GROUP_SLOT_UNLOCK_COSTS[unlockedSlotCount] ?? 0;
}

/** 3번째 구성원 슬롯부터 해금 비용 (현재 해금된 슬롯 수 기준) */
export function getGroupMemberSlotUnlockCost(unlockedMemberSlots: number): number {
  if (unlockedMemberSlots < FREE_GROUP_MEMBER_COUNT) return 0;
  return ADDITIONAL_GROUP_COST + (unlockedMemberSlots - FREE_GROUP_MEMBER_COUNT) * 10;
}

/** @deprecated 슬롯 해금 방식으로 대체됨. getGroupMemberSlotUnlockCost 사용 */
export function getGroupMemberInviteCost(currentMemberCount: number): number {
  return getGroupMemberSlotUnlockCost(currentMemberCount);
}

/** 갤러리 슬롯 10개 추가 해금 비용 */
export function getGallerySlotUnlockCost(): number {
  return GALLERY_SLOT_BATCH_COST;
}

/** 그룹 대표역 퀘스트 클리어 보상 (갤러리 슬롯) */
export const GROUP_STATION_QUEST_GALLERY_REWARD = GALLERY_SLOT_BATCH_SIZE;

/** 대표역 퀘스트 현금 즉시 해금 가격 (원) */
export const GROUP_STATION_QUEST_SKIP_PRICE_KRW = 2900;

export const GROUP_STATION_QUEST_SKIP_PRODUCT_ID = 'gallery_quest_skip';

/** 닉네임 변경 비용 (이미 변경한 횟수 기준, 첫 변경 무료) */
export function getDisplayNameChangeCost(priorChangeCount: number): number {
  if (priorChangeCount <= 0) return 0;
  const cost = NICKNAME_CHANGE_BASE_COST * Math.pow(2, priorChangeCount - 1);
  return Math.min(cost, NICKNAME_CHANGE_MAX_COST);
}

export const SHOP_ITEMS = [
  { id: 'ai-bbosyap', name: '뽀샵', description: 'AI 밝기 보정 효과', cost: 20, type: 'ai_effect' as const },
  { id: 'ai-sky', name: '하늘리터치', description: 'AI 하늘 틴트 효과', cost: 25, type: 'ai_effect' as const },
  { id: 'boost-stars', name: '별 부스트', description: '퀘스트 보상 +5', cost: 30, type: 'boost' as const },
];

export const PLACE_CATEGORY_BY_MENU: Record<string, string[]> = {
  food: ['food', 'restaurant'],
  stay: ['stay', 'hotel'],
  play: ['beach', 'culture', 'activity', 'science', 'city'],
  sight: ['heritage', 'landmark', 'nature', 'mountain', 'sea', 'park'],
  event: ['event'],
};

export const AI_EFFECTS = {
  bbosyap: { id: 'bbosyap', label: '뽀샵', type: 'brightness' as const, value: 0.3 },
  sky: { id: 'sky', label: '하늘리터치', type: 'tint' as const, value: 0.2 },
};

/** 홈·추천 여행지에 노출할 대표 장소 ID (순서 유지) */
export const FEATURED_PLACE_IDS = [
  'p-bus-1',
  'p-seo-1',
  'p-jej-1',
  'p-ngb-1',
  'p-njb-1',
  'p-gwn-1',
  'p-sjb-1',
  'p-bus-2',
] as const;
