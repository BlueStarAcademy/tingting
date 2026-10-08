import type {
  AlbumFolder,
  CityFolder,
  CityPin,
  CityPinCategory,
  CoupleUser,
  Photo,
  Place,
  PlaceCategory,
  PlaceReview,
  PlaceStatus,
  TripPlan,
  Visit,
} from '@tingting/shared';
import { toPublicUri } from './http';

type Row = Record<string, unknown>;

const str = (v: unknown): string | undefined => (v == null ? undefined : String(v));
const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));

export function mapUser(row: Row, base: string): CoupleUser {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    avatarUri: toPublicUri(str(row.avatar_uri), base),
  };
}

export function mapPlace(row: Row, base: string): Place {
  return {
    id: String(row.id),
    regionCode: String(row.region_code),
    category: row.category as PlaceCategory,
    name: String(row.name),
    address: str(row.address),
    lat: Number(row.lat),
    lng: Number(row.lng),
    phone: str(row.phone),
    url: str(row.url),
    kakaoPlaceId: str(row.kakao_place_id),
    kakaoCategory: str(row.kakao_category),
    eventStart: str(row.event_start),
    eventEnd: str(row.event_end),
    memo: str(row.memo),
    status: row.status as PlaceStatus,
    createdBy: String(row.created_by ?? ''),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    coverPhotoUri: toPublicUri(str(row.cover_photo_uri), base),
    photoCount: row.photo_count == null ? undefined : Number(row.photo_count),
  };
}

export function mapReview(row: Row): PlaceReview {
  return {
    placeId: String(row.place_id),
    userId: String(row.user_id),
    rating: Number(row.rating),
    comment: str(row.comment),
    updatedAt: iso(row.updated_at),
  };
}

export function mapVisit(row: Row): Visit {
  return {
    id: String(row.id),
    placeId: String(row.place_id),
    visitedOn: String(row.visited_on),
    note: str(row.note),
    createdBy: String(row.created_by ?? ''),
    createdAt: iso(row.created_at),
  };
}

export function mapPhoto(row: Row, base: string): Photo {
  return {
    id: String(row.id),
    placeId: str(row.place_id),
    visitId: str(row.visit_id),
    regionCode: str(row.effective_region_code ?? row.region_code),
    albumRegionCode: str(row.region_code),
    folderId: str(row.folder_id),
    cityFolderId: str(row.city_folder_id),
    placeName: str(row.place_name),
    originalUri: toPublicUri(String(row.original_uri), base)!,
    editedUri: toPublicUri(str(row.edited_uri), base),
    takenAt: iso(row.taken_at),
    createdBy: String(row.created_by ?? ''),
    createdAt: iso(row.created_at),
  };
}

export function mapPlan(row: Row): TripPlan {
  return {
    id: String(row.id),
    date: String(row.plan_date),
    title: String(row.title),
    placeId: str(row.place_id),
    placeName: str(row.place_name),
    placeRegionCode: str(row.place_region_code),
    memo: str(row.memo),
    done: Boolean(row.done),
    courseId: str(row.course_id),
    createdBy: String(row.created_by ?? ''),
    createdAt: iso(row.created_at),
  };
}

/** Places with cover photo + photo count, for list views. */
export const PLACE_SELECT = `
  SELECT p.*,
    (SELECT COALESCE(ph.edited_uri, ph.original_uri) FROM photos ph
      WHERE ph.place_id = p.id ORDER BY ph.taken_at DESC LIMIT 1) AS cover_photo_uri,
    (SELECT COUNT(*) FROM photos ph WHERE ph.place_id = p.id) AS photo_count
  FROM places p`;

export function mapFolder(row: Row, base: string): AlbumFolder {
  return {
    id: String(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
    createdBy: String(row.created_by ?? ''),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    photoCount: Number(row.photo_count ?? 0),
    coverPhotoUri: toPublicUri(str(row.cover_photo_uri), base),
  };
}

/** `ph.region_code` is the album region; `effective_region_code` falls back to the place's region. */
export const PHOTO_SELECT = `
  SELECT ph.*, COALESCE(ph.region_code, pl.region_code) AS effective_region_code, pl.name AS place_name
  FROM photos ph
  LEFT JOIN places pl ON pl.id = ph.place_id`;

export const FOLDER_SELECT = `
  SELECT f.*,
    (SELECT COUNT(*) FROM photos ph WHERE ph.folder_id = f.id) AS photo_count,
    (SELECT COALESCE(ph.edited_uri, ph.original_uri) FROM photos ph
      WHERE ph.folder_id = f.id ORDER BY ph.taken_at DESC, ph.id DESC LIMIT 1) AS cover_photo_uri
  FROM album_folders f`;

export function mapCityFolder(row: Row, base: string): CityFolder {
  return {
    id: String(row.id),
    regionCode: String(row.region_code),
    cityCode: String(row.city_code),
    cityName: String(row.city_name),
    title: str(row.title),
    startDate: String(row.start_date),
    endDate: str(row.end_date),
    memo: str(row.memo),
    coverPhotoId: str(row.cover_photo_id),
    coverPhotoUri: toPublicUri(str(row.cover_photo_uri), base),
    photoCount: Number(row.photo_count ?? 0),
    pinCount: Number(row.pin_count ?? 0),
    createdBy: String(row.created_by ?? ''),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function mapCityPin(row: Row): CityPin {
  return {
    id: String(row.id),
    folderId: String(row.folder_id),
    name: String(row.name),
    memo: str(row.memo),
    category: row.category as CityPinCategory,
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: str(row.address),
    kakaoPlaceId: str(row.kakao_place_id),
    createdBy: String(row.created_by ?? ''),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/** The chosen cover only while it is still in the folder; otherwise the latest photo. */
export const CITY_FOLDER_SELECT = `
  SELECT cf.*,
    (SELECT COUNT(*) FROM photos ph WHERE ph.city_folder_id = cf.id) AS photo_count,
    (SELECT COUNT(*) FROM city_folder_pins pn WHERE pn.folder_id = cf.id) AS pin_count,
    COALESCE(
      (SELECT COALESCE(ph.edited_uri, ph.original_uri) FROM photos ph
        WHERE ph.id = cf.cover_photo_id AND ph.city_folder_id = cf.id),
      (SELECT COALESCE(ph.edited_uri, ph.original_uri) FROM photos ph
        WHERE ph.city_folder_id = cf.id ORDER BY ph.taken_at DESC, ph.id DESC LIMIT 1)
    ) AS cover_photo_uri
  FROM city_folders cf`;

export const PLAN_SELECT = `
  SELECT pn.*, pl.name AS place_name, pl.region_code AS place_region_code
  FROM plans pn
  LEFT JOIN places pl ON pl.id = pn.place_id`;
