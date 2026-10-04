import { Router } from 'express';
import {
  distanceMeters,
  getRegion,
  isRecommendationCategory,
  type RecommendationPage,
  type RecommendationSource,
} from '@tingting/shared';
import { pool } from '../db';
import { handle, HttpError, optionalString } from '../http';
import { recommendForRegion, searchNearby, type SearchPoint } from '../recommend';

const SOURCES: RecommendationSource[] = ['tour', 'kakao', 'osm'];

function pageParam(value: unknown): number {
  const page = parseInt(String(value ?? '1'), 10);
  return Number.isFinite(page) && page >= 1 && page <= 45 ? page : 1;
}

function sourceParam(value: unknown): RecommendationSource | undefined {
  return SOURCES.find((s) => s === value);
}

function coordParam(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Fills distance from the caller and links results we have already saved as places. */
async function finish(
  page: RecommendationPage,
  from: { lat: number; lng: number } | null,
  sortByDistance = false,
): Promise<RecommendationPage> {
  if (page.items.length === 0) return page;
  const { rows } = await pool.query('SELECT id, kakao_place_id, name, lat, lng FROM places');
  const byKakao = new Map(rows.filter((r) => r.kakao_place_id).map((r) => [String(r.kakao_place_id), String(r.id)]));
  for (const item of page.items) {
    if (from) item.distanceM = distanceMeters(from.lat, from.lng, item.lat, item.lng);
    const sameSpot = rows.find(
      (r) => r.name === item.name && distanceMeters(Number(r.lat), Number(r.lng), item.lat, item.lng) < 200,
    );
    const saved = (item.kakaoPlaceId && byKakao.get(item.kakaoPlaceId)) || (sameSpot ? String(sameSpot.id) : undefined);
    if (saved) item.savedPlaceId = saved;
  }
  if (sortByDistance) page.items.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  return page;
}

export const recommendationsRouter = Router();

recommendationsRouter.get(
  '/',
  handle(async (req, res) => {
    const regionCode = optionalString(req.query.regionCode) ?? '';
    if (!getRegion(regionCode)) throw new HttpError(400, '지역을 선택해 주세요');
    const category = req.query.category;
    if (!isRecommendationCategory(category)) throw new HttpError(400, '카테고리가 올바르지 않아요');
    const lat = coordParam(req.query.lat, 32, 39.5);
    const lng = coordParam(req.query.lng, 124, 132);
    const page = await recommendForRegion(regionCode, category, pageParam(req.query.page), sourceParam(req.query.source));
    res.json(await finish(page, lat != null && lng != null ? { lat, lng } : null));
  }),
);

export const nearbyRouter = Router();

nearbyRouter.get(
  '/',
  handle(async (req, res) => {
    const lat = coordParam(req.query.lat, 32, 39.5);
    const lng = coordParam(req.query.lng, 124, 132);
    if (lat == null || lng == null) throw new HttpError(400, '한국 안의 위치에서만 근처 검색을 할 수 있어요');
    const radius = Math.round(coordParam(req.query.radius, 100, 20000) ?? 1000);
    const query = optionalString(req.query.query)?.slice(0, 50);
    const category = req.query.category;
    const target = query ? { query } : isRecommendationCategory(category) ? { category } : null;
    if (!target) throw new HttpError(400, '카테고리나 검색어를 입력해 주세요');
    const point: SearchPoint = { lat, lng, radius };
    const page = await searchNearby(point, target, pageParam(req.query.page), sourceParam(req.query.source));
    res.json(await finish(page, { lat, lng }, true));
  }),
);
