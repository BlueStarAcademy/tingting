export interface GroupChatMessage {
  id: string;
  groupId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

export type RegionMenuCategory = 'food' | 'stay' | 'play' | 'sight' | 'event';

export interface Region {
  code: string;
  name: string;
  nameEn: string;
  color: string;
}

export interface Place {
  id: string;
  regionCode: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  category: string;
  imageUrl?: string;
}

export interface GroupMember {
  id: string;
  displayName: string;
  phone?: string;
  photoUri?: string;
  isOwner?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  members?: GroupMember[];
  createdAt: string;
  slotIndex?: number;
}

export interface Visit {
  id: string;
  userId: string;
  placeId: string;
  groupId?: string;
  photoUri: string;
  editedPhotoUri?: string;
  note?: string;
  visitedAt: string;
  lat?: number;
  lng?: number;
  filter?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  stars: number;
  onboardingComplete: boolean;
  visitedRegions: string[];
  photoUri?: string;
  birthday?: string;
  mbti?: string;
  mbtiTestCompleted?: boolean;
  phone?: string;
  /** 닉네임 변경 횟수 (첫 변경 무료) */
  displayNameChangeCount?: number;
  /** 만보기 타임존 (IANA) */
  stepTimezone?: string;
  /** 타임존 변경 잠금 해제 시각 */
  stepTimezoneLockedUntil?: string;
  /** 해금된 여행 그룹 슬롯 수 (1~6, 첫 슬롯 기본 해금) */
  unlockedGroupSlots?: number;
}

export interface Quest {
  id: string;
  placeId: string;
  title: string;
  description: string;
  rewardStars: number;
  targetLat: number;
  targetLng: number;
  radiusMeters: number;
  completed?: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'ai_effect' | 'group_slot' | 'boost';
}

export interface PlaceRecommendation {
  id: string;
  placeId: string;
  userId: string;
  text: string;
  rating: number;
  createdAt: string;
}

export interface HomeDashboard {
  profile: UserProfile;
  groups: Group[];
  recentVisits: Visit[];
  regionProgress: { code: string; visited: boolean }[];
  totalRegions: number;
  visitedCount: number;
}

export interface PedometerDayState {
  dayKey: string;
  baselineSteps: number;
  dailySteps: number;
  rouletteUsed: number;
  claimedMilestones: number[];
}

export interface RankingEntry {
  id: string;
  displayName: string;
  value: number;
  rank: number;
}

export interface AuthSession {
  userId: string;
  email: string;
  isDemo: boolean;
}
