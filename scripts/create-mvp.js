const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function write(rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote', rel);
}

// ============ SHARED PACKAGE ============
write('packages/shared/src/types.ts', `export interface Region {
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

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
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
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  stars: number;
  onboardingComplete: boolean;
  visitedRegions: string[];
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

export interface AuthSession {
  userId: string;
  email: string;
  isDemo: boolean;
}
`);

write('packages/shared/src/regions.ts', `import type { Region } from './types';

export const REGIONS: Region[] = [
  { code: 'SEO', name: '서울', nameEn: 'Seoul', color: '#6366F1' },
  { code: 'BUS', name: '부산', nameEn: 'Busan', color: '#818CF8' },
  { code: 'DAE', name: '대구', nameEn: 'Daegu', color: '#A78BFA' },
  { code: 'ICN', name: '인천', nameEn: 'Incheon', color: '#4F46E5' },
  { code: 'GWJ', name: '광주', nameEn: 'Gwangju', color: '#7C3AED' },
  { code: 'DJN', name: '대전', nameEn: 'Daejeon', color: '#5B21B6' },
  { code: 'ULS', name: '울산', nameEn: 'Ulsan', color: '#4338CA' },
  { code: 'SJG', name: '세종', nameEn: 'Sejong', color: '#8B5CF6' },
  { code: 'GGD', name: '경기', nameEn: 'Gyeonggi', color: '#6366F1' },
  { code: 'GWN', name: '강원', nameEn: 'Gangwon', color: '#312E81' },
  { code: 'NCB', name: '충북', nameEn: 'North Chungcheong', color: '#3730A3' },
  { code: 'SCB', name: '충남', nameEn: 'South Chungcheong', color: '#4C1D95' },
  { code: 'NJB', name: '전북', nameEn: 'North Jeolla', color: '#6D28D9' },
  { code: 'SJB', name: '전남', nameEn: 'South Jeolla', color: '#7E22CE' },
  { code: 'NGB', name: '경북', nameEn: 'North Gyeongsang', color: '#581C87' },
  { code: 'SGB', name: '경남', nameEn: 'South Gyeongsang', color: '#9333EA' },
  { code: 'JEJ', name: '제주', nameEn: 'Jeju', color: '#C026D3' },
];

export function getRegion(code: string): Region | undefined {
  return REGIONS.find((r) => r.code === code);
}
`);

write('packages/shared/src/constants.ts', `export const TOTAL_REGIONS = 17;
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
`);

write('packages/shared/src/index.ts', `export * from './types';
export * from './regions';
export * from './constants';
`);

console.log('Shared package done');
