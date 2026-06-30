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
