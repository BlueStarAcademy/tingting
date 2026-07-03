export const TOTAL_REGIONS = 17;
export const FIRST_GROUP_FREE = true;
export const ADDITIONAL_GROUP_COST = 50;
export const DEMO_EMAIL = 'demo@tingting.app';
/** 로컬 데모·개발용 전화 인증 OTP (실서비스에서는 서버 발급) */
export const DEMO_OTP = '123456';
export const INITIAL_STARS = 100;
export const QUEST_REWARD_DEFAULT = 10;
export const GPS_QUEST_RADIUS_METERS = 200;
/** 그룹 갤러리 오픈 퀘스트는 해당 지역 내 어디서든 GPS 인증 가능 (50km) */
export const GROUP_STATION_QUEST_RADIUS_METERS = 50_000;
export const MAX_GROUP_SLOTS = 6;
export const MBTI_TEST_REWARD = 100;
export const MINIGAME_DAILY_STAR_CAP = 30;
export const MINIGAME_MAX_STAGE = 10;
export const MINIGAME_FINAL_STAR_MIN = 1;
export const MINIGAME_FINAL_STAR_MAX = 5;

/** @deprecated 미니게임은 최종 스테이지(10) 클리어 시에만 1~5 랜덤 스타 지급 */
export const MINIGAME_STAGE_STAR_REWARD = 5;

/** 최종 스테이지 클리어 보상: 1~5 사이 랜덤 스타 */
export function rollMinigameFinalStarReward(): number {
  const span = MINIGAME_FINAL_STAR_MAX - MINIGAME_FINAL_STAR_MIN + 1;
  return MINIGAME_FINAL_STAR_MIN + Math.floor(Math.random() * span);
}
export const NICKNAME_CHANGE_BASE_COST = 200;
export const NICKNAME_CHANGE_MAX_COST = 1000;
/** 닉네임 변경 고정 비용 (첫 설정·첫 변경 제외) */
export const NICKNAME_CHANGE_COST = 100;
/** 그룹 기본 무료 구성원 수 (방장만) */
export const FREE_GROUP_MEMBER_COUNT = 1;
export const MAX_GROUP_MEMBER_SLOTS = 10;

/** 2번째 슬롯 50, 3번째 100, 4번째부터 200 (해금 대상 슬롯 번호 기준) */
export function getGroupMemberSlotUnlockCost(unlockedMemberSlots: number): number {
  if (unlockedMemberSlots >= MAX_GROUP_MEMBER_SLOTS) return 0;
  const nextSlotNumber = unlockedMemberSlots + 1;
  if (nextSlotNumber === 2) return 50;
  if (nextSlotNumber === 3) return 100;
  return 200;
}

/** @deprecated 슬롯 해금 방식으로 대체됨. getGroupMemberSlotUnlockCost 사용 */
export function getGroupMemberInviteCost(currentMemberCount: number): number {
  return getGroupMemberSlotUnlockCost(currentMemberCount);
}

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

/** 갤러리 슬롯 10개 추가 해금 비용 */
export function getGallerySlotUnlockCost(): number {
  return GALLERY_SLOT_BATCH_COST;
}

/** 그룹 대표역 퀘스트 클리어 보상 (갤러리 슬롯) */
export const GROUP_STATION_QUEST_GALLERY_REWARD = GALLERY_SLOT_BATCH_SIZE;

/** 대표역 퀘스트 현금 즉시 해금 가격 (원) */
export const GROUP_STATION_QUEST_SKIP_PRICE_KRW = 2900;

export const GROUP_STATION_QUEST_SKIP_PRODUCT_ID = 'gallery_quest_skip';

/** 그룹 지역 여행 진행도: 사진 포함 후기 1개당 5%, 20개면 100% */
export const GROUP_REGION_REVIEW_PROGRESS_PERCENT = 5;
export const GROUP_REGION_REVIEW_PROGRESS_TARGET = 20;

/** 지역별 활동 퀘스트 */
export const REGION_PHOTO_REVIEW_QUEST_TARGET = 3;
export const REGION_PHOTO_REVIEW_QUEST_REWARD = 20;
export const REGION_PUBLIC_REVIEW_QUEST_TARGET = 1;
export const REGION_PUBLIC_REVIEW_QUEST_REWARD = 30;

export type RegionActivityQuestKind = 'photo_reviews' | 'public_review';

export function buildRegionActivityQuestId(regionCode: string, kind: RegionActivityQuestKind): string {
  return `region-activity-${regionCode}-${kind}`;
}

/** 닉네임 변경 비용 (설정 모달 첫 저장은 무료, 이후 변경은 고정) */
export function getDisplayNameChangeCost(_priorChangeCount: number): number {
  return NICKNAME_CHANGE_COST;
}

import type { FeaturePassTier } from './types';

