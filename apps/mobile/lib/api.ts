import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type {
  AlbumFolder,
  AlbumScope,
  AlbumSummary,
  AlbumTarget,
  AuthSession,
  BackupStatus,
  CityFolder,
  CityFolderDeleteMode,
  CityFolderDetail,
  CityFolderInput,
  CityPin,
  CityPinInput,
  CoupleUser,
  CourseDay,
  CourseDraft,
  CoursePoint,
  CourseRequest,
  CourseTransport,
  GeoSearchResult,
  HomeDashboard,
  KakaoPlaceResult,
  Photo,
  PhotoPage,
  Place,
  PlaceCategory,
  PlaceDetail,
  PlaceExtraInfo,
  PlaceInput,
  PlaceReview,
  PlaceStatus,
  RecommendationCategory,
  RecommendationPage,
  RecommendationSource,
  RegionVisitStat,
  RouteLeg,
  RouteSource,
  TripCourse,
  TripCourseSummary,
  TripPlan,
  Visit,
} from '@tingting/shared';
import { breadcrumb, logEvent, setDiagnosticsTransport } from '@/lib/diagnostics';

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

  const traced = !path.startsWith('/client-logs');
  const route = path.split('?')[0];
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (e) {
    if (traced) breadcrumb('fetch_failed', { route, ms: Date.now() - started });
    throw e;
  }
  if (traced) {
    const ms = Date.now() - started;
    breadcrumb('fetch', { route, status: res.status, ms });
    if (ms > 4000) logEvent('slow_fetch', { route, status: res.status, ms });
  }
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

/** `region:SEO`, `folder:<id>`, `city:<id>` or `none`, as the album endpoints take in query strings. */
function targetParam(target: AlbumTarget): string {
  if (target.kind === 'region') return `region:${target.regionCode}`;
  if (target.kind === 'folder') return `folder:${target.folderId}`;
  if (target.kind === 'city') return `city:${target.cityFolderId}`;
  return 'none';
}

