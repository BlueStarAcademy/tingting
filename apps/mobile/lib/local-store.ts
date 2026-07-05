import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MBTI_TEST_REWARD,
  MINIGAME_DAILY_STAR_CAP,
  MINIGAME_MAX_STAGE,
  rollMinigameFinalStarReward,
  DAILY_FREE_STARS,
  DAILY_FREE_STARS_BASIC,
  MINIGAME_CAP_AD_EXTENSION,
  QUEST_AD_BONUS_STARS,
  VISIT_AD_BONUS_STARS,
  REVIEW_AD_BONUS_STARS,
  BET_CLAIM_AD_BONUS_RATE,
  getGroupSlotUnlockCost,
  getGroupMemberSlotUnlockCost,
  getGallerySlotUnlockCost,
  getDisplayNameChangeCost,
  validateNickname,
  MAX_GROUP_SLOTS,
  MAX_GROUP_MEMBER_SLOTS,
  FREE_GROUP_MEMBER_COUNT,
  FREE_GALLERY_SLOTS,
  GALLERY_SLOT_BATCH_SIZE,
  QUEST_REWARD_DEFAULT,
  GPS_QUEST_RADIUS_METERS,
  GROUP_STATION_QUEST_RADIUS_METERS,
  INITIAL_STARS,
  DEMO_EMAIL,
  DEMO_OTP,
  buildFeaturePass,
  mergeFeaturePass,
  FEATURE_PASS_COSTS,
  FEATURE_PASS_TIERS,
  REGIONS,
  REGION_MAIN_STATIONS,
  buildGroupStationQuestId,
  GROUP_STATION_QUEST_GALLERY_REWARD,
  pickRecommendedPlaces,
  ADMIN_EMAIL,
  ADMIN_DISPLAY_NAME,
  ADMIN_SEED_PASSWORD,
  normalizeAdminLoginEmail,
  isAdminProfile,
  buildAdminFeaturePasses,
  SCHEDULE_STICKERS,
  STICKER_PACK_OPTIONS,
  REGION_QUEST_TEMPLATES,
  buildRegionQuestId,
  renderQuestTemplate,
  REGION_PHOTO_REVIEW_QUEST_TARGET,
  REGION_PHOTO_REVIEW_QUEST_REWARD,
  REGION_RECOMMENDED_VISIT_QUESTS,
  buildRegionActivityQuestId,
  buildRegionRecommendedVisitQuestId,
  findNearbyRecommendedPlace,
  findNearbyUnvisitedRecommendedPlace,
  sortGroupQuests,
  mergeRemoteGroupQuestState,
  sanitizeGroupQuests,
  type ShopSubscriptionPlanId,
} from '@tingting/shared';
import type {
  AdminUserSummary,
  AuthSession,
  CustomerInquiry,
  Group,
  GroupChatMessage,
  GroupMember,
  GroupSchedule,
  HomeDashboard,
  MailboxMessage,
  PedometerDayState,
  Place,
  PlaceRecommendation,
  Quest,
  RankingEntry,
  PublicExperiencePost,
  UserProfile,
  Visit,
  FeaturePass,
  FeaturePassTier,
} from '@tingting/shared';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import {
  getCurrentStage,
  MINIGAME_SINGLE_PLAY_STAGE,
  type MinigameId,
} from '@/lib/minigames/stages';
import {
  EMPTY_MINIGAME_PROGRESS,
  type MinigameDailyState,
  type MinigameProgress,
  getMinigameEffectiveCap,
} from '@/lib/minigames/progress';
import {
  DEFAULT_TIMEZONE,
  canChangeTimezone,
  getDayKey,
  getDayStartInTimezone,
  timezoneLockExpiry,
} from '@/lib/timezone';
import PLACES_JSON from '@/constants/places.json';
import { SEED_PUBLIC_EXPERIENCE_POSTS } from '@/lib/public-feed-seed';
import {
  buildMinigameBetPools,
  buildDailyBetQuestions,
  calculateMinigameBetPayout,
  canPlaceMinigameBet,
  getBetDayKey,
  getDemoWinningChoiceId,
  canSettleMinigameBet,
  MINIGAME_BET_MAX_STAKE,
  MINIGAME_BET_MIN_STAKE,
  type MinigameBetState,
  type MinigameBetTicket,
  type MinigameBetDailyState,
} from '@/lib/minigame-bets';
import {
  type SubscriptionState,
  buildSubscriptionDeliveryDayKeys,
  buildSubscriptionMail,
  getFirstDeliveryDayKey,
  isDeliveryDayDue,
  isMailboxUnread,
  isStarRewardClaimable,
  SUBSCRIPTION_TIMEZONE,
} from '@/lib/subscription';

const KEYS = {
  session: '@tingting/session',
  profile: '@tingting/profile',
  groups: '@tingting/groups',
  visits: '@tingting/visits',
  quests: '@tingting/quests',
  completedQuests: '@tingting/completedQuests',
  recommendations: '@tingting/recommendations',
  places: '@tingting/places',
  editorUnlocks: '@tingting/editorUnlocks',
  featurePasses: '@tingting/featurePasses',
  phoneDirectory: '@tingting/phoneDirectory',
  groupChats: '@tingting/groupChats',
  groupQuestCompletions: '@tingting/groupQuestCompletions',
  groupRecommendedPlaceVisits: '@tingting/groupRecommendedPlaceVisits',
  groupSchedules: '@tingting/groupSchedules',
  pedometer: '@tingting/pedometer',
  accountPassword: '@tingting/accountPassword',
  mailbox: '@tingting/mailbox',
  searchableUsers: '@tingting/searchableUsers',
  phoneVerification: '@tingting/phoneVerification',
  userProfiles: '@tingting/userProfiles',
  feedRecommendations: '@tingting/feedRecommendations',
  minigameProgress: '@tingting/minigame-progress',
  minigameDaily: '@tingting/minigame-daily',
  minigameBets: '@tingting/minigame-bets',
  minigameRewardBonus: '@tingting/minigame-reward-bonus',
  minigameBetDaily: '@tingting/minigame-bet-daily',
  dailyFreeStars: '@tingting/daily-free-stars',
  questAdBonus: '@tingting/quest-ad-bonus',
  visitReviewAdBonus: '@tingting/visit-review-ad-bonus',
  stepRouletteBonus: '@tingting/step-roulette-bonus',
  subscription: '@tingting/subscription',
};

interface FeedRecommendStore {
  counts: Record<string, number>;
  likes: Record<string, string[]>;
}

interface MinigameRewardBonus {
  dayKey: string;
  gameId: MinigameId;
  stage: number;
  baseReward: number;
  rerolled: boolean;
  doubled: boolean;
}

interface DailyFreeStarsState {
  dayKey: string;
  freeClaimed?: boolean;
  adClaimed?: boolean;
  /** @deprecated 이전 단일 클레임 플래그 */
  claimed?: boolean;
}

interface QuestAdBonusState {
  dayKey: string;
  questIds: string[];
}

interface VisitReviewAdBonusState {
  dayKey: string;
  visitClaimed: boolean;
  reviewClaimed: boolean;
}

interface StepRouletteBonusState {
  dayKey: string;
  rewards: Record<string, number>;
  doubledMilestones: number[];
}

function getBaseRecommendCount(postId: string): number {
  const seed = SEED_PUBLIC_EXPERIENCE_POSTS.find((post) => post.id === postId);
  return seed?.recommendCount ?? 0;
}

async function readFeedRecommendStore(): Promise<FeedRecommendStore> {
  return readJson<FeedRecommendStore>(KEYS.feedRecommendations, { counts: {}, likes: {} });
}

interface SearchableUser {
  userId: string;
  displayName: string;
  phone: string;
  phoneVerified: boolean;
  blockPhoneInvite: boolean;
  photoUri?: string;
}

interface PhoneVerificationPending {
  phone: string;
  code: string;
  expiresAt: string;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return 'local-' + Math.random().toString(36).slice(2, 11);
}

const DEFAULT_PLACES: Place[] = PLACES_JSON as Place[];

async function ensurePlaces(): Promise<Place[]> {
  let places = await readJson<Place[]>(KEYS.places, []);
  const defaultById = new Map(DEFAULT_PLACES.map((p) => [p.id, p]));

  if (places.length === 0) {
    places = DEFAULT_PLACES;
    await writeJson(KEYS.places, places);
    return places;
  }

  places = places.map((p) => {
    const latest = defaultById.get(p.id);
    if (!latest) return p;
    return {
      ...latest,
      ...p,
      name: latest.name,
      description: latest.description,
      category: latest.category,
      imageUrl: latest.imageUrl ?? p.imageUrl,
    };
  });

  for (const d of DEFAULT_PLACES) {
    if (!places.some((p) => p.id === d.id)) places.push(d);
  }

  return places;
}

function buildGroupStationQuests(
  visitedRegionCodes: Set<string>,
  completedIds: Set<string>
): Quest[] {
  return REGIONS.map((region) => {
    const station = REGION_MAIN_STATIONS.find((s) => s.regionCode === region.code)!;
    const questId = buildGroupStationQuestId(region.code);
    return {
      id: questId,
      placeId: station.placeId,
      title: `${region.name} 갤러리 오픈`,
      description: `${region.name} 지역 내에서 GPS 인증을 완료하면 갤러리가 열립니다.`,
      rewardStars: 0,
      rewardType: 'gallery_slots' as const,
      rewardGallerySlots: GROUP_STATION_QUEST_GALLERY_REWARD,
      targetLat: station.lat,
      targetLng: station.lng,
      radiusMeters: GROUP_STATION_QUEST_RADIUS_METERS,
      isStationQuest: true,
      regionCode: region.code,
      completed: completedIds.has(questId),
    };
  }).sort((a, b) => {
    const aVisited = visitedRegionCodes.has(a.regionCode!);
    const bVisited = visitedRegionCodes.has(b.regionCode!);
    if (aVisited !== bVisited) return aVisited ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.regionCode ?? '').localeCompare(b.regionCode ?? '');
  });
}

function buildRegionStarQuests(completedIds: Set<string>): Quest[] {
  const quests: Quest[] = [];
  for (const region of REGIONS) {
    const station = REGION_MAIN_STATIONS.find((s) => s.regionCode === region.code);
    if (!station) continue;
    for (const tmpl of REGION_QUEST_TEMPLATES) {
      const questId = buildRegionQuestId(region.code, tmpl.idSuffix);
      quests.push({
        id: questId,
        placeId: station.placeId,
        title: renderQuestTemplate(tmpl.titleTemplate, region.name),
        description: renderQuestTemplate(tmpl.descTemplate, region.name),
        rewardStars: tmpl.rewardStars,
        targetLat: station.lat,
        targetLng: station.lng,
        radiusMeters: GROUP_STATION_QUEST_RADIUS_METERS,
        regionCode: region.code,
        completed: completedIds.has(questId),
      });
    }
  }
  return quests;
}

function hasPhotoReview(visit: Visit): boolean {
  return Boolean((visit.editedPhotoUri ?? visit.photoUri) && visit.note?.trim());
}

function buildGroupActivityQuests(
  groupId: string,
  visits: Visit[],
  places: Place[],
  completedIds: Set<string>,
): Quest[] {
  return REGIONS.flatMap((region) => {
    const station = REGION_MAIN_STATIONS.find((s) => s.regionCode === region.code);
    if (!station) return [];
    const regionVisits = visits.filter((visit) => {
      if (visit.groupId !== groupId || !hasPhotoReview(visit)) return false;
      return places.find((p) => p.id === visit.placeId)?.regionCode === region.code;
    });
    const photoQuestId = buildRegionActivityQuestId(region.code, 'photo_reviews');
    return [
      {
        id: photoQuestId,
        placeId: station.placeId,
        title: `${region.name} 사진 후기 3개`,
        description: `${region.name} 여행 사진과 후기를 3개 남기면 10스타를 받습니다.`,
        rewardStars: REGION_PHOTO_REVIEW_QUEST_REWARD,
        targetLat: station.lat,
        targetLng: station.lng,
        radiusMeters: 0,
        regionCode: region.code,
        questKind: 'photo_reviews' as const,
        targetCount: REGION_PHOTO_REVIEW_QUEST_TARGET,
        progressCount: Math.min(regionVisits.length, REGION_PHOTO_REVIEW_QUEST_TARGET),
        completed: completedIds.has(photoQuestId),
      },
    ];
  });
}

type GroupRecommendedPlaceVisits = Record<string, Record<string, string[]>>;

async function readGroupRecommendedPlaceVisits(): Promise<GroupRecommendedPlaceVisits> {
  return readJson<GroupRecommendedPlaceVisits>(KEYS.groupRecommendedPlaceVisits, {});
}

async function getGroupRecommendedVisitCount(
  groupId: string,
  regionCode: string,
): Promise<{ count: number; visitedIds: Set<string> }> {
  const all = await readGroupRecommendedPlaceVisits();
  const visitedIds = new Set(all[groupId]?.[regionCode] ?? []);
  return { count: visitedIds.size, visitedIds };
}

