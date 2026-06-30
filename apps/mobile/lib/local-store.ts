import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ADDITIONAL_GROUP_COST,
  DEMO_EMAIL,
  INITIAL_STARS,
  QUEST_REWARD_DEFAULT,
  GPS_QUEST_RADIUS_METERS,
  SHOP_ITEMS,
  REGIONS,
} from '@tingting/shared';
import type {
  AuthSession,
  Group,
  HomeDashboard,
  Place,
  PlaceRecommendation,
  Quest,
  UserProfile,
  Visit,
} from '@tingting/shared';

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

const DEFAULT_PLACES: Place[] = PLACES_JSON as Place[];

async function ensurePlaces(): Promise<Place[]> {
  let places = await readJson<Place[]>(KEYS.places, []);
  if (places.length === 0) {
    places = DEFAULT_PLACES;
    await writeJson(KEYS.places, places);
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

  async signUp(email: string, _password: string, displayName: string): Promise<AuthSession> {
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
    return session;
  },

  async signInDemo(): Promise<AuthSession> {
    const session: AuthSession = { userId: 'demo-user', email: DEMO_EMAIL, isDemo: true };
    const profile: UserProfile = {
      id: session.userId,
      email: DEMO_EMAIL,
      displayName: 'Demo Traveler',
      stars: INITIAL_STARS,
      onboardingComplete: true,
      visitedRegions: ['SEO', 'BUS', 'JEJ'],
    };
    await writeJson(KEYS.session, session);
    await writeJson(KEYS.profile, profile);
    return session;
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.session);
  },

  async getProfile(): Promise<UserProfile | null> {
    return readJson<UserProfile | null>(KEYS.profile, null);
  },

  async completeOnboarding(displayName: string): Promise<UserProfile> {
    const profile = await readJson<UserProfile | null>(KEYS.profile, null);
    if (!profile) throw new Error('No profile');
    const updated = { ...profile, displayName, onboardingComplete: true };
    await writeJson(KEYS.profile, updated);
    return updated;
  },

  async getHomeDashboard(): Promise<HomeDashboard> {
    const profile = (await readJson<UserProfile | null>(KEYS.profile, null))!;
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const visits = await readJson<Visit[]>(KEYS.visits, []);
    const visitedSet = new Set(profile.visitedRegions);
    return {
      profile,
      groups,
      recentVisits: visits.slice(0, 6),
      regionProgress: REGIONS.map((r) => ({ code: r.code, visited: visitedSet.has(r.code) })),
      totalRegions: REGIONS.length,
      visitedCount: profile.visitedRegions.length,
    };
  },

  async getGroups(): Promise<Group[]> {
    return readJson<Group[]>(KEYS.groups, []);
  },

  async createGroup(name: string, description?: string): Promise<{ group: Group; cost: number }> {
    const session = await this.getSession();
    const profile = await this.getProfile();
    if (!session || !profile) throw new Error('Not authenticated');
    const groups = await readJson<Group[]>(KEYS.groups, []);
    const owned = groups.filter((g) => g.ownerId === session.userId);
    const cost = owned.length >= 1 ? ADDITIONAL_GROUP_COST : 0;
    if (profile.stars < cost) throw new Error('Insufficient stars');
    const group: Group = {
      id: uid(),
      name,
      description,
      ownerId: session.userId,
      memberIds: [session.userId],
      createdAt: new Date().toISOString(),
    };
    groups.unshift(group);
    await writeJson(KEYS.groups, groups);
    if (cost > 0) {
      await writeJson(KEYS.profile, { ...profile, stars: profile.stars - cost });
    }
    return { group, cost };
  },

  async getGroup(id: string): Promise<Group | null> {
    const groups = await readJson<Group[]>(KEYS.groups, []);
    return groups.find((g) => g.id === id) ?? null;
  },

  async getPlaces(regionCode?: string): Promise<Place[]> {
    const places = await ensurePlaces();
    return regionCode ? places.filter((p) => p.regionCode === regionCode) : places;
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
    if (!session || !profile) throw new Error('Not authenticated');
    const place = await this.getPlace(input.placeId);
    if (!place) throw new Error('Place not found');
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
    if (idx < 0) throw new Error('Visit not found');
    visits[idx] = { ...visits[idx], ...patch };
    await writeJson(KEYS.visits, visits);
    return visits[idx];
  },

  async getQuests(): Promise<Quest[]> {
    const places = await ensurePlaces();
    const quests = buildQuests(places);
    const completed = await readJson<string[]>(KEYS.completedQuests, []);
    return quests.map((q) => ({ ...q, completed: completed.includes(q.id) }));
  },

  async completeQuest(questId: string, lat: number, lng: number): Promise<{ reward: number; stars: number }> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('Not authenticated');
    const places = await ensurePlaces();
    const quests = buildQuests(places);
    const quest = quests.find((q) => q.id === questId);
    if (!quest) throw new Error('Quest not found');
    const completed = await readJson<string[]>(KEYS.completedQuests, []);
    if (completed.includes(questId)) throw new Error('Already completed');
    const dist = haversineMeters(lat, lng, quest.targetLat, quest.targetLng);
    if (dist > quest.radiusMeters) throw new Error('Too far from quest location');
    completed.push(questId);
    await writeJson(KEYS.completedQuests, completed);
    const stars = profile.stars + quest.rewardStars;
    await writeJson(KEYS.profile, { ...profile, stars });
    return { reward: quest.rewardStars, stars };
  },

  async spendStars(amount: number, _reason: string): Promise<number> {
    const profile = await this.getProfile();
    if (!profile) throw new Error('Not authenticated');
    if (profile.stars < amount) throw new Error('Insufficient stars');
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
    if (!session) throw new Error('Not authenticated');
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