export const api = {
  /** Swap the stored token for a fresh one on every launch so it never runs out. */
  async getSession(): Promise<AuthSession | null> {
    if (!(await getToken())) return null;
    try {
      const data = await request<{ token: string; session: AuthSession }>('/auth/refresh', { method: 'POST' });
      await writeItem(TOKEN_KEY, data.token);
      await writeItem(USER_KEY, data.session.user.id);
      return data.session;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await api.signOut();
      return null;
    }
  },

  listUsers(): Promise<CoupleUser[]> {
    return request('/auth/users');
  },

  async enterAs(userId: string, password: string): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/enter', {
      method: 'POST',
      body: json({ userId, password }),
    });
    await writeItem(TOKEN_KEY, data.token);
    await writeItem(USER_KEY, userId);
    return data.session;
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return request('/auth/password', { method: 'POST', body: json({ currentPassword, newPassword }) });
  },

  async signOut(): Promise<void> {
    await writeItem(TOKEN_KEY, null);
    await writeItem(USER_KEY, null);
  },

  updateMe(patch: { displayName?: string; avatarUri?: string }): Promise<CoupleUser> {
    return request('/auth/me', { method: 'PATCH', body: json(patch) });
  },

  getBackupStatus(): Promise<BackupStatus> {
    return request('/backup');
  },

  runBackup(): Promise<BackupStatus> {
    return request('/backup/run', { method: 'POST' });
  },

  getDashboard(): Promise<HomeDashboard> {
    return request('/dashboard');
  },

  getRegionStats(): Promise<RegionVisitStat[]> {
    return request('/dashboard/regions');
  },

  /** `source` keeps later pages on the provider that answered page 1. */
  getRecommendations(input: {
    regionCode: string;
    category: RecommendationCategory;
    page?: number;
    source?: RecommendationSource;
    from?: { lat: number; lng: number };
  }): Promise<RecommendationPage> {
    return request(
      `/recommendations${query({
        regionCode: input.regionCode,
        category: input.category,
        page: input.page ? String(input.page) : undefined,
        source: input.source,
        lat: input.from ? String(input.from.lat) : undefined,
        lng: input.from ? String(input.from.lng) : undefined,
      })}`,
    );
  },

  searchNearby(input: {
    lat: number;
    lng: number;
    radius: number;
    category?: RecommendationCategory;
    query?: string;
    page?: number;
    source?: RecommendationSource;
  }): Promise<RecommendationPage> {
    return request(
      `/nearby${query({
        lat: String(input.lat),
        lng: String(input.lng),
        radius: String(input.radius),
        category: input.query ? undefined : input.category,
        query: input.query,
        page: input.page ? String(input.page) : undefined,
        source: input.source,
      })}`,
    );
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

  listPhotos(filter: { placeId?: string; regionCode?: string; limit?: number } = {}): Promise<Photo[]> {
    const { limit, ...rest } = filter;
    return request(`/photos${query({ ...rest, limit: limit ? String(limit) : undefined })}`);
  },

  getPhoto(id: string): Promise<Photo> {
    return request(`/photos/${id}`);
  },

  createPhoto(input: {
    originalUri: string;
    editedUri?: string;
    placeId?: string;
    visitId?: string;
    takenAt?: string;
    regionCode?: string;
    folderId?: string;
    cityFolderId?: string;
  }): Promise<Photo> {
    return request('/photos', { method: 'POST', body: json(input) });
  },

  updatePhoto(id: string, patch: { editedUri?: string | null; placeId?: string | null }): Promise<Photo> {
    return request(`/photos/${id}`, { method: 'PATCH', body: json(patch) });
  },

  deletePhoto(id: string): Promise<void> {
    return request(`/photos/${id}`, { method: 'DELETE' });
  },

  getAlbumSummary(): Promise<AlbumSummary> {
    return request('/albums/summary');
  },

  listAlbumPhotos(scope: AlbumScope, page: { cursor?: string; limit?: number } = {}): Promise<PhotoPage> {
    return request(
      `/albums/photos${query({
        scope: scope.kind,
        regionCode: scope.kind === 'region' ? scope.regionCode : undefined,
        folderId: scope.kind === 'folder' ? scope.folderId : undefined,
        cityFolderId: scope.kind === 'city' ? scope.cityFolderId : undefined,
        cursor: page.cursor,
        limit: page.limit ? String(page.limit) : undefined,
      })}`,
    );
  },

  movePhotos(photoIds: string[], target: AlbumTarget): Promise<{ updated: number }> {
    return request('/albums/photos/move', { method: 'POST', body: json({ photoIds, target }) });
  },

  copyPhotos(photoIds: string[], target: AlbumTarget): Promise<{ items: Photo[] }> {
    return request('/albums/photos/copy', { method: 'POST', body: json({ photoIds, target }) });
  },

  deletePhotos(photoIds: string[]): Promise<{ deleted: number }> {
    return request('/albums/photos/delete', { method: 'POST', body: json({ photoIds }) });
  },

  listFolders(): Promise<AlbumFolder[]> {
    return request('/albums/folders');
  },

  createFolder(name: string): Promise<AlbumFolder> {
    return request('/albums/folders', { method: 'POST', body: json({ name }) });
  },

  renameFolder(id: string, name: string): Promise<AlbumFolder> {
    return request(`/albums/folders/${id}`, { method: 'PATCH', body: json({ name }) });
  },

  reorderFolders(ids: string[]): Promise<AlbumFolder[]> {
    return request('/albums/folders/reorder', { method: 'POST', body: json({ ids }) });
  },

  /** Non-empty folders need `photos`: delete them too, or move them to `target`. */
  deleteFolder(id: string, photos?: { mode: 'delete' } | { mode: 'move'; target: AlbumTarget }): Promise<void> {
    const target = photos?.mode === 'move' ? photos.target : undefined;
    return request(`/albums/folders/${id}${query({ photos: photos?.mode, target: target ? targetParam(target) : undefined })}`, {
      method: 'DELETE',
    });
  },

  listCityFolders(filter: { regionCode?: string; cityCode?: string } = {}): Promise<CityFolder[]> {
    return request(`/albums/cities${query(filter)}`);
  },

  getCityFolder(id: string): Promise<CityFolderDetail> {
    return request(`/albums/cities/${id}`);
  },

  createCityFolder(input: CityFolderInput): Promise<CityFolder> {
    return request('/albums/cities', { method: 'POST', body: json(input) });
  },

  /** `title: null` restores the default title, `coverPhotoId: null` the latest photo as cover. */
  updateCityFolder(
    id: string,
    patch: Partial<Pick<CityFolderInput, 'title' | 'startDate' | 'endDate' | 'memo'>> & { coverPhotoId?: string | null },
  ): Promise<CityFolder> {
    return request(`/albums/cities/${id}`, { method: 'PATCH', body: json(patch) });
  },

  /** Folders with photos need `photos`: keep them in the province album, or delete them too. */
  deleteCityFolder(id: string, photos?: CityFolderDeleteMode): Promise<void> {
    return request(`/albums/cities/${id}${query({ photos })}`, { method: 'DELETE' });
  },

  addCityPin(folderId: string, input: CityPinInput): Promise<CityPin> {
    return request(`/albums/cities/${folderId}/pins`, { method: 'POST', body: json(input) });
  },

  updateCityPin(folderId: string, pinId: string, patch: Partial<CityPinInput>): Promise<CityPin> {
    return request(`/albums/cities/${folderId}/pins/${pinId}`, { method: 'PATCH', body: json(patch) });
  },

  deleteCityPin(folderId: string, pinId: string): Promise<void> {
    return request(`/albums/cities/${folderId}/pins/${pinId}`, { method: 'DELETE' });
  },

  /** Kakao Local when the server has a key, OpenStreetMap otherwise; biased to the city's area. */
  searchGeo(q: string, near: { cityCode?: string; regionCode?: string } = {}): Promise<GeoSearchResult> {
    return request(`/geo/search${query({ q, ...near })}`);
  },

  reverseGeo(lat: number, lng: number): Promise<{ name?: string; address?: string }> {
    return request(`/geo/reverse${query({ lat: lat.toFixed(6), lng: lng.toFixed(6) })}`);
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

  generateCourse(input: CourseRequest): Promise<CourseDraft> {
    return request('/courses/generate', { method: 'POST', body: json(input) });
  },

  /** Road legs between consecutive points (after reordering or swapping a stop). */
  routeCourse(points: CoursePoint[], transport: CourseTransport): Promise<{ legs: RouteLeg[]; source: RouteSource }> {
    return request('/courses/route', { method: 'POST', body: json({ points, transport }) });
  },

  listCourses(regionCode?: string): Promise<TripCourseSummary[]> {
    return request(`/courses${query({ regionCode })}`);
  },

  getCourse(id: string): Promise<TripCourse> {
    return request(`/courses/${id}`);
  },

  saveCourse(input: { request: CourseRequest; title: string; days: CourseDay[]; routeSource: RouteSource; sources: string[] }): Promise<TripCourse> {
    return request('/courses', { method: 'POST', body: json(input) });
  },

  deleteCourse(id: string): Promise<void> {
    return request(`/courses/${id}`, { method: 'DELETE' });
  },

  /** Opening hours, overview etc. (TourAPI places only; `{}` otherwise). */
  getPlaceInfo(id: string, typeId?: string): Promise<PlaceExtraInfo> {
    return request(`/courses/place-info${query({ id, typeId })}`);
  },
};

setDiagnosticsTransport(async (body) => {
  if (!(await getToken())) throw new Error('not signed in');
  await request('/client-logs', { method: 'POST', body: json(body) });
});