/** 사진 편집 기능 이용권 (기능별) */
export const FEATURE_PASS_COSTS: Record<FeaturePassTier, number> = {
  day1: 100,
  day7: 250,
  day30: 500,
  permanent: 1000,
};

export const FEATURE_PASS_DAYS: Record<FeaturePassTier, number | null> = {
  day1: 1,
  day7: 7,
  day30: 30,
  permanent: null,
};

export const FEATURE_PASS_TIERS: FeaturePassTier[] = ['day1', 'day7', 'day30', 'permanent'];

/** @deprecated 이용권(pass) 방식으로 대체됨 */
export const AI_FEATURE_COSTS: Record<string, number> = {
  bbosyap: 100,
  sky: 100,
};

/** @deprecated 아이템 상점 제거 */
export const SHOP_ITEMS: Array<{
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'ai_effect' | 'boost';
}> = [];

export const AI_EFFECTS = {
  bbosyap: { id: 'ai_bbosyap', label: '뽀샵', type: 'brightness' as const, value: 0.22 },
  sky: { id: 'ai_sky', label: '하늘리터치', type: 'tint' as const, value: 0.18 },
  portrait: { id: 'ai_portrait', label: '인물 보정', type: 'portrait' as const, value: 0.15 },
  cinematic: { id: 'ai_cinematic', label: '시네마', type: 'cinematic' as const, value: 0.2 },
  travel_pop: { id: 'ai_travel_pop', label: '여행 POP', type: 'vivid' as const, value: 0.25 },
  night_fix: { id: 'ai_night_fix', label: '야경 보정', type: 'brightness' as const, value: 0.35 },
};

export const PLACE_CATEGORY_BY_MENU: Record<string, string[]> = {
  food: ['food', 'restaurant'],
  stay: ['stay', 'hotel'],
  play: ['beach', 'culture', 'activity', 'science', 'city'],
  sight: ['heritage', 'landmark', 'nature', 'mountain', 'sea', 'park'],
  event: ['event'],
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

// ─── Schedule Stickers ───────────────────────────────────────
export interface ScheduleSticker {
  id: string;
  emoji: string;
  label: string;
  free: boolean;
}

export const SCHEDULE_STICKERS: ScheduleSticker[] = [
  { id: 'heart', emoji: '❤️', label: '하트', free: true },
  { id: 'star', emoji: '⭐', label: '별', free: false },
  { id: 'plane', emoji: '✈️', label: '비행기', free: false },
  { id: 'cake', emoji: '🎂', label: '케이크', free: false },
  { id: 'party', emoji: '🎉', label: '파티', free: false },
  { id: 'camera', emoji: '📷', label: '카메라', free: false },
  { id: 'food', emoji: '🍽️', label: '음식', free: false },
  { id: 'tent', emoji: '⛺', label: '캠핑', free: false },
];

export const DEFAULT_STICKER_ID = 'heart';

export interface StickerPackOption {
  id: string;
  count: number;
  starCost: number;
}

export const STICKER_PACK_OPTIONS: StickerPackOption[] = [
  { id: 'sticker_10', count: 10, starCost: 50 },
  { id: 'sticker_50', count: 50, starCost: 100 },
  { id: 'sticker_100', count: 100, starCost: 150 },
];

export function getStickerById(id: string): ScheduleSticker | undefined {
  return SCHEDULE_STICKERS.find((s) => s.id === id);
}

// ─── Region Star Quests ──────────────────────────────────────
export interface RegionQuestTemplate {
  /** quest id suffix (combined with region code) */
  idSuffix: string;
  titleTemplate: string;
  descTemplate: string;
  rewardStars: number;
}

export const REGION_QUEST_TEMPLATES: RegionQuestTemplate[] = [
  {
    idSuffix: 'food',
    titleTemplate: '{{region}} 맛집탐방',
    descTemplate: '{{region}} 지역 맛집에서 인증하기',
    rewardStars: 15,
  },
  {
    idSuffix: 'photo',
    titleTemplate: '{{region}} 포토스팟',
    descTemplate: '{{region}} 명소에서 사진 인증하기',
    rewardStars: 10,
  },
  {
    idSuffix: 'stay',
    titleTemplate: '{{region}} 숙박체험',
    descTemplate: '{{region}} 지역 숙소에서 인증하기',
    rewardStars: 20,
  },
  {
    idSuffix: 'culture',
    titleTemplate: '{{region}} 문화탐방',
    descTemplate: '{{region}} 문화시설/행사 방문 인증하기',
    rewardStars: 15,
  },
  {
    idSuffix: 'explore',
    titleTemplate: '{{region}} 자유탐색',
    descTemplate: '{{region}} 어디든 새로운 곳 방문 인증하기',
    rewardStars: 10,
  },
];

export function buildRegionQuestId(regionCode: string, suffix: string): string {
  return `region-quest-${regionCode}-${suffix}`;
}

export function renderQuestTemplate(template: string, regionName: string): string {
  return template.replace(/\{\{region\}\}/g, regionName);
}
