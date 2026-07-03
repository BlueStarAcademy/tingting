export interface GroupChatMessage {
  id: string;
  groupId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
  deletedAt?: string | null;
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
  /** 해금된 구성원 슬롯 수 (방장 포함, 기본 2) */
  unlockedMemberSlots?: number;
  /** 해금된 갤러리 슬롯 수 (레거시·스타 구매용, 지역별 슬롯은 퀘스트 완료로 해금) */
  unlockedGallerySlots?: number;
}

/** 그룹 여행 일정 (지역별) */
export interface GroupSchedule {
  id: string;
  groupId: string;
  regionCode: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  createdBy: string;
  createdAt: string;
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
  /** 추천 피드에 공개 여부 */
  isPublic?: boolean;
}

/** 다른 유저가 공개한 여행 체험 후기 */
export interface PublicExperiencePost {
  id: string;
  userId: string;
  displayName: string;
  userPhotoUri?: string;
  placeId: string;
  placeName: string;
  regionCode: string;
  photoUri: string;
  note?: string;
  visitedAt: string;
  recommendCount?: number;
}

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  stars: number;
  onboardingComplete: boolean;
  visitedRegions: string[];
  role?: UserRole;
  /** Convenience flag mirrored from role === 'admin' */
  isAdmin?: boolean;
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
  /** 전화번호 인증 완료 여부 */
  phoneVerified?: boolean;
  /** 전화번호 초대 검색 거부 */
  blockPhoneInvite?: boolean;
  /** 프로필 상세(생년월일·MBTI 등) 공개 여부 */
  profilePublic?: boolean;
}

export type MailboxMessageType = 'notice' | 'notification' | 'group_invite';

export type GroupInviteStatus = 'pending' | 'accepted' | 'declined';

export interface CustomerInquiry {
  id: string;
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  displayName: string;
  stars: number;
  role?: UserRole;
  createdAt?: string;
}

export interface MailboxMessage {
  id: string;
  userId: string;
  type: MailboxMessageType;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  groupId?: string;
  groupName?: string;
  inviterId?: string;
  inviterName?: string;
  inviteStatus?: GroupInviteStatus;
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
  /** stars(기본) | gallery_slots */
  rewardType?: 'stars' | 'gallery_slots';
  rewardGallerySlots?: number;
  /** 그룹 대표역 방문 퀘스트 */
  isStationQuest?: boolean;
  regionCode?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'ai_effect' | 'group_slot' | 'boost';
}

/** 사진 편집 기능 이용권 기간 */
export type FeaturePassTier = 'day1' | 'day7' | 'day30' | 'permanent';

export interface FeaturePass {
  featureId: string;
  tier: FeaturePassTier;
  purchasedAt: string;
  /** null = 영구 */
  expiresAt: string | null;
}

export type EditorFeatureCategory = 'filter' | 'sticker' | 'frame' | 'ai' | 'adjust' | 'effect';

export interface EditorFeature {
  id: string;
  category: EditorFeatureCategory;
  name: { ko: string; en: string };
  description?: { ko: string; en: string };
  free?: boolean;
  previewColor?: string;
  emoji?: string;
  regionCode?: string;
  /** photo-effects.ts 매핑 키 */
  effectKey?: string;
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
