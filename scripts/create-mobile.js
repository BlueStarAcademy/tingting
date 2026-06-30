const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const mobile = path.join(root, 'apps/mobile');

function write(rel, content) {
  const full = path.join(mobile, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote apps/mobile/' + rel);
}

// package.json
write('package.json', JSON.stringify({
  name: 'mobile',
  version: '1.0.0',
  main: 'expo-router/entry',
  dependencies: {
    '@expo/vector-icons': '^15.0.2',
    '@react-native-async-storage/async-storage': '2.2.0',
    '@supabase/supabase-js': '^2.110.0',
    '@tingting/shared': '*',
    'expo': '~56.0.12',
    'expo-constants': '~56.0.18',
    'expo-image-manipulator': '~56.0.19',
    'expo-image-picker': '~56.0.18',
    'expo-linear-gradient': '~56.0.4',
    'expo-linking': '~56.0.14',
    'expo-location': '~56.0.18',
    'expo-router': '~56.2.11',
    'expo-secure-store': '~56.0.4',
    'expo-status-bar': '~56.0.4',
    'react': '19.2.3',
    'react-native': '0.85.3',
    'react-native-gesture-handler': '~2.31.1',
    'react-native-safe-area-context': '~5.7.0',
    'react-native-screens': '4.25.2',
    'react-native-url-polyfill': '^3.0.0',
  },
  devDependencies: {
    '@types/react': '~19.2.2',
    'typescript': '~6.0.3',
  },
  scripts: {
    start: 'expo start',
    android: 'expo start --android',
    ios: 'expo start --ios',
    web: 'expo start --web',
    typecheck: 'tsc --noEmit',
  },
  private: true,
}, null, 2));

write('tsconfig.json', JSON.stringify({
  extends: 'expo/tsconfig.base',
  compilerOptions: {
    strict: true,
    baseUrl: '.',
    paths: {
      '@/*': ['./*'],
      '@tingting/shared': ['../../packages/shared/src/index.ts'],
    },
  },
  include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
}, null, 2));

write('metro.config.js', `const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
`);

write('app.json', JSON.stringify({
  expo: {
    name: 'TingTing',
    slug: 'tingting',
    scheme: 'tingting',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#312E81',
    },
    ios: { supportsTablet: true, bundleIdentifier: 'app.tingting.mobile' },
    android: {
      adaptiveIcon: {
        backgroundColor: '#312E81',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      package: 'app.tingting.mobile',
    },
    web: { favicon: './assets/favicon.png' },
    plugins: ['expo-router', 'expo-secure-store', ['expo-location', { locationWhenInUsePermission: 'TingTing needs location for GPS quests.' }], ['expo-image-picker', { photosPermission: 'TingTing needs photos for visit records.' }]],
    experiments: { typedRoutes: true },
    extra: { router: { origin: false } },
  },
}, null, 2));

write('.env.example', `# Optional — app works offline with local-store when unset
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`);

write('constants/theme.ts', `export const theme = {
  colors: {
    primary: '#4F46E5',
    primaryDark: '#312E81',
    primaryLight: '#818CF8',
    accent: '#6366F1',
    background: '#0F172A',
    surface: '#1E1B4B',
    surfaceLight: '#312E81',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    star: '#FBBF24',
    success: '#34D399',
    error: '#F87171',
    gradientStart: '#312E81',
    gradientMid: '#4F46E5',
    gradientEnd: '#6366F1',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
};
`);

write('lib/supabase.ts', `import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
`);

write('lib/local-store.ts', `import AsyncStorage from '@react-native-async-storage/async-storage';
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

const DEFAULT_PLACES: Place[] = require('../../../seed/places.json');

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
`);

write('lib/location.ts', `import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentCoords(): Promise<Coords> {
  const granted = await requestLocationPermission();
  if (!granted) throw new Error('Location permission denied');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
`);

write('lib/api.ts', `import type {
  AuthSession,
  Group,
  HomeDashboard,
  Place,
  PlaceRecommendation,
  Quest,
  ShopItem,
  UserProfile,
  Visit,
} from '@tingting/shared';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { localStore } from './local-store';

export { isSupabaseConfigured };

export const api = {
  async getSession(): Promise<AuthSession | null> {
    if (!isSupabaseConfigured) return localStore.getSession();
    const sb = getSupabase()!;
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    return { userId: data.session.user.id, email: data.session.user.email ?? '', isDemo: false };
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    if (!isSupabaseConfigured) return localStore.signIn(email, password);
    const sb = getSupabase()!;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { userId: data.user!.id, email: data.user!.email ?? '', isDemo: false };
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthSession> {
    if (!isSupabaseConfigured) return localStore.signUp(email, password, displayName);
    const sb = getSupabase()!;
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    await sb.from('profiles').insert({ id: data.user!.id, email, display_name: displayName });
    return { userId: data.user!.id, email, isDemo: false };
  },

  async signInDemo(): Promise<AuthSession> {
    return localStore.signInDemo();
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured) return localStore.signOut();
    await getSupabase()!.auth.signOut();
  },

  async getProfile(): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return localStore.getProfile();
    const sb = getSupabase()!;
    const session = await this.getSession();
    if (!session) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', session.userId).single();
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      stars: data.stars,
      onboardingComplete: data.onboarding_complete,
      visitedRegions: data.visited_regions ?? [],
    };
  },

  async completeOnboarding(displayName: string): Promise<UserProfile> {
    if (!isSupabaseConfigured) return localStore.completeOnboarding(displayName);
    const sb = getSupabase()!;
    const session = await this.getSession();
    await sb.from('profiles').update({ display_name: displayName, onboarding_complete: true }).eq('id', session!.userId);
    return (await this.getProfile())!;
  },

  async getHomeDashboard(): Promise<HomeDashboard> {
    if (!isSupabaseConfigured) return localStore.getHomeDashboard();
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('get_home_dashboard');
    if (error) throw error;
    const p = data.profile;
    return {
      profile: {
        id: p.id,
        email: p.email,
        displayName: p.display_name,
        stars: p.stars,
        onboardingComplete: p.onboarding_complete,
        visitedRegions: p.visited_regions ?? [],
      },
      groups: (data.groups ?? []).map(mapGroup),
      recentVisits: (data.recentVisits ?? []).map(mapVisit),
      regionProgress: [],
      totalRegions: data.totalRegions ?? 17,
      visitedCount: data.visitedCount ?? 0,
    };
  },

  async getGroups(): Promise<Group[]> {
    if (!isSupabaseConfigured) return localStore.getGroups();
    const dash = await this.getHomeDashboard();
    return dash.groups;
  },

  async createGroup(name: string, description?: string): Promise<{ group: Group; cost: number }> {
    if (!isSupabaseConfigured) return localStore.createGroup(name, description);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('create_group', { p_name: name, p_description: description });
    if (error) throw error;
    const group = await localStore.getGroup(data.id);
    return { group: group!, cost: data.cost };
  },

  async getGroup(id: string): Promise<Group | null> {
    if (!isSupabaseConfigured) return localStore.getGroup(id);
    return localStore.getGroup(id);
  },

  async getPlaces(regionCode?: string): Promise<Place[]> {
    if (!isSupabaseConfigured) return localStore.getPlaces(regionCode);
    const sb = getSupabase()!;
    let q = sb.from('places').select('*');
    if (regionCode) q = q.eq('region_code', regionCode);
    const { data } = await q;
    return (data ?? []).map(mapPlace);
  },

  async getPlace(id: string): Promise<Place | null> {
    if (!isSupabaseConfigured) return localStore.getPlace(id);
    const sb = getSupabase()!;
    const { data } = await sb.from('places').select('*').eq('id', id).single();
    return data ? mapPlace(data) : null;
  },

  async getVisits(): Promise<Visit[]> {
    if (!isSupabaseConfigured) return localStore.getVisits();
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data } = await sb.from('visits').select('*').eq('user_id', session!.userId).order('visited_at', { ascending: false });
    return (data ?? []).map(mapVisit);
  },

  async getVisit(id: string): Promise<Visit | null> {
    if (!isSupabaseConfigured) return localStore.getVisit(id);
    const visits = await this.getVisits();
    return visits.find((v) => v.id === id) ?? null;
  },

  async createVisit(input: Parameters<typeof localStore.createVisit>[0]): Promise<Visit> {
    if (!isSupabaseConfigured) return localStore.createVisit(input);
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data, error } = await sb.from('visits').insert({
      user_id: session!.userId,
      place_id: input.placeId,
      group_id: input.groupId,
      photo_uri: input.photoUri,
      note: input.note,
      lat: input.lat,
      lng: input.lng,
    }).select().single();
    if (error) throw error;
    return mapVisit(data);
  },

  async updateVisit(id: string, patch: Partial<Visit>): Promise<Visit> {
    if (!isSupabaseConfigured) return localStore.updateVisit(id, patch);
    const sb = getSupabase()!;
    const { data, error } = await sb.from('visits').update({
      edited_photo_uri: patch.editedPhotoUri,
      filter: patch.filter,
      note: patch.note,
    }).eq('id', id).select().single();
    if (error) throw error;
    return mapVisit(data);
  },

  async getQuests(): Promise<Quest[]> {
    if (!isSupabaseConfigured) return localStore.getQuests();
    return localStore.getQuests();
  },

  async completeQuest(questId: string, lat: number, lng: number): Promise<{ reward: number; stars: number }> {
    if (!isSupabaseConfigured) return localStore.completeQuest(questId, lat, lng);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('complete_quest', { p_quest_id: questId, p_lat: lat, p_lng: lng });
    if (error) throw error;
    return { reward: data.reward, stars: data.stars };
  },

  async spendStars(amount: number, reason: string): Promise<number> {
    if (!isSupabaseConfigured) return localStore.spendStars(amount, reason);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('spend_stars', { p_amount: amount, p_reason: reason });
    if (error) throw error;
    return data.stars;
  },

  async useAiFeature(feature: string): Promise<{ cost: number; stars: number }> {
    if (!isSupabaseConfigured) return localStore.useAiFeature(feature);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('use_ai_feature', { p_feature: feature });
    if (error) throw error;
    return { cost: data.cost, stars: data.stars };
  },

  async getRecommendations(placeId: string): Promise<PlaceRecommendation[]> {
    if (!isSupabaseConfigured) return localStore.getRecommendations(placeId);
    const sb = getSupabase()!;
    const { data } = await sb.from('place_recommendations').select('*').eq('place_id', placeId);
    return (data ?? []).map((r) => ({
      id: r.id,
      placeId: r.place_id,
      userId: r.user_id,
      text: r.text,
      rating: r.rating,
      createdAt: r.created_at,
    }));
  },

  async addRecommendation(placeId: string, text: string, rating: number): Promise<PlaceRecommendation> {
    if (!isSupabaseConfigured) return localStore.addRecommendation(placeId, text, rating);
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data, error } = await sb.from('place_recommendations').insert({
      place_id: placeId,
      user_id: session!.userId,
      text,
      rating,
    }).select().single();
    if (error) throw error;
    return { id: data.id, placeId: data.place_id, userId: data.user_id, text: data.text, rating: data.rating, createdAt: data.created_at };
  },

  getShopItems(): ShopItem[] {
    return localStore.getShopItems();
  },
};

function mapGroup(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    ownerId: row.owner_id as string,
    memberIds: (row.member_ids as string[]) ?? [],
    createdAt: row.created_at as string,
  };
}

function mapPlace(row: Record<string, unknown>): Place {
  return {
    id: row.id as string,
    regionCode: row.region_code as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    lat: row.lat as number,
    lng: row.lng as number,
    category: (row.category as string) ?? '',
    imageUrl: row.image_url as string | undefined,
  };
}

function mapVisit(row: Record<string, unknown>): Visit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    placeId: row.place_id as string,
    groupId: row.group_id as string | undefined,
    photoUri: (row.photo_uri as string) ?? '',
    editedPhotoUri: row.edited_photo_uri as string | undefined,
    note: row.note as string | undefined,
    visitedAt: row.visited_at as string,
    lat: row.lat as number | undefined,
    lng: row.lng as number | undefined,
    filter: row.filter as string | undefined,
  };
}
`);

console.log('Lib files done');
