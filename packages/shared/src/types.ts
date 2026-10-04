export type PlaceCategory = 'food' | 'play' | 'event' | 'stay';
export type PlaceStatus = 'wish' | 'visited';

export interface Region {
  code: string;
  name: string;
  nameEn: string;
  color: string;
}

export interface CoupleUser {
  id: string;
  email: string;
  displayName: string;
  avatarUri?: string;
}

export interface AuthSession {
  user: CoupleUser;
  partner: CoupleUser | null;
}

export interface BackupStatus {
  /** False when the server has no MYBOX_TOKEN. */
  enabled: boolean;
  running: boolean;
  backedUp: number;
  pending: number;
  lastSuccessAt?: string;
  /** HTTP status of the last failed MYBOX call (401 = token expired or invalid). */
  errorStatus?: number;
  errorMessage?: string;
  /** YYYY-MM-DD, from MYBOX_TOKEN_EXPIRES. */
  tokenExpiresAt?: string;
}

export interface Place {
  id: string;
  regionCode: string;
  category: PlaceCategory;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  phone?: string;
  url?: string;
  kakaoPlaceId?: string;
  kakaoCategory?: string;
  /** YYYY-MM-DD, events only */
  eventStart?: string;
  eventEnd?: string;
  memo?: string;
  status: PlaceStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  coverPhotoUri?: string;
  photoCount?: number;
}

export type PlaceInput = Omit<
  Place,
  'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'coverPhotoUri' | 'photoCount' | 'regionCode' | 'status' | 'lat' | 'lng'
> & {
  regionCode?: string;
  status?: PlaceStatus;
  /** Omit to geocode the address (or fall back to the region center) */
  lat?: number;
  lng?: number;
};

export interface PlaceReview {
  placeId: string;
  userId: string;
  /** 1-5 */
  rating: number;
  comment?: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  placeId: string;
  /** YYYY-MM-DD */
  visitedOn: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  placeId?: string;
  visitId?: string;
  /** Album region if set, otherwise the linked place's region */
  regionCode?: string;
  /** Region album this photo is filed under ("지역별 앨범") */
  albumRegionCode?: string;
  /** General album folder ("일반 앨범"); exclusive with albumRegionCode */
  folderId?: string;
  placeName?: string;
  originalUri: string;
  editedUri?: string;
  takenAt: string;
  createdBy: string;
  createdAt: string;
}

/** Shared by both partners; `createdBy` records who made it. */
export interface AlbumFolder {
  id: string;
  name: string;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  photoCount: number;
  coverPhotoUri?: string;
}

export interface RegionAlbumSummary {
  regionCode: string;
  photoCount: number;
  coverPhotoUri?: string;
}

export interface AlbumSummary {
  regions: RegionAlbumSummary[];
  folders: AlbumFolder[];
  /** Photos filed under neither a region nor a folder */
  unsortedCount: number;
  totalCount: number;
}

export type AlbumTarget =
  | { kind: 'region'; regionCode: string }
  | { kind: 'folder'; folderId: string }
  | { kind: 'none' };

export type AlbumScope =
  | { kind: 'region'; regionCode: string }
  | { kind: 'folder'; folderId: string }
  | { kind: 'unsorted' }
  | { kind: 'all' };

export interface PhotoPage {
  items: Photo[];
  /** Pass back as `cursor` for the next page; absent on the last page */
  nextCursor?: string;
}

/** What to do with a folder's photos when the folder is deleted. */
export type FolderDeleteMode = 'delete' | 'move';

export interface TripPlan {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  placeId?: string;
  placeName?: string;
  placeRegionCode?: string;
  memo?: string;
  done: boolean;
  createdBy: string;
  createdAt: string;
}

export interface PlaceDetail {
  place: Place;
  reviews: PlaceReview[];
  visits: Visit[];
  photos: Photo[];
}

export interface KakaoPlaceResult {
  kakaoPlaceId: string;
  name: string;
  category: PlaceCategory;
  kakaoCategory: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  url?: string;
  regionCode: string;
  /** Already saved as a place */
  savedPlaceId?: string;
}

export interface HomeDashboard {
  visitedRegionCodes: string[];
  placeCount: number;
  visitedPlaceCount: number;
  photoCount: number;
  upcomingPlans: TripPlan[];
  recentPhotos: Photo[];
  wishPlaces: Place[];
}

export type EditorFeatureCategory =
  | 'filter'
  | 'sticker'
  | 'frame'
  | 'ai'
  | 'adjust'
  | 'effect'
  | 'beauty'
  | 'makeup'
  | 'lens';

export interface EditorFeature {
  id: string;
  category: EditorFeatureCategory;
  name: { ko: string; en: string };
  description?: { ko: string; en: string };
  previewColor?: string;
  emoji?: string;
  regionCode?: string;
  /** UI grouping for large editor catalogs */
  group?: { ko: string; en: string };
  /** Short icon label for controls that are not emoji stickers */
  icon?: string;
  /** Default effect strength, 0-1 */
  intensity?: number;
  /** photo-effects.ts 매핑 키 */
  effectKey?: string;
}
