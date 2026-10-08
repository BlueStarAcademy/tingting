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
  /** City trip folder inside the region album; `albumRegionCode` stays set */
  cityFolderId?: string;
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

/** Per 시/군/구 totals of city trip folders; only cities with a folder are returned. */
export interface CityAlbumSummary {
  regionCode: string;
  cityCode: string;
  folderCount: number;
  photoCount: number;
}

export interface AlbumSummary {
  regions: RegionAlbumSummary[];
  folders: AlbumFolder[];
  cities: CityAlbumSummary[];
  /** Photos filed under neither a region nor a folder */
  unsortedCount: number;
  totalCount: number;
}

export type CityPinCategory = 'food' | 'cafe' | 'sight' | 'stay' | 'etc';

/** One trip to one 시/군/구 ("세부 지역 폴더"), e.g. 강원 → 속초 · 2026.10. Shared by both partners. */
export interface CityFolder {
  id: string;
  regionCode: string;
  cityCode: string;
  cityName: string;
  /** Custom title; show `cityFolderTitle()` for the default */
  title?: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, for multi-day trips */
  endDate?: string;
  /** One line, up to 60 characters */
  memo?: string;
  coverPhotoId?: string;
  /** Chosen cover, else the latest photo */
  coverPhotoUri?: string;
  photoCount: number;
  pinCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CityFolderInput {
  regionCode: string;
  cityCode: string;
  title?: string | null;
  startDate: string;
  endDate?: string | null;
  memo?: string | null;
}

/** A place pinned on a city folder's street map ("세부장소 핀"). */
export interface CityPin {
  id: string;
  folderId: string;
  name: string;
  memo?: string;
  category: CityPinCategory;
  lat: number;
  lng: number;
  address?: string;
  kakaoPlaceId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CityPinInput = Pick<CityPin, 'name' | 'category' | 'lat' | 'lng'> & {
  memo?: string | null;
  address?: string | null;
  kakaoPlaceId?: string | null;
};

export interface CityFolderDetail {
  folder: CityFolder;
  pins: CityPin[];
}

/** kakao = Kakao Local (when the server has a key), osm = OpenStreetMap Nominatim */
export type GeoSource = 'kakao' | 'osm';

export interface GeoPlace {
  id: string;
  source: GeoSource;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category: CityPinCategory;
  /** Provider label, e.g. "카페" or "음식점 > 한식" */
  categoryLabel?: string;
  kakaoPlaceId?: string;
}

export interface GeoSearchResult {
  items: GeoPlace[];
  source: GeoSource;
}

export type AlbumTarget =
  | { kind: 'region'; regionCode: string }
  | { kind: 'folder'; folderId: string }
  | { kind: 'city'; cityFolderId: string }
  | { kind: 'none' };

export type AlbumScope =
  | { kind: 'region'; regionCode: string }
  | { kind: 'folder'; folderId: string }
  | { kind: 'city'; cityFolderId: string }
  | { kind: 'unsorted' }
  | { kind: 'all' };

export interface PhotoPage {
  items: Photo[];
  /** Pass back as `cursor` for the next page; absent on the last page */
  nextCursor?: string;
}

/** What to do with a folder's photos when the folder is deleted. */
export type FolderDeleteMode = 'delete' | 'move';

/** City folders: `keep` leaves the photos in the province album. */
export type CityFolderDeleteMode = 'keep' | 'delete';

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
  /** Set on the per-day entries of a saved travel course */
  courseId?: string;
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

/** Per-region totals behind the colored map; only regions with any record are returned. */
export interface RegionVisitStat {
  regionCode: string;
  placeCount: number;
  visitedPlaceCount: number;
  /** Album photos filed under the region plus photos of its places */
  photoCount: number;
  /** Same rule as `HomeDashboard.visitedRegionCodes` */
  visited: boolean;
}

export type RecommendationCategory = 'food' | 'cafe' | 'sight' | 'activity' | 'stay' | 'event';

/** tour = 한국관광공사 TourAPI, kakao = Kakao Local, osm = OpenStreetMap (keyless fallback) */
export type RecommendationSource = 'tour' | 'kakao' | 'osm';

export interface RecommendedPlace {
  /** `${source}:${externalId}`, stable across pages */
  id: string;
  source: RecommendationSource;
  category: RecommendationCategory;
  name: string;
  /** Provider's own label, e.g. "한식" or "박물관" */
  categoryLabel?: string;
  address?: string;
  lat: number;
  lng: number;
  /** Meters from the search point, when one was given */
  distanceM?: number;
  phone?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  kakaoPlaceId?: string;
  /** Provider web page (Kakao place page etc.) */
  url?: string;
  regionCode: string;
  /** YYYY-MM-DD, events only */
  eventStart?: string;
  eventEnd?: string;
  /** Already saved as one of our places */
  savedPlaceId?: string;
  /** TourAPI content type, needed for its detail lookup */
  tourContentTypeId?: string;
  /** OpenStreetMap `opening_hours`, as written by mappers */
  openingHours?: string;
}

export type CourseFocus = 'food' | 'sight' | 'event' | 'cafe' | 'activity';
export type CourseTransport = 'car' | 'transit';
/** 0 = 당일, 1 = 1박 2일, 2 = 2박 3일 */
export type CourseNights = 0 | 1 | 2;

export interface CoursePoint {
  name: string;
  lat: number;
  lng: number;
}

export interface CourseRequest {
  regionCode: string;
  focus: CourseFocus[];
  nights: CourseNights;
  transport: CourseTransport;
  /** YYYY-MM-DD, first day of the trip */
  startDate: string;
  /** Where day 1 begins; the region's travel hub when omitted */
  start?: CoursePoint;
  /** Different seeds give different picks for "다시 추천" */
  seed?: number;
}

/** kakao = 카카오모빌리티 길찾기, osrm = OpenStreetMap road routing, estimate = straight line × road factor */
export type RouteSource = 'kakao' | 'osrm' | 'estimate';

export interface RouteLeg {
  distanceM: number;
  durationMin: number;
  source: RouteSource;
  /** [lat, lng] pairs along the road; draw a straight line when missing */
  path?: [number, number][];
}

export type CourseSlot = 'morning' | 'lunch' | 'afternoon' | 'cafe' | 'event' | 'activity' | 'dinner' | 'stay';

export interface CourseStop {
  /** Stable within a course, survives swaps */
  key: string;
  slot: CourseSlot;
  /** HH:MM planned arrival */
  arrive: string;
  dwellMin: number;
  place: RecommendedPlace;
  /** From the previous stop, or from the day's start point for the first stop */
  leg?: RouteLeg;
}

export interface CourseDay {
  /** 1-based */
  day: number;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM the day starts at `start` */
  startTime: string;
  /** Trip start on day 1, last night's stay afterwards */
  start: CoursePoint;
  stops: CourseStop[];
}

export type CourseNoticeCode = 'tour_key_required' | 'no_events' | 'few_places' | 'estimated_routes' | 'provider_error';

export interface CourseNotice {
  code: CourseNoticeCode;
  message: string;
}

export interface CourseDraft {
  request: CourseRequest;
  title: string;
  days: CourseDay[];
  /** Unused candidates per category, offered when swapping a stop */
  alternatives: Partial<Record<RecommendationCategory, RecommendedPlace[]>>;
  notices: CourseNotice[];
  routeSource: RouteSource;
  /** Place providers the stops came from */
  sources: RecommendationSource[];
}

export interface TripCourse {
  id: string;
  request: CourseRequest;
  title: string;
  days: CourseDay[];
  routeSource: RouteSource;
  sources: RecommendationSource[];
  createdBy: string;
  createdAt: string;
}

export interface TripCourseSummary {
  id: string;
  regionCode: string;
  title: string;
  startDate: string;
  nights: CourseNights;
  transport: CourseTransport;
  stopCount: number;
  createdAt: string;
}

/** Extra details for a recommended place (TourAPI detail lookups) */
export interface PlaceExtraInfo {
  overview?: string;
  homepage?: string;
  phone?: string;
  hours?: string;
  restDays?: string;
  fee?: string;
  parking?: string;
  menu?: string;
  checkIn?: string;
  checkOut?: string;
}

export type RecommendationNoticeCode = 'tour_key_required' | 'no_provider' | 'provider_error';

export interface RecommendationPage {
  items: RecommendedPlace[];
  /** Provider that produced `items` */
  source?: RecommendationSource;
  hasMore: boolean;
  /** Explains an empty or degraded list */
  notice?: { code: RecommendationNoticeCode; message: string };
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
