import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MBTI_TEST_REWARD,
  getGroupSlotUnlockCost,
  getGroupMemberInviteCost,
  getDisplayNameChangeCost,
  MAX_GROUP_SLOTS,
  QUEST_REWARD_DEFAULT,
  GPS_QUEST_RADIUS_METERS,
  INITIAL_STARS,
  DEMO_EMAIL,
  SHOP_ITEMS,
  REGIONS,
} from '@tingting/shared';
import type {
  AuthSession,
  Group,
  GroupChatMessage,
  GroupMember,
  HomeDashboard,
  PedometerDayState,
  Place,
  PlaceRecommendation,
  Quest,
  RankingEntry,
  UserProfile,
  Visit,
} from '@tingting/shared';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import {
  DEFAULT_TIMEZONE,
  canChangeTimezone,
  getDayKey,
  timezoneLockExpiry,
} from '@/lib/timezone';

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
  phoneDirectory: '@tingting/phoneDirectory',
  groupChats: '@tingting/groupChats',
  pedometer: '@tingting/pedometer',
  accountPassword: '@tingting/accountPassword',
};

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

import PLACES_JSON from '@/constants/places.json';
import { FEATURED_PLACE_IDS } from '@/constants/featured-places';

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
      imageUrl: p.imageUrl ?? latest.imageUrl,
    };
  });

  for (const d of DEFAULT_PLACES) {
    if (!places.some((p) => p.id === d.id)) places.push(d);
  }

  return places;
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
  unlocked = Math.max(1, Math.min(MAX_GROUP_SLOTS, unlocked));
  const ownedSlots = groups.filter((g) => g.ownerId === profile.id).map((g) => g.slotIndex ?? 0);
  const maxUsed = ownedSlots.length ? Math.max(...ownedSlots) + 1 : 1;
  unlocked = Math.max(unlocked, maxUsed);
  return {
    ...profile,
    unlockedGroupSlots: unlocked,
    mbtiTestCompleted: profile.mbtiTestCompleted ?? false,
    displayNameChangeCount: profile.displayNameChangeCount ?? 0,
  };
}