function buildGroupRecommendedVisitQuests(
  groupId: string,
  places: Place[],
  completedIds: Set<string>,
  visitedByRegion: Map<string, Set<string>>,
): Quest[] {
  return REGIONS.flatMap((region) => {
    const station = REGION_MAIN_STATIONS.find((s) => s.regionCode === region.code);
    if (!station) return [];
    const visitedIds = visitedByRegion.get(region.code) ?? new Set<string>();
    const visitCount = visitedIds.size;
    return REGION_RECOMMENDED_VISIT_QUESTS.map(({ target, reward }) => {
      const questId = buildRegionRecommendedVisitQuestId(region.code, target);
      const title =
        target === 1
          ? `${region.name} 추천장소 방문`
          : `${region.name} 추천장소 ${target}개 방문`;
      const description =
        target === 1
          ? `${region.name} 추천 장소 어디서든 GPS 인증하기`
          : `${region.name} 추천 장소 ${target}곳에서 GPS 인증하기`;
      return {
        id: questId,
        placeId: station.placeId,
        title,
        description,
        rewardStars: reward,
        targetLat: station.lat,
        targetLng: station.lng,
        radiusMeters: 0,
        regionCode: region.code,
        questKind: 'recommended_visits' as const,
        targetCount: target,
        progressCount: Math.min(visitCount, target),
        completed: completedIds.has(questId),
      };
    });
  });
}

function buildQuests(places: Place[]): Quest[] {
  return places.slice(0, 8).map((p, i) => ({
    id: 'quest-' + p.id,
    placeId: p.id,
    title: p.name + ' 방문 퀘스트',
    description: p.name + ' 근처에서 GPS 인증을 완료하세요.',
    rewardStars: QUEST_REWARD_DEFAULT + (i % 3) * 5,
    targetLat: p.lat,
    targetLng: p.lng,
    radiusMeters: GPS_QUEST_RADIUS_METERS,
  }));
}

function normalizeProfile(profile: UserProfile, groups: Group[]): UserProfile {
  let unlocked = profile.unlockedGroupSlots ?? 1;
  if (isAdminProfile(profile)) {
    unlocked = MAX_GROUP_SLOTS;
  } else {
    unlocked = Math.max(1, Math.min(MAX_GROUP_SLOTS, unlocked));
    const ownedSlots = groups.filter((g) => g.ownerId === profile.id).map((g) => g.slotIndex ?? 0);
    const maxUsed = ownedSlots.length ? Math.max(...ownedSlots) + 1 : 1;
    unlocked = Math.max(unlocked, maxUsed);
  }
  return {
    ...profile,
    unlockedGroupSlots: unlocked,
    role: isAdminProfile(profile) ? 'admin' : profile.role,
    isAdmin: isAdminProfile(profile),
    mbtiTestCompleted: profile.mbtiTestCompleted ?? false,
    displayNameChangeCount: profile.displayNameChangeCount ?? 0,
    phoneVerified: profile.phoneVerified ?? false,
    blockPhoneInvite: profile.blockPhoneInvite ?? false,
    profilePublic: profile.profilePublic ?? true,
  };
}

async function readMailbox(): Promise<MailboxMessage[]> {
  return readJson<MailboxMessage[]>(KEYS.mailbox, []);
}

async function writeMailbox(messages: MailboxMessage[]): Promise<void> {
  await writeJson(KEYS.mailbox, messages);
}

async function readSearchableUsers(): Promise<SearchableUser[]> {
  return readJson<SearchableUser[]>(KEYS.searchableUsers, []);
}

async function syncSearchableUser(profile: UserProfile): Promise<void> {
  const users = await readSearchableUsers();
  const idx = users.findIndex((u) => u.userId === profile.id);
  if (!profile.phone || !profile.phoneVerified) {
    if (idx >= 0) {
      users.splice(idx, 1);
      await writeJson(KEYS.searchableUsers, users);
    }
    return;
  }
  const entry: SearchableUser = {
    userId: profile.id,
    displayName: profile.displayName,
    phone: normalizePhone(profile.phone),
    phoneVerified: true,
    blockPhoneInvite: profile.blockPhoneInvite ?? false,
    photoUri: profile.photoUri,
  };
  if (idx >= 0) users[idx] = entry;
  else users.push(entry);
  await writeJson(KEYS.searchableUsers, users);
}

async function ensureWelcomeMailbox(userId: string): Promise<void> {
  const all = await readMailbox();
  const welcomeId = `welcome-${userId}`;
  if (all.some((m) => m.id === welcomeId)) return;
  all.unshift({
    id: welcomeId,
    userId,
    type: 'notice',
    title: 'TingTing에 오신 것을 환영합니다',
    body: '전국 여행 기록, 그룹 여행, 퀘스트 등 다양한 기능을 이용해 보세요. 우편함에서 공지와 초대를 확인할 수 있습니다.',
    createdAt: new Date().toISOString(),
  });
  await writeMailbox(all);
}

function assertValidNickname(name: string): void {
  const err = validateNickname(name);
  if (err === 'empty') throw new Error('닉네임을 입력해 주세요');
  if (err === 'too_short') throw new Error('닉네임은 2자 이상 입력해 주세요');
  if (err === 'too_long') throw new Error('닉네임은 8자 이하로 입력해 주세요');
}

async function pushMailboxMessage(message: MailboxMessage): Promise<void> {
  const all = await readMailbox();
  all.unshift(message);
  await writeMailbox(all);
}

async function syncUserProfileRegistry(profile: UserProfile): Promise<void> {
  const all = await readJson<Record<string, UserProfile>>(KEYS.userProfiles, {});
  all[profile.id] = {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    stars: profile.stars,
    onboardingComplete: profile.onboardingComplete,
    visitedRegions: profile.visitedRegions,
    photoUri: profile.photoUri,
    birthday: profile.birthday,
    mbti: profile.mbti,
    mbtiTestCompleted: profile.mbtiTestCompleted,
    phone: profile.phoneVerified ? profile.phone : undefined,
    profilePublic: profile.profilePublic ?? true,
  };
  await writeJson(KEYS.userProfiles, all);
}

const DEMO_USER_PROFILES: Record<string, UserProfile> = {
  'user-kim': {
    id: 'user-kim',
    email: 'kim@demo.local',
    displayName: '김민수',
    stars: 120,
    onboardingComplete: true,
    visitedRegions: ['SEO', 'BUS'],
    mbti: 'ENFP',
    mbtiTestCompleted: true,
    birthday: '1994-07-12',
    phone: '01012345678',
    phoneVerified: true,
    profilePublic: true,
  },
  'user-lee': {
    id: 'user-lee',
    email: 'lee@demo.local',
    displayName: '이서연',
    stars: 85,
    onboardingComplete: true,
    visitedRegions: ['JEJ', 'GWN'],
    mbti: 'INTJ',
    mbtiTestCompleted: true,
    birthday: '1996-11-03',
    phone: '01098765432',
    phoneVerified: true,
    profilePublic: true,
  },
};

function sanitizePublicProfile(profile: UserProfile): UserProfile {
  if (profile.profilePublic !== false) return profile;
  return {
    ...profile,
    birthday: undefined,
    mbti: undefined,
    mbtiTestCompleted: false,
    email: '',
    phone: undefined,
    profilePublic: false,
  };
}

function normalizeGroup(group: Group): Group {
  const memberIds = group.memberIds ?? group.members?.map((member) => member.id) ?? [];
  const sharedGalleryUploaderId =
    group.sharedGalleryUploaderId && memberIds.includes(group.sharedGalleryUploaderId)
      ? group.sharedGalleryUploaderId
      : undefined;
  return {
    ...group,
    sharedGalleryUploaderId,
    unlockedMemberSlots: group.unlockedMemberSlots ?? FREE_GROUP_MEMBER_COUNT,
    unlockedGallerySlots: group.unlockedGallerySlots ?? 0,
  };
}

function migrateGroupMembers(group: Group, ownerProfile?: UserProfile | null): Group {
  group = normalizeGroup(group);
  if (group.members && group.members.length > 0) {
    return { ...group, memberIds: group.members.map((m) => m.id) };
  }
  const members: GroupMember[] = group.memberIds.map((id) => ({
    id,
    displayName: id === group.ownerId ? (ownerProfile?.displayName ?? '방장') : '멤버',
    phone: id === group.ownerId ? ownerProfile?.phone : undefined,
    photoUri: id === group.ownerId ? ownerProfile?.photoUri : undefined,
    isOwner: id === group.ownerId,
  }));
  return { ...group, members };
}

function migrateAllGroupMembers(groups: Group[], profile: UserProfile | null): Group[] {
  return groups.map((g) => migrateGroupMembers(g, g.ownerId === profile?.id ? profile : null));
}

function migrateGroupSlots(groups: Group[], userId: string): Group[] {
  const owned = groups.filter((g) => g.ownerId === userId);
  const needsMigration = owned.some((g) => g.slotIndex === undefined);
  if (!needsMigration) return groups;
  const used = new Set(owned.map((g) => g.slotIndex).filter((s) => s !== undefined));
  let next = 0;
  return groups.map((g) => {
    if (g.ownerId !== userId || g.slotIndex !== undefined) return g;
    while (used.has(next)) next++;
    used.add(next);
    return { ...g, slotIndex: next };
  });
}

