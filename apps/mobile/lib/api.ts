import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type {
  AuthSession,
  CoupleUser,
  HomeDashboard,
  KakaoPlaceResult,
  Photo,
  Place,
  PlaceCategory,
  PlaceDetail,
  PlaceInput,
  PlaceReview,
  PlaceStatus,
  TripPlan,
  Visit,
} from '@tingting/shared';

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY ?? '';

const TOKEN_KEY = 'tingting.api-token';
const USER_KEY = 'tingting.user-id';

async function readItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeItem(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value) await AsyncStorage.setItem(key, value);
    else await AsyncStorage.removeItem(key);
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

export function getToken(): Promise<string | null> {
  return readItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError('EXPO_PUBLIC_API_URL이 설정되지 않았어요', 0);
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (APP_KEY) headers['X-App-Key'] = APP_KEY;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? `HTTP ${res.status}`, res.status);
  }
  return data as T;
}

function query(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  /** Re-enter as the remembered user on every launch so the token never runs out. */
  async getSession(): Promise<AuthSession | null> {
    const userId = await readItem(USER_KEY);
    if (!userId) return null;
    try {
      return await api.enterAs(userId);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 404)) await api.signOut();
      return null;
    }
  },

  listUsers(): Promise<CoupleUser[]> {
    return request('/auth/users');
  },

  async enterAs(userId: string): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/enter', {
      method: 'POST',
      body: json({ userId }),
    });
    await writeItem(TOKEN_KEY, data.token);
    await writeItem(USER_KEY, userId);
    return data.session;
  },

  async signOut(): Promise<void> {
    await writeItem(TOKEN_KEY, null);
    await writeItem(USER_KEY, null);
  },

  updateMe(patch: { displayName?: string; avatarUri?: string }): Promise<CoupleUser> {
    return request('/auth/me', { method: 'PATCH', body: json(patch) });
  },

  getDashboard(): Promise<HomeDashboard> {
    return request('/dashboard');
  },

  listPlaces(filter: { regionCode?: string; category?: PlaceCategory; status?: PlaceStatus } = {}): Promise<Place[]> {
    return request(`/places${query(filter)}`);
  },

  getPlace(id: string): Promise<PlaceDetail> {
    return request(`/places/${id}`);
  },

  createPlace(input: PlaceInput): Promise<Place> {
    return request('/places', { method: 'POST', body: json(input) });
  },

  updatePlace(id: string, patch: Partial<PlaceInput>): Promise<Place> {
    return request(`/places/${id}`, { method: 'PATCH', body: json(patch) });
  },

  deletePlace(id: string): Promise<void> {
    return request(`/places/${id}`, { method: 'DELETE' });
  },

  searchKakao(q: string, regionCode?: string): Promise<KakaoPlaceResult[]> {
    return request(`/places/search${query({ q, region: regionCode })}`);
  },

  saveReview(placeId: string, rating: number, comment?: string): Promise<PlaceReview> {
    return request(`/places/${placeId}/review`, { method: 'PUT', body: json({ rating, comment }) });
  },

  addVisit(placeId: string, input: { visitedOn: string; note?: string }): Promise<Visit> {
    return request(`/places/${placeId}/visits`, { method: 'POST', body: json(input) });
  },

  deleteVisit(id: string): Promise<void> {
    return request(`/visits/${id}`, { method: 'DELETE' });
  },

  listPhotos(filter: { placeId?: string; regionCode?: string } = {}): Promise<Photo[]> {
    return request(`/photos${query(filter)}`);
  },

  getPhoto(id: string): Promise<Photo> {
    return request(`/photos/${id}`);
  },

  createPhoto(input: { originalUri: string; editedUri?: string; placeId?: string; visitId?: string; takenAt?: string }): Promise<Photo> {
    return request('/photos', { method: 'POST', body: json(input) });
  },

  updatePhoto(id: string, patch: { editedUri?: string | null; placeId?: string | null }): Promise<Photo> {
    return request(`/photos/${id}`, { method: 'PATCH', body: json(patch) });
  },

  deletePhoto(id: string): Promise<void> {
    return request(`/photos/${id}`, { method: 'DELETE' });
  },

  listPlans(): Promise<TripPlan[]> {
    return request('/plans');
  },

  createPlan(input: { date: string; title: string; placeId?: string; memo?: string }): Promise<TripPlan> {
    return request('/plans', { method: 'POST', body: json(input) });
  },

  updatePlan(id: string, patch: Partial<Pick<TripPlan, 'date' | 'title' | 'placeId' | 'memo' | 'done'>>): Promise<TripPlan> {
    return request(`/plans/${id}`, { method: 'PATCH', body: json(patch) });
  },

  deletePlan(id: string): Promise<void> {
    return request(`/plans/${id}`, { method: 'DELETE' });
  },
};
