import type { CoupleUser, Photo, Place, PlaceCategory, PlaceReview, PlaceStatus, TripPlan, Visit } from '@tingting/shared';
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
    regionCode: str(row.region_code),
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

export const PHOTO_SELECT = `
  SELECT ph.*, pl.region_code, pl.name AS place_name
  FROM photos ph
  LEFT JOIN places pl ON pl.id = ph.place_id`;

export const PLAN_SELECT = `
  SELECT pn.*, pl.name AS place_name, pl.region_code AS place_region_code
  FROM plans pn
  LEFT JOIN places pl ON pl.id = pn.place_id`;