function migrateGroupMembers(group: Group, ownerProfile?: UserProfile | null): Group {
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

  async signIn(email: string, _password: string): Promise<AuthSession> {
    const session: AuthSession = { userId: uid(), email, isDemo: false };
    await writeJson(KEYS.session, session);
    let profile = await readJson<UserProfile | null>(KEYS.profile, null);
    if (!profile) {
      profile = {
        id: session.userId,
        email,
        displayName: email.split('@')[0],
        stars: INITIAL_STARS,
        onboardingComplete: false,
        visitedRegions: [],
      };
      await writeJson(KEYS.profile, profile);
    }
    return session;
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthSession> {
    const session: AuthSession = { userId: uid(), email, isDemo: false };
    const profile: UserProfile = {
      id: session.userId,
      email,
      displayName,
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
    if (normalized.unlockedGroupSlots !== profile.unlockedGroupSlots || normalized.displayName !== profile.displayName) {
      await writeJson(KEYS.profile, normalized);
    }
    return normalized;
  },

  async updateProfile(patch: Partial<Pick<UserProfile, 'photoUri' | 'birthday'>>): Promise<UserProfile> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const updated = { ...profile, ...patch };
    await writeJson(KEYS.profile, updated);
    return updated;
  },

  async changeDisplayName(displayName: string): Promise<{ profile: UserProfile; cost: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const trimmed = displayName.trim();
    if (!trimmed) throw new Error('닉네임을 입력해 주세요');
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

    return { profile: updated, cost };
  },

  async unlockGroupSlot(): Promise<UserProfile> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');
    const unlocked = profile.unlockedGroupSlots ?? 1;
    if (unlocked >= MAX_GROUP_SLOTS) throw new Error('모든 슬롯이 해금되었습니다');
    const cost = getGroupSlotUnlockCost(unlocked);
    if (profile.stars < cost) throw new Error('스타가 부족합니다');
    const updated = { ...profile, stars: profile.stars - cost, unlockedGroupSlots: unlocked + 1 };
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
    const updated = { ...profile, displayName, onboardingComplete: true };
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

  async inviteGroupMember(groupId: string, phone: string): Promise<{ group: Group; cost: number }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');

    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) throw new Error('올바른 전화번호를 입력해 주세요');

    const groups = await readJson<Group[]>(KEYS.groups, []);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx < 0) throw new Error('그룹을 찾을 수 없습니다');

    let group = migrateGroupMembers(groups[idx], profile);
    if (group.ownerId !== session.userId) throw new Error('방장만 초대할 수 있습니다');

    const members = group.members ?? [];
    if (members.some((m) => m.phone && normalizePhone(m.phone) === normalized)) {
      throw new Error('이미 초대된 번호입니다');
    }

    const cost = getGroupMemberInviteCost(members.length);
    if (cost > 0 && profile.stars < cost) throw new Error('스타가 부족합니다');

    const directory = await readJson<GroupMember[]>(KEYS.phoneDirectory, []);
    const known = directory.find((u) => u.phone && normalizePhone(u.phone) === normalized);

    const memberId = known?.id ?? uid();
    const newMember: GroupMember = {
      id: memberId,
      displayName: known?.displayName ?? `여행자 ${normalized.slice(-4)}`,
      phone: normalized,
      photoUri: known?.photoUri,
      isOwner: false,
    };

    const updatedGroup: Group = {
      ...group,
      members: [...members, newMember],
      memberIds: [...group.memberIds, memberId],
    };

    groups[idx] = updatedGroup;
    await writeJson(KEYS.groups, groups);

    if (cost > 0) {
      const updatedProfile = { ...profile, stars: profile.stars - cost };
      await writeJson(KEYS.profile, updatedProfile);
    }

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
    };
    groups[idx] = updated;
    await writeJson(KEYS.groups, groups);
    return updated;
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
    };
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
      userId: session.userId,
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
    const byId = new Map(places.map((p) => [p.id, p]));
    const picked: Place[] = [];
    const usedIds = new Set<string>();

    for (const id of FEATURED_PLACE_IDS) {
      if (picked.length >= limit) break;
      const place = byId.get(id);
      if (!place || usedIds.has(place.id)) continue;
      usedIds.add(place.id);
      picked.push(place);
    }

    if (picked.length >= limit) return picked;

    const profile = await this.getProfile();
    const visited = new Set(profile?.visitedRegions ?? []);
    const unvisitedPool = places.filter((p) => !visited.has(p.regionCode));
    const pool = unvisitedPool.length > 0 ? unvisitedPool : places;
    const usedRegions = new Set(picked.map((p) => p.regionCode));

    for (const place of pool) {
      if (picked.length >= limit) break;
      if (usedIds.has(place.id)) continue;
      if (usedRegions.has(place.regionCode)) continue;
      usedIds.add(place.id);
      usedRegions.add(place.regionCode);
      picked.push(place);
    }

    if (picked.length < limit) {
      for (const place of places) {
        if (picked.length >= limit) break;
        if (usedIds.has(place.id)) continue;
        usedIds.add(place.id);
        picked.push(place);
      }
    }

    return picked;
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
    lat?: number;
    lng?: number;
  }): Promise<Visit> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('로그인이 필요합니다');
    const place = await this.getPlace(input.placeId);
    if (!place) throw new Error('장소를 찾을 수 없습니다');
    const visit: Visit = {
      id: uid(),
      userId: session.userId,
      placeId: input.placeId,
      groupId: input.groupId,
      photoUri: input.photoUri,
      note: input.note,
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
    return visit;
  },

  async updateVisit(id: string, patch: Partial<Visit>): Promise<Visit> {
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const idx = visits.findIndex((v) => v.id === id);
    if (idx < 0) throw new Error('방문 기록을 찾을 수 없습니다');
    visits[idx] = { ...visits[idx], ...patch };
    await writeJson(KEYS.visits, visits);
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

  async spendStars(amount: number, _reason: string): Promise<number> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    if (profile.stars < amount) throw new Error('스타가 부족합니다');
    const stars = profile.stars - amount;
    await writeJson(KEYS.profile, { ...profile, stars });
    return stars;
  },

  async useAiFeature(feature: string): Promise<{ cost: number; stars: number }> {
    const item = SHOP_ITEMS.find((s) => s.id.includes(feature) || s.name.includes(feature));
    const cost = item?.cost ?? 20;
    const stars = await this.spendStars(cost, 'ai_' + feature);
    return { cost, stars };
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

  getShopItems() {
    return SHOP_ITEMS;
  },

  async getUnlockedEditorAssets(): Promise<string[]> {
    return readJson<string[]>(KEYS.editorUnlocks, []);
  },

  async unlockEditorAsset(assetId: string, cost: number): Promise<string[]> {
    const unlocked = await readJson<string[]>(KEYS.editorUnlocks, []);
    if (unlocked.includes(assetId)) return unlocked;
    await this.spendStars(cost, 'editor_asset:' + assetId);
    const next = [...unlocked, assetId];
    await writeJson(KEYS.editorUnlocks, next);
    return next;
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
    let { baselineSteps, dailySteps, dayKey } = full;
    if (baselineSteps === 0 && rawSteps > 0) baselineSteps = rawSteps;
    if (rawSteps < baselineSteps) baselineSteps = rawSteps;
    dailySteps = Math.max(0, rawSteps - baselineSteps);
    const state: PedometerDayState = {
      dayKey,
      baselineSteps,
      dailySteps,
      rouletteUsed: full.rouletteUsed,
      claimedMilestones: full.claimedMilestones,
    };
    await writeJson(KEYS.pedometer, state);
    return { ...state, timezone: full.timezone };
  },

  async spinStepRoulette(milestone: number): Promise<{ reward: number; stars: number; state: PedometerDayState }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('로그인이 필요합니다');
    const full = await this.getPedometerState();
    if (full.dailySteps < milestone * 1000) throw new Error('걸음 수가 부족합니다');
    if (full.claimedMilestones.includes(milestone)) throw new Error('이미 보상을 받았습니다');
    if (full.rouletteUsed >= 5) throw new Error('오늘 룰렛 횟수를 모두 사용했습니다');
    if (milestone > 5) throw new Error('유효하지 않은 마일스톤입니다');

    const reward = Math.floor(Math.random() * 5) + 1;
    const state: PedometerDayState = {
      ...full,
      rouletteUsed: full.rouletteUsed + 1,
      claimedMilestones: [...full.claimedMilestones, milestone].sort((a, b) => a - b),
    };
    await writeJson(KEYS.pedometer, state);
    const stars = profile.stars + reward;
    await writeJson(KEYS.profile, { ...profile, stars });
    return { reward, stars, state };
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
    const inquiries = await readJson<Array<{ id: string; message: string; at: string }>>('@tingting/inquiries', []);
    inquiries.unshift({ id: uid(), message: message.trim(), at: new Date().toISOString() });
    await writeJson('@tingting/inquiries', inquiries.slice(0, 50));
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