export const localStore = {
  async getSession(): Promise<AuthSession | null> {
    return readJson<AuthSession | null>(KEYS.session, null);
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const normalizedEmail = normalizeAdminLoginEmail(email);
    if (normalizedEmail === ADMIN_EMAIL) {
      if (password !== ADMIN_SEED_PASSWORD) throw new Error('비밀번호가 올바르지 않습니다');
      const session: AuthSession = { userId: 'tingadmin-user', email: ADMIN_EMAIL, isDemo: false };
      const profile: UserProfile = {
        id: session.userId,
        email: ADMIN_EMAIL,
        displayName: ADMIN_DISPLAY_NAME,
        stars: 999999,
        onboardingComplete: true,
        visitedRegions: REGIONS.map((region) => region.code),
        role: 'admin',
        isAdmin: true,
        unlockedGroupSlots: MAX_GROUP_SLOTS,
        mbtiTestCompleted: true,
        phoneVerified: true,
      };
      await writeJson(KEYS.session, session);
      await writeJson(KEYS.profile, profile);
      await writeJson(KEYS.accountPassword, ADMIN_SEED_PASSWORD);
      return session;
    }

    const existing = await readJson<UserProfile | null>(KEYS.profile, null);
    if (existing && existing.email === normalizedEmail) {
      const session: AuthSession = { userId: existing.id, email: normalizedEmail, isDemo: false };
      await writeJson(KEYS.session, session);
      return session;
    }

    const session: AuthSession = { userId: uid(), email: normalizedEmail, isDemo: false };
    await writeJson(KEYS.session, session);
    let profile = existing;
    if (!profile) {
      profile = {
        id: session.userId,
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        stars: INITIAL_STARS,
        onboardingComplete: false,
        visitedRegions: [],
      };
      await writeJson(KEYS.profile, profile);
    }
    return session;
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthSession> {
    const trimmed = displayName.trim();
    const session: AuthSession = { userId: uid(), email, isDemo: false };
    const profile: UserProfile = {
      id: session.userId,
      email,
      displayName: trimmed,
      stars: INITIAL_STARS,
      onboardingComplete: false,
      visitedRegions: [],
    };
    await writeJson(KEYS.session, session);
    await writeJson(KEYS.profile, profile);
    await writeJson(KEYS.accountPassword, password);
    return session;
  },

  async signInDemo(): Promise<AuthSession> {
    const session: AuthSession = { userId: 'demo-user', email: DEMO_EMAIL, isDemo: true };
    const profile: UserProfile = {
      id: session.userId,
      email: DEMO_EMAIL,
      displayName: '데모 여행자',
      stars: INITIAL_STARS,
      onboardingComplete: true,
      visitedRegions: ['SEO', 'BUS', 'JEJ'],
    };
    await writeJson(KEYS.session, session);
    await writeJson(KEYS.profile, profile);
    await writeJson(KEYS.phoneDirectory, [
      { id: 'user-kim', displayName: '김민수', phone: '01012345678' },
      { id: 'user-lee', displayName: '이서연', phone: '01098765432' },
    ]);
    await writeJson(KEYS.searchableUsers, [
      {
        userId: 'user-kim',
        displayName: '김민수',
        phone: '01012345678',
        phoneVerified: true,
        blockPhoneInvite: false,
      },
      {
        userId: 'user-lee',
        displayName: '이서연',
        phone: '01098765432',
        phoneVerified: true,
        blockPhoneInvite: false,
      },
    ]);
    await writeJson(KEYS.userProfiles, DEMO_USER_PROFILES);
    await ensureWelcomeMailbox(session.userId);
    return session;
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.session);
  },

  async getProfile(): Promise<UserProfile | null> {
    let profile = await readJson<UserProfile | null>(KEYS.profile, null);
    if (!profile) return null;
    if (profile.displayName === 'Demo Traveler') {
      profile = { ...profile, displayName: '데모 여행자' };
    }
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const migrated = migrateGroupSlots(groups, profile.id);
    if (JSON.stringify(migrated) !== JSON.stringify(groups)) {
      await writeJson(KEYS.groups, migrated);
    }
    const normalized = normalizeProfile(profile, migrated.filter((g) => g.ownerId === profile!.id));
    const needsSave =
      normalized.unlockedGroupSlots !== profile.unlockedGroupSlots ||
      normalized.displayName !== profile.displayName ||
      normalized.phoneVerified !== profile.phoneVerified ||
      normalized.blockPhoneInvite !== profile.blockPhoneInvite ||
      normalized.profilePublic !== profile.profilePublic;
    if (needsSave) {
      await writeJson(KEYS.profile, normalized);
      profile = normalized;
    } else {
      profile = normalized;
    }
    await ensureWelcomeMailbox(profile.id);
    await syncUserProfileRegistry(profile);
    return profile;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const profile = await this.getProfile();
    if (profile?.id === userId) return profile;

    const all = await readJson<Record<string, UserProfile>>(KEYS.userProfiles, {});
    const found = all[userId] ?? DEMO_USER_PROFILES[userId] ?? null;
    return found ? sanitizePublicProfile(found) : null;
  },

  async updateProfile(
    patch: Partial<Pick<UserProfile, 'photoUri' | 'birthday' | 'profilePublic'>>
  ): Promise<UserProfile> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const updated = { ...profile, ...patch };
    await writeJson(KEYS.profile, updated);
    await syncUserProfileRegistry(updated);
    return updated;
  },

  async changeDisplayName(displayName: string): Promise<{ profile: UserProfile; cost: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const trimmed = displayName.trim();
    assertValidNickname(trimmed);
    if (trimmed === profile.displayName) {
      return { profile, cost: 0 };
    }

    const priorCount = profile.displayNameChangeCount ?? 0;
    const cost = getDisplayNameChangeCost(priorCount);
    if (cost > 0 && profile.stars < cost) throw new Error('스타가 부족합니다');

    const updated: UserProfile = {
      ...profile,
      displayName: trimmed,
      displayNameChangeCount: priorCount + 1,
      stars: profile.stars - cost,
    };
    await writeJson(KEYS.profile, updated);

    const groups = await readJson<Group[]>(KEYS.groups, []);
    const synced = groups.map((g) => {
      if (g.ownerId !== profile.id) return g;
      const members = g.members?.map((m) => (m.isOwner ? { ...m, displayName: trimmed } : m));
      return members ? { ...g, members } : g;
    });
    await writeJson(KEYS.groups, synced);
    await syncUserProfileRegistry(updated);

    return { profile: updated, cost };
  },

  async unlockGroupSlot(): Promise<UserProfile> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');
    const unlocked = profile.unlockedGroupSlots ?? 1;
    if (unlocked >= MAX_GROUP_SLOTS) throw new Error('모든 슬롯이 해금되었습니다');
    const cost = getGroupSlotUnlockCost(unlocked);
    if (!isAdminProfile(profile) && profile.stars < cost) throw new Error('스타가 부족합니다');
    const updated = {
      ...profile,
      stars: isAdminProfile(profile) ? profile.stars : profile.stars - cost,
      unlockedGroupSlots: unlocked + 1,
    };
    await writeJson(KEYS.profile, updated);
    return updated;
  },

  async completeMbtiTest(mbti: string): Promise<{ profile: UserProfile; reward: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    if (profile.mbtiTestCompleted) throw new Error('이미 MBTI 검사를 완료했습니다');
    const updated: UserProfile = {
      ...profile,
      mbti,
      mbtiTestCompleted: true,
      stars: profile.stars + MBTI_TEST_REWARD,
    };
    await writeJson(KEYS.profile, updated);
    return { profile: updated, reward: MBTI_TEST_REWARD };
  },

  async retakeMbtiTest(mbti: string): Promise<UserProfile> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const updated: UserProfile = { ...profile, mbti, mbtiTestCompleted: true };
    await writeJson(KEYS.profile, updated);
    return updated;
  },

  async completeOnboarding(displayName: string): Promise<UserProfile> {
    const profile = await readJson<UserProfile | null>(KEYS.profile, null);
    if (!profile) throw new Error('프로필을 찾을 수 없습니다');
    const trimmed = displayName.trim();
    assertValidNickname(trimmed);
    const updated = { ...profile, displayName: trimmed, onboardingComplete: true };
    await writeJson(KEYS.profile, updated);
    return updated;
  },

  async getHomeDashboard(): Promise<HomeDashboard> {
    const raw = (await readJson<UserProfile | null>(KEYS.profile, null))!;
    let groups = await readJson<Group[]>(KEYS.groups, []);
    groups = migrateGroupSlots(groups, raw.id);
    groups = migrateAllGroupMembers(groups, raw);
    await writeJson(KEYS.groups, groups);
    const profile = normalizeProfile(raw, groups.filter((g) => g.ownerId === raw.id));
    if (profile.unlockedGroupSlots !== raw.unlockedGroupSlots) {
      await writeJson(KEYS.profile, profile);
    }
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const visitedSet = new Set(profile.visitedRegions);
    return {
      profile,
      groups: groups.filter((g) => g.ownerId === profile.id),
      recentVisits: visits.slice(0, 6),
      regionProgress: REGIONS.map((r) => ({ code: r.code, visited: visitedSet.has(r.code) })),
      totalRegions: REGIONS.length,
      visitedCount: profile.visitedRegions.length,
    };
  },

  async getGroups(): Promise<Group[]> {
    return readJson<Group[]>(KEYS.groups, []);
  },

  async createGroup(name: string, description?: string, slotIndex?: number): Promise<{ group: Group; cost: number }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const owned = groups.filter((g) => g.ownerId === session.userId);
    const unlocked = profile.unlockedGroupSlots ?? 1;

    let targetSlot = slotIndex;
    if (targetSlot === undefined) {
      const used = new Set(owned.map((g) => g.slotIndex ?? 0));
      targetSlot = 0;
      while (used.has(targetSlot) && targetSlot < unlocked) targetSlot++;
    }
    if (targetSlot >= unlocked) throw new Error('슬롯이 잠겨 있습니다');
    if (owned.some((g) => (g.slotIndex ?? 0) === targetSlot)) throw new Error('이 슬롯에 이미 그룹이 있습니다');

    const group: Group = {
      id: uid(),
      name,
      description,
      ownerId: session.userId,
      memberIds: [session.userId],
      members: [
        {
          id: session.userId,
          displayName: profile.displayName,
          phone: profile.phone,
          photoUri: profile.photoUri,
          isOwner: true,
        },
      ],
      createdAt: new Date().toISOString(),
      slotIndex: targetSlot,
      unlockedMemberSlots: FREE_GROUP_MEMBER_COUNT,
      unlockedGallerySlots: 0,
    };
    groups.unshift(group);
    await writeJson(KEYS.groups, groups);
    return { group, cost: 0 };
  },

  async getGroup(id: string): Promise<Group | null> {
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const profile = await this.getProfile();
    const group = groups.find((g) => g.id === id) ?? null;
    if (!group) return null;
    const migrated = migrateGroupMembers(group, group.ownerId === profile?.id ? profile : null);
    const idx = groups.findIndex((g) => g.id === id);
    if (idx >= 0 && JSON.stringify(groups[idx]) !== JSON.stringify(migrated)) {
      groups[idx] = migrated;
      await writeJson(KEYS.groups, groups);
    }
    return migrated;
  },

  async inviteGroupMember(groupId: string, phone: string): Promise<{ cost: number }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) throw new Error('올바른 전화번호를 입력해 주세요');

    const target = await this.searchUserByPhone(normalized);
    if (!target) {
      throw new Error('전화번호 인증을 완료하고 초대를 허용한 사용자만 검색됩니다');
    }
    if (target.userId === session.userId) throw new Error('본인은 초대할 수 없습니다');

    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');

    const group = migrateGroupMembers(groups[idx], profile);
    if (group.ownerId !== session.userId) throw new Error('방장만 초대할 수 있습니다');

    const members = group.members ?? [];
    if (members.some((m) => m.id === target.userId || (m.phone && normalizePhone(m.phone) === normalized))) {
      throw new Error('이미 그룹 구성원이거나 초대된 번호입니다');
    }

    const mailbox = await readMailbox();
    const pending = mailbox.find(
      (m) =>
        m.userId === target.userId &&
        m.type === 'group_invite' &&
        m.groupId === groupId &&
        m.inviteStatus === 'pending'
    );
    if (pending) throw new Error('이미 초대장을 보냈습니다');

    const unlockedSlots = group.unlockedMemberSlots ?? FREE_GROUP_MEMBER_COUNT;
    if (members.length >= unlockedSlots) {
      throw new Error('구성원 슬롯이 가득 찼습니다. 슬롯을 먼저 해금해 주세요');
    }

    const inviteMessage: MailboxMessage = {
      id: uid(),
      userId: target.userId,
      type: 'group_invite',
      title: `${group.name} 그룹 초대`,
      body: `${profile.displayName}님이 "${group.name}" 그룹에 초대했습니다. 수락하시겠습니까?`,
      createdAt: new Date().toISOString(),
      groupId,
      groupName: group.name,
      inviterId: session.userId,
      inviterName: profile.displayName,
      inviteStatus: 'pending',
    };
    await pushMailboxMessage(inviteMessage);

    return { cost: 0 };
  },

  async searchUserByPhone(
    phone: string
  ): Promise<{ userId: string; displayName: string; phone: string; profile: UserProfile } | null> {
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) return null;
    const users = await readSearchableUsers();
    const found = users.find(
      (u) => u.phoneVerified && !u.blockPhoneInvite && normalizePhone(u.phone) === normalized
    );
    if (!found) throw new Error('USER_NOT_FOUND');

    const all = await readJson<Record<string, UserProfile>>(KEYS.userProfiles, {});
    const rawProfile = all[found.userId] ?? DEMO_USER_PROFILES[found.userId];
    if (!rawProfile || rawProfile.profilePublic === false) throw new Error('PROFILE_PRIVATE');

    const profile = await this.getUserProfile(found.userId);
    if (!profile) return null;

    return {
      userId: found.userId,
      displayName: found.displayName,
      phone: found.phone,
      profile,
    };
  },

  async sendPhoneVerificationCode(phone: string): Promise<void> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) throw new Error('올바른 전화번호를 입력해 주세요');

    const pending: PhoneVerificationPending = {
      phone: normalized,
      code: DEMO_OTP,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
    await writeJson(KEYS.phoneVerification, pending);
  },

  async verifyPhone(phone: string, code: string): Promise<UserProfile> {
    const session = await this.getSession();
    let profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) throw new Error('올바른 전화번호를 입력해 주세요');

    const pending = await readJson<PhoneVerificationPending | null>(KEYS.phoneVerification, null);
    if (!pending || pending.phone !== normalized) throw new Error('인증번호를 먼저 요청해 주세요');
    if (new Date(pending.expiresAt) < new Date()) throw new Error('인증번호가 만료되었습니다');
    if (code.trim() !== pending.code) throw new Error('인증번호가 올바르지 않습니다');

    const users = await readSearchableUsers();
    const taken = users.find(
      (u) => u.userId !== session.userId && normalizePhone(u.phone) === normalized
    );
    if (taken) throw new Error('이미 다른 계정에 등록된 전화번호입니다');

    profile = {
      ...profile,
      phone: normalized,
      phoneVerified: true,
    };
    await writeJson(KEYS.profile, profile);
    await syncSearchableUser(profile);
    await AsyncStorage.removeItem(KEYS.phoneVerification);
    return profile;
  },

  async updatePhoneInviteSettings(blockPhoneInvite: boolean): Promise<UserProfile> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    if (!profile.phoneVerified) throw new Error('전화번호 인증을 먼저 완료해 주세요');

    const updated = { ...profile, blockPhoneInvite };
    await writeJson(KEYS.profile, updated);
    await syncSearchableUser(updated);
    return updated;
  },

  async getMailboxMessages(): Promise<MailboxMessage[]> {
    await this.syncSubscriptionStarMails();
    const session = await this.getSession();
    if (!session) return [];
    const all = await readMailbox();
    return all
      .filter((m) => m.userId === session.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getUnreadMailboxCount(): Promise<number> {
    const messages = await this.getMailboxMessages();
    return messages.filter((m) => isMailboxUnread(m)).length;
  },

  async markMailboxMessageRead(messageId: string): Promise<void> {
    const session = await this.getSession();
    if (!session) return;
    const all = await readMailbox();
    const idx = all.findIndex((m) => m.id === messageId && m.userId === session.userId);
    if (idx < 0 || all[idx].readAt) return;
    if (isStarRewardClaimable(all[idx])) {
      throw new Error('스타 우편은 수령 버튼으로 받아 주세요');
    }
    all[idx] = { ...all[idx], readAt: new Date().toISOString() };
    await writeMailbox(all);
  },

  async claimMailboxStarReward(messageId: string): Promise<{ reward: number; stars: number }> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const all = await readMailbox();
    const idx = all.findIndex((m) => m.id === messageId && m.userId === session.userId);
    if (idx < 0) throw new Error('우편을 찾을 수 없습니다');

    const message = all[idx];
    if (!isStarRewardClaimable(message)) throw new Error('이미 수령했거나 수령할 수 없는 우편입니다');

    const reward = message.rewardStars ?? 0;
    const now = new Date().toISOString();
    all[idx] = { ...message, rewardClaimedAt: now, readAt: message.readAt ?? now };
    await writeMailbox(all);

    const profile = await this.getProfile();
    return { reward, stars: profile?.stars ?? 0 };
  },

  async getSubscriptionState(): Promise<SubscriptionState | null> {
    return readJson<SubscriptionState | null>(KEYS.subscription, null);
  },

  async purchaseSubscription(planId: ShopSubscriptionPlanId): Promise<SubscriptionState> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const purchasedAt = new Date().toISOString();
    const state: SubscriptionState = {
      planId,
      purchasedAt,
      firstDeliveryDayKey: getFirstDeliveryDayKey(new Date(purchasedAt)),
      deliveredCount: 0,
    };
    await writeJson(KEYS.subscription, state);
    await this.syncSubscriptionStarMails();
    return state;
  },

  async syncSubscriptionStarMails(): Promise<void> {
    const session = await this.getSession();
    if (!session) return;

    const state = await readJson<SubscriptionState | null>(KEYS.subscription, null);
    if (!state) return;

    const all = await readMailbox();
    const deliveryDayKeys = buildSubscriptionDeliveryDayKeys(state.firstDeliveryDayKey);
    const now = new Date();
    let deliveredCount = 0;
    let mailboxChanged = false;

    for (let index = 0; index < deliveryDayKeys.length; index += 1) {
      const deliveryDayKey = deliveryDayKeys[index];
      if (!isDeliveryDayDue(deliveryDayKey, now)) break;

      const alreadySent = all.some(
        (m) =>
          m.userId === session.userId &&
          m.type === 'star_reward' &&
          m.subscriptionDayKey === deliveryDayKey &&
          m.subscriptionPlanId === state.planId,
      );
      deliveredCount += 1;
      if (alreadySent) continue;

      const [year, month, day] = deliveryDayKey.split('-').map(Number);
      const probe = new Date(year, month - 1, day, 12, 0, 0);
      const createdAt = getDayStartInTimezone(SUBSCRIPTION_TIMEZONE, probe).toISOString();

      all.unshift({
        id: uid(),
        userId: session.userId,
        createdAt,
        ...buildSubscriptionMail(state.planId, deliveryDayKey, index),
      });
      mailboxChanged = true;
    }

    if (mailboxChanged) await writeMailbox(all);
    if (deliveredCount !== state.deliveredCount) {
      await writeJson(KEYS.subscription, { ...state, deliveredCount });
    }
  },

  async markAllMailboxRead(): Promise<number> {
    const session = await this.getSession();
    if (!session) return 0;
    const all = await readMailbox();
    let count = 0;
    const now = new Date().toISOString();
    for (let i = 0; i < all.length; i += 1) {
      const message = all[i];
      if (message.userId !== session.userId || message.readAt) continue;
      if (message.type === 'group_invite' && message.inviteStatus === 'pending') continue;
      if (isStarRewardClaimable(message)) continue;
      all[i] = { ...message, readAt: now };
      count += 1;
    }
    if (count > 0) await writeMailbox(all);
    return count;
  },

  async deleteMailboxMessage(messageId: string): Promise<void> {
    const session = await this.getSession();
    if (!session) return;
    const all = await readMailbox();
    const message = all.find((m) => m.id === messageId && m.userId === session.userId);
    if (!message) throw new Error('우편을 찾을 수 없습니다');
    if (message.type === 'group_invite' && message.inviteStatus === 'pending') {
      throw new Error('처리 대기 중인 초대장은 거절 후 삭제할 수 있습니다');
    }
    if (isStarRewardClaimable(message)) {
      throw new Error('수령하지 않은 스타 우편은 삭제할 수 없습니다');
    }
    await writeMailbox(all.filter((m) => !(m.id === messageId && m.userId === session.userId)));
  },

  async deleteAllMailboxMessages(): Promise<number> {
    const session = await this.getSession();
    if (!session) return 0;
    const all = await readMailbox();
    const kept = all.filter(
      (m) =>
        m.userId !== session.userId ||
        (m.type === 'group_invite' && m.inviteStatus === 'pending')
    );
    const removed = all.length - kept.length;
    if (removed > 0) await writeMailbox(kept);
    return removed;
  },

  async respondToGroupInvite(messageId: string, accept: boolean): Promise<Group | null> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const all = await readMailbox();
    const msgIdx = all.findIndex(
      (m) => m.id === messageId && m.userId === session.userId && m.type === 'group_invite'
    );
    if (msgIdx < 0) throw new Error('초대장을 찾을 수 없습니다');

    const message = all[msgIdx];
    if (message.inviteStatus !== 'pending') throw new Error('이미 처리된 초대입니다');
    if (!message.groupId) throw new Error('잘못된 초대장입니다');

    const groups = await readJson<Group[]>(KEYS.groups, []);
    const groupIdx = groups.findIndex((g) => g.id === message.groupId);
    if (groupIdx < 0) throw new Error('그룹을 찾을 수 없습니다');

    let group = migrateGroupMembers(groups[groupIdx]);
    const members = group.members ?? [];

    if (accept) {
      if (members.some((m) => m.id === session.userId)) {
        await writeMailbox(all.filter((_, i) => i !== msgIdx));
        return group;
      }

      const unlockedSlots = group.unlockedMemberSlots ?? FREE_GROUP_MEMBER_COUNT;
      if (members.length >= unlockedSlots) throw new Error('그룹 구성원 슬롯이 가득 찼습니다');

      const newMember: GroupMember = {
        id: session.userId,
        displayName: profile.displayName,
        phone: profile.phone,
        photoUri: profile.photoUri,
        isOwner: false,
      };
      group = {
        ...group,
        members: [...members, newMember],
        memberIds: [...group.memberIds, session.userId],
      };
      groups[groupIdx] = group;
      await writeJson(KEYS.groups, groups);

      if (message.inviterId) {
        await pushMailboxMessage({
          id: uid(),
          userId: message.inviterId,
          type: 'notification',
          title: '그룹 초대 수락',
          body: `${profile.displayName}님이 "${group.name}" 그룹 초대를 수락했습니다.`,
          createdAt: new Date().toISOString(),
          groupId: group.id,
          groupName: group.name,
        });
      }
    } else if (message.inviterId) {
      await pushMailboxMessage({
        id: uid(),
        userId: message.inviterId,
        type: 'notification',
        title: '그룹 초대 거절',
        body: `${profile.displayName}님이 "${message.groupName ?? group.name}" 그룹 초대를 거절했습니다.`,
        createdAt: new Date().toISOString(),
        groupId: message.groupId,
        groupName: message.groupName ?? group.name,
      });
    }

    await writeMailbox(all.filter((_, i) => i !== msgIdx));
    return accept ? group : null;
  },

  async unlockGroupMemberSlot(groupId: string): Promise<{ group: Group; cost: number }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');

    let group = migrateGroupMembers(groups[idx], profile);
    if (group.ownerId !== session.userId) throw new Error('방장만 슬롯을 해금할 수 있습니다');

    const unlocked = group.unlockedMemberSlots ?? FREE_GROUP_MEMBER_COUNT;
    if (unlocked >= MAX_GROUP_MEMBER_SLOTS) throw new Error('더 이상 슬롯을 열 수 없습니다');

    const cost = getGroupMemberSlotUnlockCost(unlocked);
    if (profile.stars < cost) throw new Error('스타가 부족합니다');

    const updatedGroup: Group = { ...group, unlockedMemberSlots: unlocked + 1 };
    groups[idx] = updatedGroup;
    await writeJson(KEYS.groups, groups);
    await writeJson(KEYS.profile, { ...profile, stars: profile.stars - cost });

    return { group: updatedGroup, cost };
  },

  async unlockGroupGallerySlots(groupId: string): Promise<{ group: Group; cost: number }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');

    let group = migrateGroupMembers(groups[idx], profile);
    if (group.ownerId !== session.userId) throw new Error('방장만 슬롯을 해금할 수 있습니다');

    const unlocked = group.unlockedGallerySlots ?? 0;
    const cost = getGallerySlotUnlockCost();
    if (profile.stars < cost) throw new Error('스타가 부족합니다');

    const updatedGroup: Group = { ...group, unlockedGallerySlots: unlocked + GALLERY_SLOT_BATCH_SIZE };
    groups[idx] = updatedGroup;
    await writeJson(KEYS.groups, groups);
    await writeJson(KEYS.profile, { ...profile, stars: profile.stars - cost });

    return { group: updatedGroup, cost };
  },

  async updateGroup(groupId: string, patch: { name?: string; description?: string }): Promise<Group> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');
    if (groups[idx].ownerId !== session.userId) throw new Error('방장만 수정할 수 있습니다');
    const trimmedName = patch.name?.trim();
    if (trimmedName !== undefined && !trimmedName) throw new Error('그룹 이름을 입력해 주세요');
    groups[idx] = {
      ...groups[idx],
      ...(trimmedName !== undefined ? { name: trimmedName } : {}),
      ...(patch.description !== undefined ? { description: patch.description || undefined } : {}),
    };
    await writeJson(KEYS.groups, groups);
    return groups[idx];
  },

  async setGroupSharedGalleryUploader(groupId: string, memberId: string | null): Promise<Group> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');

    const group = migrateGroupMembers(groups[idx]);
    if (group.ownerId !== session.userId) throw new Error('방장만 업로드 권한을 위임할 수 있습니다');

    const nextUploaderId = memberId ?? undefined;
    if (nextUploaderId) {
      const memberIds = group.memberIds ?? group.members?.map((member) => member.id) ?? [];
      if (nextUploaderId === group.ownerId) throw new Error('방장은 기본 업로드 권한자입니다');
      if (!memberIds.includes(nextUploaderId)) throw new Error('그룹 멤버에게만 권한을 줄 수 있습니다');
    }

    const updatedGroup = normalizeGroup({
      ...group,
      sharedGalleryUploaderId: nextUploaderId,
    });
    groups[idx] = updatedGroup;
    await writeJson(KEYS.groups, groups);
    return updatedGroup;
  },

  async removeGroupMember(groupId: string, memberId: string): Promise<Group> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');
    const group = groups[idx];
    if (group.ownerId !== session.userId) throw new Error('방장만 추방할 수 있습니다');
    if (memberId === group.ownerId) throw new Error('방장은 추방할 수 없습니다');
    const members = (group.members ?? []).filter((m) => m.id !== memberId);
    if (members.length === (group.members ?? []).length) throw new Error('구성원을 찾을 수 없습니다');
    const updated: Group = {
      ...group,
      members,
      memberIds: members.map((m) => m.id),
      sharedGalleryUploaderId:
        group.sharedGalleryUploaderId === memberId ? undefined : group.sharedGalleryUploaderId,
    };
    groups[idx] = normalizeGroup(updated);
    await writeJson(KEYS.groups, groups);
    return groups[idx];
  },

  async leaveGroup(groupId: string): Promise<void> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');
    const group = groups[idx];
    if (group.ownerId === session.userId) {
      throw new Error('방장은 그룹을 나갈 수 없습니다. 구성원을 추방하거나 그룹을 삭제해 주세요');
    }
    const members = (group.members ?? []).filter((m) => m.id !== session.userId);
    groups[idx] = {
      ...group,
      members,
      memberIds: members.map((m) => m.id),
      sharedGalleryUploaderId:
        group.sharedGalleryUploaderId === session.userId ? undefined : group.sharedGalleryUploaderId,
    };
    groups[idx] = normalizeGroup(groups[idx]);
    await writeJson(KEYS.groups, groups);
  },

  async getGroupChatMessages(groupId: string): Promise<GroupChatMessage[]> {
    const all = await readJson<Record<string, GroupChatMessage[]>>(KEYS.groupChats, {});
    return all[groupId] ?? [];
  },

  async sendGroupChatMessage(groupId: string, text: string): Promise<GroupChatMessage> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');
    const trimmed = text.trim();
    if (!trimmed) throw new Error('메시지를 입력해 주세요');
    const msg: GroupChatMessage = {
      id: uid(),
      groupId,
      userId: profile.id,
      displayName: profile.displayName,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    const all = await readJson<Record<string, GroupChatMessage[]>>(KEYS.groupChats, {});
    const list = all[groupId] ?? [];
    list.push(msg);
    all[groupId] = list.slice(-200);
    await writeJson(KEYS.groupChats, all);
    return msg;
  },

  async deleteGroupChatMessage(groupId: string, messageId: string): Promise<void> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session) throw new Error('로그인이 필요합니다');
    const ownerIds = new Set([session.userId, profile?.id].filter(Boolean) as string[]);
    const all = await readJson<Record<string, GroupChatMessage[]>>(KEYS.groupChats, {});
    const list = all[groupId] ?? [];
    const idx = list.findIndex((m) => m.id === messageId);
    if (idx === -1) throw new Error('메시지를 찾을 수 없습니다');
    const msg = list[idx];
    if (!ownerIds.has(msg.userId)) throw new Error('본인 메시지만 삭제할 수 있습니다');
    list.splice(idx, 1);
    all[groupId] = list;
    await writeJson(KEYS.groupChats, all);
  },

  async getGroupVisits(groupId: string): Promise<Visit[]> {
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    return visits.filter((v) => v.groupId === groupId);
  },

  async getPlaces(regionCode?: string): Promise<Place[]> {
    const places = await ensurePlaces();
    return regionCode ? places.filter((p) => p.regionCode === regionCode) : places;
  },

  async getRecommendedPlaces(limit = 6): Promise<Place[]> {
    const places = await ensurePlaces();
    const profile = await this.getProfile();
    return pickRecommendedPlaces(places, limit, profile?.visitedRegions ?? []);
  },

  async getPlace(id: string): Promise<Place | null> {
    const places = await ensurePlaces();
    return places.find((p) => p.id === id) ?? null;
  },

  async getVisits(): Promise<Visit[]> {
    return readJson<Visit[]>(KEYS.visits, []);
  },

  async getVisit(id: string): Promise<Visit | null> {
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    return visits.find((v) => v.id === id) ?? null;
  },

  async createVisit(input: {
    placeId: string;
    photoUri: string;
    groupId?: string;
    note?: string;
    isPublic?: boolean;
    isSharedGallery?: boolean;
    lat?: number;
    lng?: number;
  }): Promise<Visit> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');
    const place = await this.getPlace(input.placeId);
    if (!place) throw new Error('장소를 찾을 수 없습니다');

    if (input.groupId) {
      const visits = await readJson<Visit[]>(KEYS.visits, []);
      const places = await ensurePlaces();
      const group = await this.getGroup(input.groupId);
      if (input.isSharedGallery) {
        const allowedUploaderId = group?.sharedGalleryUploaderId ?? group?.ownerId;
        if (allowedUploaderId !== session.userId) {
          throw new Error('현재 공용 갤러리 업로드 권한이 없습니다');
        }
      }
      const completions = await readJson<Record<string, string[]>>(KEYS.groupQuestCompletions, {});
      const stationQuestCompleted = (completions[input.groupId] ?? []).includes(
        buildGroupStationQuestId(place.regionCode),
      );
      const unlocked = (stationQuestCompleted ? FREE_GALLERY_SLOTS : 0) + (group?.unlockedGallerySlots ?? 0);
      const regionVisitCount = visits.filter((v) => {
        if (v.groupId !== input.groupId) return false;
        if (input.isSharedGallery) {
          if (!v.isSharedGallery) return false;
        } else if (v.isSharedGallery || v.userId !== session.userId) {
          return false;
        }
        const visitPlace = places.find((p) => p.id === v.placeId);
        return visitPlace?.regionCode === place.regionCode;
      }).length;
      if (regionVisitCount >= unlocked) {
        throw new Error('갤러리 슬롯이 가득 찼습니다. 슬롯을 먼저 해금해 주세요');
      }
    }

    const visit: Visit = {
      id: uid(),
      userId: session.userId,
      placeId: input.placeId,
      groupId: input.groupId,
      photoUri: input.photoUri,
      note: input.note,
      isPublic: input.isPublic ?? false,
      isSharedGallery: input.isSharedGallery ?? false,
      uploaderName: input.isSharedGallery ? (profile.displayName ?? '') : undefined,
      visitedAt: new Date().toISOString(),
      lat: input.lat,
      lng: input.lng,
    };
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    visits.unshift(visit);
    await writeJson(KEYS.visits, visits);
    const regions = new Set(profile.visitedRegions);
    regions.add(place.regionCode);
    await writeJson(KEYS.profile, { ...profile, visitedRegions: Array.from(regions) });
    if (input.groupId) await this.awardCompletedActivityQuests(input.groupId);
    return visit;
  },

  async updateVisit(id: string, patch: Partial<Visit>): Promise<Visit> {
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const idx = visits.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error('방문 기록을 찾을 수 없습니다');
    visits[idx] = { ...visits[idx], ...patch };
    await writeJson(KEYS.visits, visits);
    if (visits[idx].groupId) await this.awardCompletedActivityQuests(visits[idx].groupId);
    return visits[idx];
  },

  async replaceVisitPhoto(id: string, photoUri: string): Promise<Visit> {
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const idx = visits.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error('방문 기록을 찾을 수 없습니다');
    const { editedPhotoUri: _e, filter: _f, ...rest } = visits[idx];
    visits[idx] = { ...rest, photoUri };
    await writeJson(KEYS.visits, visits);
    return visits[idx];
  },

  async deleteVisit(id: string): Promise<void> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const visit = visits.find((v) => v.id === id);
    if (!visit || visit.userId !== session.userId) throw new Error('방문 기록을 찾을 수 없습니다');
    const next = visits.filter((v) => v.id !== id);
    await writeJson(KEYS.visits, next);

    const profile = await this.getProfile();
    if (profile) {
      const places = await ensurePlaces();
      const regionCodes = new Set<string>();
      for (const v of next) {
        const p = places.find((pl) => pl.id === v.placeId);
        if (p) regionCodes.add(p.regionCode);
      }
      await writeJson(KEYS.profile, { ...profile, visitedRegions: Array.from(regionCodes) });
    }
  },

  async getQuests(): Promise<Quest[]> {
    const places = await ensurePlaces();
    const quests = buildQuests(places);
    const completed = await readJson<string[]>(KEYS.completedQuests, []);
    return quests.map((q) => ({ ...q, completed: completed.includes(q.id) }));
  },

  async completeQuest(questId: string, lat: number, lng: number): Promise<{ reward: number; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const places = await ensurePlaces();
    const quests = buildQuests(places);
    const quest = quests.find((q) => q.id === questId);
    if (!quest) throw new Error('퀘스트를 찾을 수 없습니다');
    const completed = await readJson<string[]>(KEYS.completedQuests, []);
    if (completed.includes(questId)) throw new Error('이미 완료한 퀘스트입니다');
    const dist = haversineMeters(lat, lng, quest.targetLat, quest.targetLng);
    if (dist > quest.radiusMeters) throw new Error('퀘스트 위치에서 너무 멀리 있습니다');
    completed.push(questId);
    await writeJson(KEYS.completedQuests, completed);
    const stars = profile.stars + quest.rewardStars;
    await writeJson(KEYS.profile, { ...profile, stars });
    return { reward: quest.rewardStars, stars };
  },

  async assembleGroupQuests(
    groupId: string,
    visits: Visit[],
    places: Place[],
    remoteQuests: Quest[] = [],
  ): Promise<Quest[]> {
    const visitedRegionCodes = new Set<string>();
    for (const v of visits.filter((visit) => visit.groupId === groupId)) {
      const place = places.find((p) => p.id === v.placeId);
      if (place) visitedRegionCodes.add(place.regionCode);
    }

    const allCompletions = await readJson<Record<string, string[]>>(KEYS.groupQuestCompletions, {});
    const completedIds = new Set(allCompletions[groupId] ?? []);
    for (const remote of remoteQuests) {
      if (remote.completed) completedIds.add(remote.id);
    }

    const stationQuests = buildGroupStationQuests(visitedRegionCodes, completedIds);
    const activityQuests = buildGroupActivityQuests(groupId, visits, places, completedIds);
    const recommendedVisits = await readGroupRecommendedPlaceVisits();
    const visitedByRegion = new Map<string, Set<string>>();
    for (const region of REGIONS) {
      visitedByRegion.set(region.code, new Set(recommendedVisits[groupId]?.[region.code] ?? []));
    }
    const recommendedQuests = buildGroupRecommendedVisitQuests(
      groupId,
      places,
      completedIds,
      visitedByRegion,
    );
    const localQuests = sortGroupQuests([...stationQuests, ...activityQuests, ...recommendedQuests]);
    return mergeRemoteGroupQuestState(localQuests, remoteQuests);
  },

  async getGroupQuests(groupId: string): Promise<Quest[]> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const group = await this.getGroup(groupId);
    if (!group) throw new Error('그룹을 찾을 수 없습니다');
    const memberIds = group.memberIds ?? group.members?.map((m) => m.id) ?? [];
    if (!memberIds.includes(session.userId)) throw new Error('그룹 구성원만 참여할 수 있습니다');

    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const places = await ensurePlaces();
    return sanitizeGroupQuests(await this.assembleGroupQuests(groupId, visits, places));
  },

  async awardCompletedActivityQuests(groupId: string): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) return;
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const places = await ensurePlaces();
    const allCompletions = await readJson<Record<string, string[]>>(KEYS.groupQuestCompletions, {});
    const completed = allCompletions[groupId] ?? [];
    const completedIds = new Set(completed);
    const quests = buildGroupActivityQuests(groupId, visits, places, completedIds);
    const newlyCompleted = quests.filter(
      (quest) => !quest.completed && (quest.progressCount ?? 0) >= (quest.targetCount ?? 1),
    );
    if (newlyCompleted.length === 0) return;
    allCompletions[groupId] = [...completed, ...newlyCompleted.map((quest) => quest.id)];
    await writeJson(KEYS.groupQuestCompletions, allCompletions);
    const reward = newlyCompleted.reduce((sum, quest) => sum + quest.rewardStars, 0);
    await writeJson(KEYS.profile, { ...profile, stars: profile.stars + reward });
  },

  async completeGroupQuest(
    groupId: string,
    questId: string,
    lat: number,
    lng: number
  ): Promise<{ rewardGallerySlots: number; rewardStars?: number }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const group = await this.getGroup(groupId);
    if (!group) throw new Error('그룹을 찾을 수 없습니다');
    const memberIds = group.memberIds ?? group.members?.map((m) => m.id) ?? [];
    if (!memberIds.includes(session.userId)) throw new Error('그룹 구성원만 참여할 수 있습니다');

    const quests = await this.getGroupQuests(groupId);
    const quest = quests.find((q) => q.id === questId);
    if (!quest) throw new Error('퀘스트를 찾을 수 없습니다');
    if (quest.completed) throw new Error('이미 완료한 퀘스트입니다');

    if (quest.questKind === 'recommended_visits') {
      if (!quest.regionCode) throw new Error('퀘스트를 찾을 수 없습니다');
      const places = await ensurePlaces();
      return this.verifyRecommendedPlaceVisit(groupId, quest.regionCode, lat, lng, places);
    }

    const dist = haversineMeters(lat, lng, quest.targetLat, quest.targetLng);
    if (dist > quest.radiusMeters) throw new Error('퀘스트 위치에서 너무 멀리 있습니다');

    return this.grantQuestReward(groupId, questId, quest);
  },

  async verifyRecommendedPlaceVisit(
    groupId: string,
    regionCode: string,
    lat: number,
    lng: number,
    places: Place[],
  ): Promise<{ rewardGallerySlots: number; rewardStars?: number; placeName?: string }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');

    const allVisits = await readGroupRecommendedPlaceVisits();
    const regionVisits = allVisits[groupId]?.[regionCode] ?? [];
    const visitedIds = new Set(regionVisits);
    const nearby = findNearbyUnvisitedRecommendedPlace(places, regionCode, lat, lng, visitedIds);
    if (!nearby) {
      const alreadyVisitedNearby = findNearbyRecommendedPlace(places, regionCode, lat, lng);
      if (alreadyVisitedNearby && visitedIds.has(alreadyVisitedNearby.id)) {
        throw new Error('이미 인증한 추천 장소입니다. 다른 추천 장소 근처에서 시도해 주세요.');
      }
      throw new Error('추천 장소 근처에서 GPS 인증해 주세요');
    }

    allVisits[groupId] = {
      ...(allVisits[groupId] ?? {}),
      [regionCode]: [...regionVisits, nearby.id],
    };
    await writeJson(KEYS.groupRecommendedPlaceVisits, allVisits);

    const visitCount = visitedIds.size + 1;
    const allCompletions = await readJson<Record<string, string[]>>(KEYS.groupQuestCompletions, {});
    const completed = allCompletions[groupId] ?? [];
    const completedIds = new Set(completed);
    const newlyCompleted = REGION_RECOMMENDED_VISIT_QUESTS.filter(({ target, reward: _reward }) => {
      const questId = buildRegionRecommendedVisitQuestId(regionCode, target);
      return visitCount >= target && !completedIds.has(questId);
    });

    let rewardStars = 0;
    if (newlyCompleted.length > 0) {
      allCompletions[groupId] = [
        ...completed,
        ...newlyCompleted.map(({ target }) => buildRegionRecommendedVisitQuestId(regionCode, target)),
      ];
      await writeJson(KEYS.groupQuestCompletions, allCompletions);
      rewardStars = newlyCompleted.reduce((sum, item) => sum + item.reward, 0);
      await writeJson(KEYS.profile, { ...profile, stars: profile.stars + rewardStars });
    }

    return { rewardGallerySlots: 0, rewardStars: rewardStars || undefined, placeName: nearby.name };
  },

  async grantQuestReward(
    groupId: string,
    questId: string,
    quest?: Quest
  ): Promise<{ rewardGallerySlots: number; rewardStars?: number }> {
    const allCompletions = await readJson<Record<string, string[]>>(KEYS.groupQuestCompletions, {});
    const completed = allCompletions[groupId] ?? [];
    if (completed.includes(questId)) throw new Error('이미 완료한 퀘스트입니다');

    allCompletions[groupId] = [...completed, questId];
    await writeJson(KEYS.groupQuestCompletions, allCompletions);

    if (quest && quest.rewardStars && !quest.isStationQuest) {
      const profile = await this.getProfile();
      if (profile) {
        profile.stars = (profile.stars ?? 0) + quest.rewardStars;
        await writeJson(KEYS.profile, profile);
      }
      return { rewardGallerySlots: 0, rewardStars: quest.rewardStars };
    }

    return { rewardGallerySlots: GROUP_STATION_QUEST_GALLERY_REWARD };
  },

  async getGroupSchedules(groupId: string): Promise<GroupSchedule[]> {
    const all = await readJson<GroupSchedule[]>(KEYS.groupSchedules, []);
    return all
      .filter((s) => s.groupId === groupId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  },

  async createGroupSchedule(input: {
    groupId: string;
    regionCode: string;
    title: string;
    date: string;
    note?: string;
    stickerId?: string;
  }): Promise<GroupSchedule> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const title = input.title.trim();
    if (!title) throw new Error('일정 제목을 입력해 주세요');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('올바른 날짜를 선택해 주세요');

    const stickerId = input.stickerId;
    if (stickerId) {
      const sticker = SCHEDULE_STICKERS.find((s) => s.id === stickerId);
      if (sticker && !sticker.free) {
        const profile = await this.getProfile();
        const owned: Record<string, number> = (profile as any)?.ownedStickers ?? {};
        const count = owned[stickerId] ?? 0;
        if (count <= 0) throw new Error('해당 스티커가 없습니다. 상점에서 구매해 주세요.');
        owned[stickerId] = count - 1;
        await this.updateProfile({ ownedStickers: owned } as any);
      }
    }

    const schedule: GroupSchedule = {
      id: uid(),
      groupId: input.groupId,
      regionCode: input.regionCode,
      title,
      date: input.date,
      note: input.note?.trim() || undefined,
      stickerId: stickerId || undefined,
      createdBy: session.userId,
      createdAt: new Date().toISOString(),
    };
    const all = await readJson<GroupSchedule[]>(KEYS.groupSchedules, []);
    all.push(schedule);
    await writeJson(KEYS.groupSchedules, all);
    return schedule;
  },

  async deleteGroupSchedule(scheduleId: string): Promise<void> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const all = await readJson<GroupSchedule[]>(KEYS.groupSchedules, []);
    const idx = all.findIndex((s) => s.id === scheduleId);
    if (idx < 0) throw new Error('일정을 찾을 수 없습니다');
    all.splice(idx, 1);
    await writeJson(KEYS.groupSchedules, all);
  },

  async purchaseStickers(stickerId: string, packId: string): Promise<{ newCount: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const pack = STICKER_PACK_OPTIONS.find((p) => p.id === packId);
    if (!pack) throw new Error('올바르지 않은 팩입니다');
    if (profile.stars < pack.starCost) throw new Error('스타가 부족합니다');
    const stars = profile.stars - pack.starCost;
    const owned: Record<string, number> = (profile as any)?.ownedStickers ?? {};
    owned[stickerId] = (owned[stickerId] ?? 0) + pack.count;
    await this.updateProfile({ stars, ownedStickers: owned } as any);
    return { newCount: owned[stickerId] };
  },

  async spendStars(amount: number, _reason: string): Promise<number> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    if (isAdminProfile(profile)) return profile.stars;
    if (profile.stars < amount) throw new Error('스타가 부족합니다');
    const stars = profile.stars - amount;
    await writeJson(KEYS.profile, { ...profile, stars });
    return stars;
  },

  async earnStars(amount: number, _reason: string): Promise<number> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    if (amount === 0 || isAdminProfile(profile)) return profile.stars;
    const stars = profile.stars + amount;
    const updated = { ...profile, stars };
    await writeJson(KEYS.profile, updated);
    await syncUserProfileRegistry(updated);
    return stars;
  },

  async useAiFeature(_feature: string): Promise<{ cost: number; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    return { cost: 0, stars: profile.stars };
  },

  async getFeaturePasses(): Promise<FeaturePass[]> {
    const profile = await this.getProfile();
    if (isAdminProfile(profile)) return buildAdminFeaturePasses();

    const stored = await readJson<FeaturePass[]>(KEYS.featurePasses, []);
    if (stored.length > 0) return stored;

    const legacy = await readJson<string[]>(KEYS.editorUnlocks, []);
    if (legacy.length === 0) return [];

    const migrated: FeaturePass[] = legacy.map((featureId) => ({
      featureId,
      tier: 'permanent' as FeaturePassTier,
      purchasedAt: new Date().toISOString(),
      expiresAt: null,
    }));
    await writeJson(KEYS.featurePasses, migrated);
    return migrated;
  },

  async purchaseFeaturePass(
    featureId: string,
    tier: FeaturePassTier,
  ): Promise<{ pass: FeaturePass; stars: number }> {
    if (!FEATURE_PASS_TIERS.includes(tier)) {
      throw new Error('구매할 수 없는 이용권입니다');
    }
    const cost = FEATURE_PASS_COSTS[tier];
    const existing = await this.getFeaturePasses();
    const pass = buildFeaturePass(existing, featureId, tier);
    const stars = await this.spendStars(cost, `feature_pass:${featureId}:${tier}`);
    const next = mergeFeaturePass(existing, pass);
    await writeJson(KEYS.featurePasses, next);
    return { pass, stars };
  },

  /** @deprecated getFeaturePasses 사용 */
  async getUnlockedEditorAssets(): Promise<string[]> {
    const passes = await this.getFeaturePasses();
    return passes
      .filter((pass) => pass.expiresAt === null || new Date(pass.expiresAt).getTime() > Date.now())
      .map((pass) => pass.featureId);
  },

  /** @deprecated purchaseFeaturePass 사용 */
  async unlockEditorAsset(assetId: string, cost: number): Promise<string[]> {
    await this.spendStars(cost, 'editor_asset:' + assetId);
    const existing = await this.getFeaturePasses();
    const pass = buildFeaturePass(existing, assetId, 'permanent');
    await writeJson(KEYS.featurePasses, mergeFeaturePass(existing, pass));
    return this.getUnlockedEditorAssets();
  },

  async getRecommendations(placeId: string): Promise<PlaceRecommendation[]> {
    const all = await readJson<PlaceRecommendation[]>(KEYS.recommendations, []);
    return all.filter((r) => r.placeId === placeId);
  },

  async addRecommendation(placeId: string, text: string, rating: number): Promise<PlaceRecommendation> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const rec: PlaceRecommendation = {
      id: uid(),
      placeId,
      userId: session.userId,
      text,
      rating,
      createdAt: new Date().toISOString(),
    };
    const all = await readJson<PlaceRecommendation[]>(KEYS.recommendations, []);
    all.unshift(rec);
    await writeJson(KEYS.recommendations, all);
    return rec;
  },

  async getPedometerState(): Promise<PedometerDayState & { timezone: string; timezoneLockedUntil?: string }> {
    const profile = await this.getProfile();
    const timezone = profile?.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    let state = await readJson<PedometerDayState | null>(KEYS.pedometer, null);
    if (!state || state.dayKey !== dayKey) {
      state = { dayKey, baselineSteps: 0, dailySteps: 0, rouletteUsed: 0, claimedMilestones: [] };
      await writeJson(KEYS.pedometer, state);
    }
    return { ...state, timezone, timezoneLockedUntil: profile?.stepTimezoneLockedUntil };
  },

  async syncPedometerSteps(rawSteps: number): Promise<PedometerDayState & { timezone: string }> {
    const full = await this.getPedometerState();
    const dailySteps = Math.max(full.dailySteps, Math.max(0, Math.floor(rawSteps)));
    const state: PedometerDayState = {
      dayKey: full.dayKey,
      baselineSteps: 0,
      dailySteps,
      rouletteUsed: full.rouletteUsed,
      claimedMilestones: full.claimedMilestones,
    };
    await writeJson(KEYS.pedometer, state);
    return { ...state, timezone: full.timezone };
  },

  async spinStepRoulette(milestone: number): Promise<{ reward: number; stars: number; state: PedometerDayState }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const full = await this.getPedometerState();
    const isDemo = session?.isDemo ?? false;
    if (!isDemo && full.dailySteps < milestone * 1000) throw new Error('걸음 수가 부족합니다');
    if (full.claimedMilestones.includes(milestone)) throw new Error('이미 보상을 받았습니다');
    if (full.rouletteUsed >= 5) throw new Error('오늘 룰렛 횟수를 모두 사용했습니다');
    if (milestone > 5) throw new Error('유효하지 않은 마일스톤입니다');

    const reward = Math.floor(Math.random() * 5) + 1;
    const state: PedometerDayState = {
      ...full,
      rouletteUsed: full.rouletteUsed + 1,
      claimedMilestones: [...full.claimedMilestones, milestone].sort((a, b) => a - b),
      doubledMilestones: full.doubledMilestones ?? [],
    };
    await writeJson(KEYS.pedometer, state);
    const bonusState = await readJson<StepRouletteBonusState | null>(KEYS.stepRouletteBonus, null);
    const dayKey = full.dayKey;
    const rewards = bonusState?.dayKey === dayKey ? { ...bonusState.rewards } : {};
    rewards[String(milestone)] = reward;
    await writeJson(KEYS.stepRouletteBonus, {
      dayKey,
      rewards,
      doubledMilestones: bonusState?.dayKey === dayKey ? bonusState.doubledMilestones : [],
    });
    const stars = profile.stars + reward;
    await writeJson(KEYS.profile, { ...profile, stars });
    return { reward, stars, state };
  },

  async doubleStepRouletteReward(milestone: number): Promise<{ bonus: number; stars: number; state: PedometerDayState }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const full = await this.getPedometerState();
    const bonusState = await readJson<StepRouletteBonusState | null>(KEYS.stepRouletteBonus, null);
    if (!bonusState || bonusState.dayKey !== full.dayKey) throw new Error('룰렛 보상 기록이 없습니다');
    if (!full.claimedMilestones.includes(milestone)) throw new Error('아직 받지 않은 마일스톤입니다');
    if (bonusState.doubledMilestones.includes(milestone)) throw new Error('이미 2배 보너스를 받았습니다');
    const baseReward = bonusState.rewards[String(milestone)];
    if (!baseReward) throw new Error('룰렛 보상을 찾을 수 없습니다');

    const stars = profile.stars + baseReward;
    await writeJson(KEYS.profile, { ...profile, stars });
    const doubledMilestones = [...bonusState.doubledMilestones, milestone];
    await writeJson(KEYS.stepRouletteBonus, { ...bonusState, doubledMilestones });
    const state: PedometerDayState = { ...full, doubledMilestones };
    await writeJson(KEYS.pedometer, state);
    return { bonus: baseReward, stars, state };
  },

  async setStepTimezone(timezone: string): Promise<UserProfile> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    if (!canChangeTimezone(profile.stepTimezoneLockedUntil)) {
      throw new Error('타임존은 7일에 한 번만 변경할 수 있습니다');
    }
    const updated: UserProfile = {
      ...profile,
      stepTimezone: timezone,
      stepTimezoneLockedUntil: timezoneLockExpiry(),
    };
    await writeJson(KEYS.profile, updated);
    const dayKey = getDayKey(timezone);
    await writeJson(KEYS.pedometer, {
      dayKey,
      baselineSteps: 0,
      dailySteps: 0,
      rouletteUsed: 0,
      claimedMilestones: [],
    });
    return updated;
  },

  async getMinigameProgress(): Promise<MinigameProgress> {
    const kstDayKey = getDayKey('Asia/Seoul');
    const stored = await readJson<MinigameProgress | null>(KEYS.minigameProgress, null);
    if (!stored || stored.dayKey !== kstDayKey) {
      const fresh: MinigameProgress = { ...EMPTY_MINIGAME_PROGRESS, dayKey: kstDayKey };
      await writeJson(KEYS.minigameProgress, fresh);
      return fresh;
    }
    const legacyTap = (stored as MinigameProgress & { tap?: { clearedStage?: number } }).tap;
    return {
      dayKey: kstDayKey,
      match: { clearedStage: stored.match?.clearedStage ?? 0 },
      quiz: { clearedStage: stored.quiz?.clearedStage ?? 0 },
      slime: { clearedStage: stored.slime?.clearedStage ?? legacyTap?.clearedStage ?? 0 },
      memory: { clearedStage: stored.memory?.clearedStage ?? 0 },
      guess: { clearedStage: stored.guess?.clearedStage ?? 0 },
      code: { clearedStage: stored.code?.clearedStage ?? 0 },
    };
  },

  async getMinigameDailyState(): Promise<MinigameDailyState> {
    const profile = await this.getProfile();
    const timezone = profile?.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    let state = await readJson<MinigameDailyState | null>(KEYS.minigameDaily, null);
    if (!state || state.dayKey !== dayKey) {
      state = { dayKey, starsEarnedToday: 0, capBonusApplied: false };
      await writeJson(KEYS.minigameDaily, state);
    } else if (state.capBonusApplied === undefined) {
      state = { ...state, capBonusApplied: false };
      await writeJson(KEYS.minigameDaily, state);
    }
    return state;
  },

  async extendMinigameCapViaAd(): Promise<MinigameDailyState> {
    const daily = await this.getMinigameDailyState();
    if (daily.capBonusApplied) throw new Error('오늘은 이미 한도를 확장했습니다');
    if (daily.starsEarnedToday < MINIGAME_DAILY_STAR_CAP) {
      throw new Error('아직 오늘 획득 한도에 도달하지 않았습니다');
    }
    const updated = { ...daily, capBonusApplied: true };
    await writeJson(KEYS.minigameDaily, updated);
    return updated;
  },

  async getMinigameBetDailyState(): Promise<MinigameBetDailyState> {
    const dayKey = getBetDayKey();
    let state = await readJson<MinigameBetDailyState | null>(KEYS.minigameBetDaily, null);
    if (!state || state.dayKey !== dayKey) {
      state = { dayKey, betsPlaced: 0, extraSlotUnlocked: false };
      await writeJson(KEYS.minigameBetDaily, state);
    }
    return state;
  },

  async unlockExtraBetSlotViaAd(): Promise<MinigameBetDailyState> {
    const state = await this.getMinigameBetDailyState();
    if (state.extraSlotUnlocked) throw new Error('이미 추가 예측 기회를 사용했습니다');
    if (state.betsPlaced < 1) throw new Error('첫 번째 예측 후에 사용할 수 있습니다');
    const updated = { ...state, extraSlotUnlocked: true };
    await writeJson(KEYS.minigameBetDaily, updated);
    return updated;
  },

  async claimDailyFreeStarsBasic(): Promise<{ stars: number; amount: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const timezone = profile.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    const state = await readJson<DailyFreeStarsState | null>(KEYS.dailyFreeStars, null);
    const freeClaimed = state?.dayKey === dayKey && (state.freeClaimed ?? false);
    if (freeClaimed) throw new Error('오늘은 이미 무료 스타를 받았습니다');
    const stars = profile.stars + DAILY_FREE_STARS_BASIC;
    await writeJson(KEYS.profile, { ...profile, stars });
    await writeJson(KEYS.dailyFreeStars, {
      dayKey,
      freeClaimed: true,
      adClaimed: state?.dayKey === dayKey ? (state.adClaimed ?? state.claimed ?? false) : false,
    });
    return { stars, amount: DAILY_FREE_STARS_BASIC };
  },

  async claimDailyFreeStars(): Promise<{ stars: number; amount: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const timezone = profile.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    const state = await readJson<DailyFreeStarsState | null>(KEYS.dailyFreeStars, null);
    const adClaimed = state?.dayKey === dayKey && (state.adClaimed ?? state.claimed ?? false);
    if (adClaimed) throw new Error('오늘은 이미 광고 보상을 받았습니다');
    const stars = profile.stars + DAILY_FREE_STARS;
    await writeJson(KEYS.profile, { ...profile, stars });
    await writeJson(KEYS.dailyFreeStars, {
      dayKey,
      freeClaimed: state?.dayKey === dayKey ? (state.freeClaimed ?? false) : false,
      adClaimed: true,
    });
    return { stars, amount: DAILY_FREE_STARS };
  },

  async getDailyFreeStarsState(): Promise<{ freeClaimed: boolean; adClaimed: boolean; dayKey: string }> {
    const profile = await this.getProfile();
    const timezone = profile?.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    const state = await readJson<DailyFreeStarsState | null>(KEYS.dailyFreeStars, null);
    if (state?.dayKey !== dayKey) {
      return { freeClaimed: false, adClaimed: false, dayKey };
    }
    return {
      freeClaimed: state.freeClaimed ?? false,
      adClaimed: state.adClaimed ?? state.claimed ?? false,
      dayKey,
    };
  },

  async grantQuestAdBonus(questId: string): Promise<{ bonus: number; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const timezone = profile.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    const state = await readJson<QuestAdBonusState | null>(KEYS.questAdBonus, null);
    const questIds = state?.dayKey === dayKey ? state.questIds : [];
    if (questIds.includes(questId)) throw new Error('이미 보너스를 받은 퀘스트입니다');
    const stars = profile.stars + QUEST_AD_BONUS_STARS;
    await writeJson(KEYS.profile, { ...profile, stars });
    await writeJson(KEYS.questAdBonus, { dayKey, questIds: [...questIds, questId] });
    return { bonus: QUEST_AD_BONUS_STARS, stars };
  },

  async grantVisitAdBonus(): Promise<{ bonus: number; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const timezone = profile.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    const state = await readJson<VisitReviewAdBonusState | null>(KEYS.visitReviewAdBonus, null);
    if (state?.dayKey === dayKey && state.visitClaimed) {
      throw new Error('오늘은 이미 방문 보너스를 받았습니다');
    }
    const stars = profile.stars + VISIT_AD_BONUS_STARS;
    await writeJson(KEYS.profile, { ...profile, stars });
    await writeJson(KEYS.visitReviewAdBonus, {
      dayKey,
      visitClaimed: true,
      reviewClaimed: state?.dayKey === dayKey ? state.reviewClaimed : false,
    });
    return { bonus: VISIT_AD_BONUS_STARS, stars };
  },

  async grantReviewAdBonus(): Promise<{ bonus: number; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const timezone = profile.stepTimezone ?? DEFAULT_TIMEZONE;
    const dayKey = getDayKey(timezone);
    const state = await readJson<VisitReviewAdBonusState | null>(KEYS.visitReviewAdBonus, null);
    if (state?.dayKey === dayKey && state.reviewClaimed) {
      throw new Error('오늘은 이미 리뷰 보너스를 받았습니다');
    }
    const stars = profile.stars + REVIEW_AD_BONUS_STARS;
    await writeJson(KEYS.profile, { ...profile, stars });
    await writeJson(KEYS.visitReviewAdBonus, {
      dayKey,
      visitClaimed: state?.dayKey === dayKey ? state.visitClaimed : false,
      reviewClaimed: true,
    });
    return { bonus: REVIEW_AD_BONUS_STARS, stars };
  },

  async grantEditorFeatureViaAd(featureId: string): Promise<{ pass: FeaturePass; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const passes = await this.getFeaturePasses();
    const now = new Date();
    const expires = new Date(now.getTime() + 60 * 60 * 1000);
    const pass: FeaturePass = {
      featureId,
      tier: 'day1',
      purchasedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    const merged = mergeFeaturePass(passes, pass);
    await writeJson(KEYS.featurePasses, merged);
    return { pass, stars: profile.stars };
  },

  async settleMinigameBets(): Promise<{ tickets: MinigameBetTicket[]; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) return { tickets: [], stars: 0 };
    const tickets = await readJson<MinigameBetTicket[]>(KEYS.minigameBets, []);
    let changed = false;
    const now = new Date();

    const settled = tickets.map((ticket) => {
      if (!canSettleMinigameBet(ticket, now)) return ticket;
      const question = buildDailyBetQuestions(ticket.questionId.slice(0, 10)).find((q) => q.id === ticket.questionId);
      if (!question) return ticket;
      const won = getDemoWinningChoiceId(question) === ticket.choiceId;
      const pool = buildMinigameBetPools([question], tickets)[question.id];
      const payout = won && pool ? calculateMinigameBetPayout(ticket.stake, ticket.choiceId, pool) : null;
      changed = true;
      return {
        ...ticket,
        status: won ? 'won' as const : 'lost' as const,
        payout: payout?.payout ?? 0,
        fee: payout?.fee ?? 0,
        settledAt: new Date().toISOString(),
      };
    });

    if (changed) {
      await writeJson(KEYS.minigameBets, settled);
    }

    return { tickets: settled, stars: profile.stars };
  },

  async getMinigameBetState(): Promise<MinigameBetState> {
    await this.settleMinigameBets();
    const questions = buildDailyBetQuestions();
    const tickets = await readJson<MinigameBetTicket[]>(KEYS.minigameBets, []);
    const pools = buildMinigameBetPools(questions, tickets);
    return { questions, tickets, pools };
  },

  async placeMinigameBet(
    questionId: string,
    choiceId: string,
    stake: number,
  ): Promise<{ ticket: MinigameBetTicket; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    if (!canPlaceMinigameBet()) throw new Error('예측 가능 시간은 오전 7시부터 저녁 10시까지입니다');

    const availableStars = Math.max(0, Math.floor(Number(profile.stars) || 0));
    if (availableStars < MINIGAME_BET_MIN_STAKE) throw new Error('스타가 부족합니다');

    const amount = Math.floor(Number(stake));
    const maxStake = Math.min(MINIGAME_BET_MAX_STAKE, availableStars);
    if (!Number.isFinite(amount) || amount < MINIGAME_BET_MIN_STAKE || amount > maxStake) {
      throw new Error(
        maxStake < MINIGAME_BET_MAX_STAKE
          ? `보유 스타(${availableStars}) 안에서 1~${maxStake}스타로 걸어주세요`
          : '1~50스타 사이로 걸어주세요',
      );
    }

    const questions = buildDailyBetQuestions();
    const question = questions.find((q) => q.id === questionId);
    if (!question) throw new Error('오늘 참여할 수 없는 내기입니다');
    if (!question.choices.some((choice) => choice.id === choiceId)) throw new Error('선택지를 확인해 주세요');

    const betDaily = await this.getMinigameBetDailyState();
    if (betDaily.betsPlaced >= 2) throw new Error('오늘은 더 이상 내기를 할 수 없습니다');
    if (betDaily.betsPlaced >= 1 && !betDaily.extraSlotUnlocked) {
      throw new Error('오늘 예측 횟수를 모두 사용했습니다. 광고를 시청하면 한 번 더 예측할 수 있습니다');
    }

    const tickets = await readJson<MinigameBetTicket[]>(KEYS.minigameBets, []);
    if (tickets.some((ticket) => ticket.questionId === questionId && ticket.status === 'pending')) {
      throw new Error('이미 이 문제에 내기를 걸었습니다');
    }

    const ticket: MinigameBetTicket = {
      id: uid(),
      questionId,
      choiceId,
      stake: amount,
      status: 'pending',
      placedAt: new Date().toISOString(),
      resolveDate: question.resolveDate,
    };
    const stars = availableStars - amount;
    await writeJson(KEYS.minigameBets, [ticket, ...tickets]);
    await writeJson(KEYS.profile, { ...profile, stars });
    await writeJson(KEYS.minigameBetDaily, { ...betDaily, betsPlaced: betDaily.betsPlaced + 1 });
    return { ticket, stars };
  },

  async claimMinigameBetReward(
    ticketId: string,
    options?: { withAdBonus?: boolean },
  ): Promise<{ ticket: MinigameBetTicket; stars: number; adBonus?: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    await this.settleMinigameBets();

    const tickets = await readJson<MinigameBetTicket[]>(KEYS.minigameBets, []);
    const idx = tickets.findIndex((ticket) => ticket.id === ticketId);
    if (idx < 0) throw new Error('내기 기록을 찾을 수 없습니다');

    const ticket = tickets[idx];
    if (ticket.status !== 'won') throw new Error('수령 가능한 내기가 아닙니다');
    if (ticket.claimedAt) throw new Error('이미 수령했습니다');
    if (options?.withAdBonus && ticket.adBonusClaimed) throw new Error('이미 광고 보너스를 받았습니다');

    const payout = ticket.payout ?? ticket.stake * 2;
    const adBonus = options?.withAdBonus ? Math.floor(payout * BET_CLAIM_AD_BONUS_RATE) : 0;
    const totalPayout = payout + adBonus;
    const updatedTicket: MinigameBetTicket = {
      ...ticket,
      payout,
      claimedAt: new Date().toISOString(),
      adBonusClaimed: options?.withAdBonus ? true : ticket.adBonusClaimed,
    };
    const stars = profile.stars + totalPayout;
    tickets[idx] = updatedTicket;
    await writeJson(KEYS.minigameBets, tickets);
    await writeJson(KEYS.profile, { ...profile, stars });
    return { ticket: updatedTicket, stars, adBonus: adBonus > 0 ? adBonus : undefined };
  },

  async claimMinigameStageClear(
    gameId: MinigameId,
    stage: number,
  ): Promise<{
    reward: number;
    stars: number;
    starsEarnedToday: number;
    dailyCap: number;
    clearedStage: number;
    isFinalStageReward: boolean;
    alreadyCleared?: boolean;
  }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');

    const progress = await this.getMinigameProgress();
    const clearedStage = progress[gameId].clearedStage;
    const expectedStage =
      stage === MINIGAME_SINGLE_PLAY_STAGE
        ? MINIGAME_SINGLE_PLAY_STAGE
        : getCurrentStage(clearedStage);
    if (stage !== expectedStage) {
      const daily = await this.getMinigameDailyState();
      return {
        reward: 0,
        stars: profile.stars,
        starsEarnedToday: daily.starsEarnedToday,
        dailyCap: getMinigameEffectiveCap(daily),
        clearedStage,
        isFinalStageReward: false,
        alreadyCleared: false,
      };
    }

    const isNewClear = stage > clearedStage;
    if (!isNewClear) {
      const daily = await this.getMinigameDailyState();
      return {
        reward: 0,
        stars: profile.stars,
        starsEarnedToday: daily.starsEarnedToday,
        dailyCap: getMinigameEffectiveCap(daily),
        clearedStage,
        isFinalStageReward: stage === MINIGAME_MAX_STAGE,
        alreadyCleared: true,
      };
    }

    const daily = await this.getMinigameDailyState();
    const effectiveCap = getMinigameEffectiveCap(daily);
    const remaining = Math.max(0, effectiveCap - daily.starsEarnedToday);
    const isFinalStageReward = stage === MINIGAME_MAX_STAGE;
    const rolled = isFinalStageReward ? rollMinigameFinalStarReward() : 0;
    const reward = isFinalStageReward ? Math.min(rolled, remaining) : 0;
    const nextClearedStage = Math.max(clearedStage, Math.min(stage, MINIGAME_MAX_STAGE));

    progress[gameId] = { clearedStage: nextClearedStage };
    await writeJson(KEYS.minigameProgress, progress);

    const starsEarnedToday = daily.starsEarnedToday + reward;
    await writeJson(KEYS.minigameDaily, { ...daily, starsEarnedToday });

    if (reward > 0 && isFinalStageReward) {
      const bonus: MinigameRewardBonus = {
        dayKey: daily.dayKey,
        gameId,
        stage,
        baseReward: reward,
        rerolled: false,
        doubled: false,
      };
      await writeJson(KEYS.minigameRewardBonus, bonus);
    }

    return {
      reward,
      stars: profile.stars,
      starsEarnedToday,
      dailyCap: effectiveCap,
      clearedStage: nextClearedStage,
      isFinalStageReward,
      alreadyCleared: false,
    };
  },

  async claimMinigameReplayReward(
    gameId: MinigameId,
    stage: number,
  ): Promise<{
    reward: number;
    stars: number;
    starsEarnedToday: number;
    dailyCap: number;
  }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');

    const progress = await this.getMinigameProgress();
    const clearedStage = progress[gameId].clearedStage;
    if (stage > clearedStage) throw new Error('아직 클리어하지 않은 게임입니다');
    if (stage !== MINIGAME_MAX_STAGE) throw new Error('보상을 받을 수 없는 스테이지입니다');

    const daily = await this.getMinigameDailyState();
    const effectiveCap = getMinigameEffectiveCap(daily);
    const remaining = Math.max(0, effectiveCap - daily.starsEarnedToday);
    if (remaining <= 0) throw new Error('오늘 획득 한도에 도달했습니다');

    const rolled = rollMinigameFinalStarReward();
    const reward = Math.min(rolled, remaining);
    if (reward <= 0) throw new Error('오늘 획득 한도에 도달했습니다');

    const starsEarnedToday = daily.starsEarnedToday + reward;
    await writeJson(KEYS.minigameDaily, { ...daily, starsEarnedToday });

    const bonus: MinigameRewardBonus = {
      dayKey: daily.dayKey,
      gameId,
      stage,
      baseReward: reward,
      rerolled: false,
      doubled: false,
    };
    await writeJson(KEYS.minigameRewardBonus, bonus);

    return { reward, stars: profile.stars, starsEarnedToday, dailyCap: effectiveCap };
  },

  async getMinigameRewardBonus(): Promise<MinigameRewardBonus | null> {
    return readJson<MinigameRewardBonus | null>(KEYS.minigameRewardBonus, null);
  },

  async rerollMinigameReward(gameId: MinigameId, stage: number): Promise<{ reward: number; stars: number; starsEarnedToday: number; dailyCap: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const bonus = await this.getMinigameRewardBonus();
    if (!bonus || bonus.gameId !== gameId || bonus.stage !== stage) {
      throw new Error('다시 뽑을 보상이 없습니다');
    }
    if (bonus.rerolled) throw new Error('이미 보상을 다시 뽑았습니다');

    const daily = await this.getMinigameDailyState();
    const effectiveCap = getMinigameEffectiveCap(daily);
    const roomBefore = daily.starsEarnedToday - bonus.baseReward;
    const remaining = Math.max(0, effectiveCap - roomBefore);
    const rolled = rollMinigameFinalStarReward();
    const newReward = Math.min(rolled, remaining);

    const starsEarnedToday = roomBefore + newReward;

    await writeJson(KEYS.minigameDaily, { ...daily, starsEarnedToday });
    await writeJson(KEYS.minigameRewardBonus, { ...bonus, baseReward: newReward, rerolled: true });

    return { reward: newReward, stars: profile.stars, starsEarnedToday, dailyCap: effectiveCap };
  },

  async doubleMinigameReward(gameId: MinigameId, stage: number): Promise<{ bonus: number; stars: number; starsEarnedToday: number; dailyCap: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const bonus = await this.getMinigameRewardBonus();
    if (!bonus || bonus.gameId !== gameId || bonus.stage !== stage) {
      throw new Error('2배 적용할 보상이 없습니다');
    }
    if (bonus.doubled) throw new Error('이미 2배 보너스를 받았습니다');

    const daily = await this.getMinigameDailyState();
    const effectiveCap = getMinigameEffectiveCap(daily);
    const remaining = Math.max(0, effectiveCap - daily.starsEarnedToday);
    const extra = Math.min(bonus.baseReward, remaining);
    if (extra <= 0) throw new Error('오늘 획득 한도에 도달했습니다');

    const starsEarnedToday = daily.starsEarnedToday + extra;

    await writeJson(KEYS.minigameDaily, { ...daily, starsEarnedToday });
    await writeJson(KEYS.minigameRewardBonus, { ...bonus, doubled: true });

    return { bonus: extra, stars: profile.stars, starsEarnedToday, dailyCap: effectiveCap };
  },

  async getPublicFeed(): Promise<PublicExperiencePost[]> {
    const profile = await this.getProfile();
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const places = await ensurePlaces();
    const allProfiles = await readJson<Record<string, UserProfile>>(KEYS.userProfiles, {});

    const fromVisits: PublicExperiencePost[] = visits
      .filter((v) => v.isPublic && (v.editedPhotoUri ?? v.photoUri))
      .map((v) => {
        const place = places.find((p) => p.id === v.placeId);
        const author = v.userId === profile?.id ? profile : allProfiles[v.userId] ?? DEMO_USER_PROFILES[v.userId];
        return {
          id: v.id,
          userId: v.userId,
          displayName: author?.displayName ?? '여행러',
          userPhotoUri: author?.photoUri,
          placeId: v.placeId,
          placeName: place?.name ?? v.placeId,
          regionCode: place?.regionCode ?? '',
          photoUri: v.editedPhotoUri ?? v.photoUri,
          note: v.note,
          visitedAt: v.visitedAt,
        };
      });

    const seedIds = new Set(fromVisits.map((p) => p.id));
    const seed = SEED_PUBLIC_EXPERIENCE_POSTS.filter((p) => !seedIds.has(p.id)).map((p) => {
      const author = allProfiles[p.userId] ?? DEMO_USER_PROFILES[p.userId];
      return {
        ...p,
        userPhotoUri: author?.photoUri ?? p.userPhotoUri,
      };
    });

    const excludeUserId = profile?.id;
    const merged = [...fromVisits, ...seed.filter((p) => p.userId !== excludeUserId)];
    merged.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
    return merged;
  },

  async applyFeedRecommendCounts(posts: PublicExperiencePost[]): Promise<PublicExperiencePost[]> {
    const store = await readFeedRecommendStore();
    return posts.map((post) => ({
      ...post,
      recommendCount: store.counts[post.id] ?? post.recommendCount ?? getBaseRecommendCount(post.id),
    }));
  },

  async getFeedLikedPostIds(): Promise<string[]> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    const userId = profile?.id ?? session?.userId;
    if (!userId) return [];
    const store = await readFeedRecommendStore();
    return store.likes[userId] ?? [];
  },

  async toggleFeedRecommend(
    postId: string,
    postUserId: string,
  ): Promise<{ count: number; liked: boolean }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    const userId = profile?.id ?? session?.userId;
    if (!userId) throw new Error('로그인이 필요합니다');
    if (postUserId === userId) throw new Error('본인 게시물에는 추천할 수 없습니다');

    const store = await readFeedRecommendStore();
    const likedIds = store.likes[userId] ?? [];
    const alreadyLiked = likedIds.includes(postId);
    const currentCount =
      store.counts[postId] ?? getBaseRecommendCount(postId);

    if (alreadyLiked) {
      store.likes[userId] = likedIds.filter((id) => id !== postId);
      store.counts[postId] = Math.max(0, currentCount - 1);
    } else {
      store.likes[userId] = [...likedIds, postId];
      store.counts[postId] = currentCount + 1;
    }

    await writeJson(KEYS.feedRecommendations, store);
    return { count: store.counts[postId], liked: !alreadyLiked };
  },

  async getRankings(type: 'stars' | 'visits' | 'gallery'): Promise<RankingEntry[]> {
    const profile = await this.getProfile();
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const me = profile
      ? {
          id: profile.id,
          displayName: profile.displayName,
          stars: profile.stars,
          visits: visits.filter((v) => v.userId === profile.id).length,
          gallery: visits.filter((v) => v.userId === profile.id && v.photoUri).length,
        }
      : null;

    const mock = [
      { id: 'r1', displayName: '제주러버', stars: 820, visits: 24, gallery: 18 },
      { id: 'r2', displayName: '전국일주왕', stars: 650, visits: 31, gallery: 22 },
      { id: 'r3', displayName: '맛집탐험가', stars: 540, visits: 19, gallery: 15 },
      { id: 'r4', displayName: '산타기빠', stars: 480, visits: 17, gallery: 12 },
      { id: 'r5', displayName: '바다지기', stars: 390, visits: 14, gallery: 10 },
    ];

    const rows = [...mock];
    if (me && !rows.some((r) => r.id === me.id)) {
      rows.push({ id: me.id, displayName: me.displayName, stars: me.stars, visits: me.visits, gallery: me.gallery });
    }

    const key = type === 'stars' ? 'stars' : type === 'visits' ? 'visits' : 'gallery';
    rows.sort((a, b) => b[key] - a[key]);
    return rows.map((r, i) => ({
      id: r.id,
      displayName: r.displayName,
      value: r[key],
      rank: i + 1,
    }));
  },

  async changePassword(current: string, next: string): Promise<void> {
    const session = await this.getSession();
    if (!session) throw new Error('로그인이 필요합니다');
    const stored = await readJson<string | null>(KEYS.accountPassword, null);
    if (stored && stored !== current) throw new Error('현재 비밀번호가 올바르지 않습니다');
    if (next.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다');
    await writeJson(KEYS.accountPassword, next);
  },

  async redeemCoupon(code: string): Promise<{ stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const normalized = code.trim().toUpperCase();
    const rewards: Record<string, number> = { TINGTING100: 100, WELCOME50: 50, TRIP2026: 30 };
    const reward = rewards[normalized];
    if (!reward) throw new Error('유효하지 않은 쿠폰입니다');
    const used = await readJson<string[]>(KEYS.completedQuests + ':coupons', []);
    if (used.includes(normalized)) throw new Error('이미 사용한 쿠폰입니다');
    used.push(normalized);
    await writeJson(KEYS.completedQuests + ':coupons', used);
    const stars = profile.stars + reward;
    await writeJson(KEYS.profile, { ...profile, stars });
    return { stars: reward };
  },

  async submitCustomerInquiry(message: string): Promise<void> {
    if (!message.trim()) throw new Error('문의 내용을 입력해 주세요');
    const profile = await this.getProfile();
    const inquiries = await readJson<CustomerInquiry[]>('@tingting/inquiries', []);
    inquiries.unshift({
      id: uid(),
      userId: profile?.id,
      userEmail: profile?.email,
      userDisplayName: profile?.displayName,
      message: message.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    await writeJson('@tingting/inquiries', inquiries.slice(0, 100));
  },

  async adminListUsers(query?: string): Promise<AdminUserSummary[]> {
    const current = await this.getProfile();
    const stored = await readJson<UserProfile[]>(KEYS.userProfiles, []);
    const merged = new Map<string, UserProfile>();
    for (const profile of stored) merged.set(profile.id, profile);
    if (current) merged.set(current.id, current);
    const q = query?.trim().toLowerCase();
    return [...merged.values()]
      .filter((profile) =>
        !q || profile.email.toLowerCase().includes(q) || profile.displayName.toLowerCase().includes(q)
      )
      .map((profile) => ({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        stars: profile.stars,
        role: profile.role,
      }));
  },

  async adminGrantStars(userId: string, amount: number, _reason?: string): Promise<{ stars: number }> {
    const current = await this.getProfile();
    if (!current?.isAdmin && current?.role !== 'admin') throw new Error('관리자만 사용할 수 있습니다');
    if (!Number.isFinite(amount) || amount === 0) throw new Error('유효하지 않은 수량입니다');

    if (current.id === userId) {
      const stars = Math.max(0, current.stars + amount);
      await writeJson(KEYS.profile, { ...current, stars });
      return { stars };
    }

    const profiles = await readJson<UserProfile[]>(KEYS.userProfiles, []);
    const idx = profiles.findIndex((profile) => profile.id === userId);
    if (idx < 0) throw new Error('사용자를 찾을 수 없습니다');
    const stars = Math.max(0, profiles[idx].stars + amount);
    profiles[idx] = { ...profiles[idx], stars };
    await writeJson(KEYS.userProfiles, profiles);
    return { stars };
  },

  async adminListInquiries(): Promise<CustomerInquiry[]> {
    return readJson<CustomerInquiry[]>('@tingting/inquiries', []);
  },

  async adminResolveInquiry(inquiryId: string): Promise<CustomerInquiry> {
    const inquiries = await readJson<CustomerInquiry[]>('@tingting/inquiries', []);
    const idx = inquiries.findIndex((item) => item.id === inquiryId);
    if (idx < 0) throw new Error('문의를 찾을 수 없습니다');
    inquiries[idx] = {
      ...inquiries[idx],
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    };
    await writeJson('@tingting/inquiries', inquiries);
    return inquiries[idx];
  },

  async adminSendMailbox(input: {
    userId: string;
    title: string;
    body: string;
    type?: 'notice' | 'notification';
  }): Promise<MailboxMessage> {
    const message: MailboxMessage = {
      id: uid(),
      userId: input.userId,
      type: input.type ?? 'notice',
      title: input.title.trim(),
      body: input.body.trim(),
      createdAt: new Date().toISOString(),
    };
    await pushMailboxMessage(message);
    return message;
  },

  async adminBroadcastMailbox(input: {
    title: string;
    body: string;
    userIds?: string[];
    type?: 'notice' | 'notification';
  }): Promise<{ sent: number }> {
    const users = await this.adminListUsers();
    const targets = input.userIds?.length
      ? users.filter((user) => input.userIds!.includes(user.id))
      : users;
    for (const user of targets) {
      await pushMailboxMessage({
        id: uid(),
        userId: user.id,
        type: input.type ?? 'notice',
        title: input.title.trim(),
        body: input.body.trim(),
        createdAt: new Date().toISOString(),
      });
    }
    return { sent: targets.length };
  },

  async deleteAccount(): Promise<void> {
    const keys = Object.values(KEYS);
    await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
    await AsyncStorage.removeItem('@tingting/inquiries');
    await AsyncStorage.removeItem(KEYS.completedQuests + ':coupons');
  },
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
