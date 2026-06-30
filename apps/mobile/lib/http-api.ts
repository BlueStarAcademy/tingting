import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
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

const TOKEN_KEY = '@tingting/api-token';
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export function isHttpApiConfigured(): boolean {
  return Boolean(API_URL);
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const httpApi = {
  async getSession(): Promise<AuthSession | null> {
    const token = await getToken();
    if (!token) return null;
    try {
      const { profile } = await request<{ profile: UserProfile }>('/auth/me');
      return { userId: profile.id, email: profile.email, isDemo: false };
    } catch {
      await setToken(null);
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);
    return data.session;
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    await setToken(data.token);
    return data.session;
  },

  async signInDemo(): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/demo', { method: 'POST' });
    await setToken(data.token);
    return data.session;
  },

  async signOut(): Promise<void> {
    await setToken(null);
  },

  async getProfile(): Promise<UserProfile | null> {
    try {
      const { profile } = await request<{ profile: UserProfile }>('/auth/me');
      return profile;
    } catch {
      return null;
    }
  },

  async completeOnboarding(displayName: string): Promise<UserProfile> {
    const { profile } = await request<{ profile: UserProfile }>('/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
    return profile;
  },

  async getHomeDashboard(): Promise<HomeDashboard> {
    return request<HomeDashboard>('/dashboard');
  },

  async getGroups(): Promise<Group[]> {
    return request<Group[]>('/groups');
  },

  async createGroup(name: string, description?: string): Promise<{ group: Group; cost: number }> {
    return request('/groups', { method: 'POST', body: JSON.stringify({ name, description }) });
  },

  async getGroup(id: string): Promise<Group | null> {
    try {
      return await request<Group>(`/groups/${id}`);
    } catch {
      return null;
    }
  },

  async getPlaces(regionCode?: string): Promise<Place[]> {
    const q = regionCode ? `?region=${encodeURIComponent(regionCode)}` : '';
    return request<Place[]>(`/places${q}`);
  },

  async getPlace(id: string): Promise<Place | null> {
    try {
      return await request<Place>(`/places/${id}`);
    } catch {
      return null;
    }
  },

  async getVisits(): Promise<Visit[]> {
    return request<Visit[]>('/visits');
  },

  async getVisit(id: string): Promise<Visit | null> {
    const visits = await this.getVisits();
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
    return request<Visit>('/visits', { method: 'POST', body: JSON.stringify(input) });
  },

  async updateVisit(id: string, patch: Partial<Visit>): Promise<Visit> {
    return request<Visit>(`/visits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        editedPhotoUri: patch.editedPhotoUri,
        filter: patch.filter,
        note: patch.note,
      }),
    });
  },

  async getQuests(): Promise<Quest[]> {
    return request<Quest[]>('/quests');
  },

  async completeQuest(questId: string, lat: number, lng: number): Promise<{ reward: number; stars: number }> {
    return request(`/quests/${encodeURIComponent(questId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    });
  },

  async spendStars(amount: number, reason: string): Promise<number> {
    const { stars } = await request<{ stars: number }>('/stars/spend', {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
    return stars;
  },

  async useAiFeature(feature: string): Promise<{ cost: number; stars: number }> {
    return request('/ai/use', { method: 'POST', body: JSON.stringify({ feature }) });
  },

  async getRecommendations(placeId: string): Promise<PlaceRecommendation[]> {
    return request<PlaceRecommendation[]>(`/places/${placeId}/recommendations`);
  },

  async addRecommendation(placeId: string, text: string, rating: number): Promise<PlaceRecommendation> {
    return request(`/places/${placeId}/recommendations`, {
      method: 'POST',
      body: JSON.stringify({ text, rating }),
    });
  },

  getShopItems(): ShopItem[] {
    return [];
  },

  async getShopItemsAsync(): Promise<ShopItem[]> {
    return request<ShopItem[]>('/shop/items');
  },

  async getUnlockedEditorAssets(): Promise<string[]> {
    return request<string[]>('/editor/unlocks');
  },

  async unlockEditorAsset(assetId: string, cost: number): Promise<string[]> {
    return request<string[]>('/editor/unlock', {
      method: 'POST',
      body: JSON.stringify({ assetId, cost }),
    });
  },
};
