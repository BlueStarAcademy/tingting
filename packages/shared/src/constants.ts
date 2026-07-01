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

/** 3번째 구성원부터 초대 시 스타 비용 (현재 인원 기준) */
export function getGroupMemberInviteCost(currentMemberCount: number): number {
  if (currentMemberCount < FREE_GROUP_MEMBER_COUNT) return 0;
  return ADDITIONAL_GROUP_COST + (currentMemberCount - FREE_GROUP_MEMBER_COUNT) * 10;
}

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
  play: ['beach', 'culture', 'activity'],
  sight: ['heritage', 'landmark'],
  event: ['event'],
};

export const AI_EFFECTS = {
  bbosyap: { id: 'bbosyap', label: '뽀샵', type: 'brightness' as const, value: 0.3 },
  sky: { id: 'sky', label: '하늘리터치', type: 'tint' as const, value: 0.2 },
};
