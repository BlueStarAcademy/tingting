import { Router } from 'express';
import {
  getRegion,
  isPlaceCategory,
  REGION_CENTERS,
  resolveRegionCode,
  type PlaceDetail,
} from '@tingting/shared';
import { pool } from '../db';
import { handle, HttpError, optionalDate, optionalString, publicBaseUrl, userId } from '../http';
import { geocodeAddress, searchKakaoPlaces } from '../kakao';
import { mapPhoto, mapPlace, mapReview, mapVisit, PHOTO_SELECT, PLACE_SELECT } from '../mappers';

export const placesRouter = Router();

placesRouter.get(
  '/',
  handle(async (req, res) => {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };
    const region = optionalString(req.query.regionCode);
    const category = optionalString(req.query.category);
    const status = optionalString(req.query.status);
    if (region) add('p.region_code = ?', region);
    if (category) add('p.category = ?', category);
    if (status) add('p.status = ?', status);
    const { rows } = await pool.query(
      `${PLACE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY (p.status = 'visited'), p.event_start NULLS LAST, p.created_at DESC`,
      params,
    );
    const base = publicBaseUrl(req);
    res.json(rows.map((r) => mapPlace(r, base)));
  }),
);

placesRouter.get(
  '/search',
  handle(async (req, res) => {
    const q = optionalString(req.query.q);
    if (!q) throw new HttpError(400, '검색어를 입력해 주세요');
    const region = getRegion(optionalString(req.query.region) ?? '');
    const query = region && !q.includes(region.name) ? `${region.name} ${q}` : q;
    const results = await searchKakaoPlaces(query);
    const ids = results.map((r) => r.kakaoPlaceId);
    if (ids.length) {
      const { rows } = await pool.query('SELECT id, kakao_place_id FROM places WHERE kakao_place_id = ANY($1)', [ids]);
      const saved = new Map(rows.map((r) => [String(r.kakao_place_id), String(r.id)]));
      for (const r of results) r.savedPlaceId = saved.get(r.kakaoPlaceId);
    }
    res.json(results);
  }),
);

placesRouter.get(
  '/:id',
  handle(async (req, res) => {
    const base = publicBaseUrl(req);
    const { rows } = await pool.query(`${PLACE_SELECT} WHERE p.id = $1`, [req.params.id]);
    if (!rows[0]) throw new HttpError(404, '장소를 찾을 수 없어요');
    const [reviews, visits, photos] = await Promise.all([
      pool.query('SELECT * FROM place_reviews WHERE place_id = $1', [req.params.id]),
      pool.query('SELECT * FROM visits WHERE place_id = $1 ORDER BY visited_on DESC, created_at DESC', [req.params.id]),
      pool.query(`${PHOTO_SELECT} WHERE ph.place_id = $1 ORDER BY ph.taken_at DESC`, [req.params.id]),
    ]);
    const detail: PlaceDetail = {
      place: mapPlace(rows[0], base),
      reviews: reviews.rows.map(mapReview),
      visits: visits.rows.map(mapVisit),
      photos: photos.rows.map((r) => mapPhoto(r, base)),
    };
    res.json(detail);
  }),
);

async function resolveLocation(body: Record<string, unknown>): Promise<{ lat: number; lng: number; address: string | null; regionCode: string }> {
  let address = optionalString(body.address);
  let lat = typeof body.lat === 'number' ? body.lat : NaN;
  let lng = typeof body.lng === 'number' ? body.lng : NaN;
  const requestedRegion = optionalString(body.regionCode);

  if ((Number.isNaN(lat) || Number.isNaN(lng)) && address) {
    const geo = await geocodeAddress(address).catch(() => null);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    const center = requestedRegion ? REGION_CENTERS[requestedRegion] : undefined;
    if (!center) throw new HttpError(400, '주소를 찾을 수 없어요. 지역을 선택하거나 정확한 주소를 입력해 주세요');
    lat = center.lat;
    lng = center.lng;
  }
  const regionCode = requestedRegion && getRegion(requestedRegion) ? requestedRegion : resolveRegionCode(address, lat, lng);
  return { lat, lng, address, regionCode };
}

placesRouter.post(
  '/',
  handle(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = optionalString(body.name);
    if (!name) throw new HttpError(400, '장소 이름을 입력해 주세요');
    if (!isPlaceCategory(body.category)) throw new HttpError(400, '카테고리를 선택해 주세요');
    const loc = await resolveLocation(body);
    const kakaoPlaceId = optionalString(body.kakaoPlaceId);

    const { rows } = await pool.query(
      `INSERT INTO places (region_code, category, name, address, lat, lng, phone, url, kakao_place_id, kakao_category,
         event_start, event_end, memo, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (kakao_place_id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [
        loc.regionCode,
        body.category,
        name,
        loc.address,
        loc.lat,
        loc.lng,
        optionalString(body.phone),
        optionalString(body.url),
        kakaoPlaceId,
        optionalString(body.kakaoCategory),
        optionalDate(body.eventStart),
        optionalDate(body.eventEnd),
        optionalString(body.memo),
        body.status === 'visited' ? 'visited' : 'wish',
        userId(req),
      ],
    );
    const created = await pool.query(`${PLACE_SELECT} WHERE p.id = $1`, [rows[0].id]);
    res.status(201).json(mapPlace(created.rows[0], publicBaseUrl(req)));
  }),
);

placesRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if ('name' in body) {
      const name = optionalString(body.name);
      if (!name) throw new HttpError(400, '장소 이름을 입력해 주세요');
      set('name', name);
    }
    if ('category' in body) {
      if (!isPlaceCategory(body.category)) throw new HttpError(400, '카테고리가 올바르지 않아요');
      set('category', body.category);
    }
    if ('status' in body) set('status', body.status === 'visited' ? 'visited' : 'wish');
    if ('regionCode' in body && getRegion(String(body.regionCode))) set('region_code', body.regionCode);
    for (const [key, column] of [['address', 'address'], ['phone', 'phone'], ['url', 'url'], ['memo', 'memo']] as const) {
      if (key in body) set(column, optionalString(body[key]));
    }
    const newAddress = 'address' in body ? optionalString(body.address) : undefined;
    if (newAddress) {
      const geo = await geocodeAddress(newAddress).catch(() => null);
      if (geo) {
        set('lat', geo.lat);
        set('lng', geo.lng);
        if (!('regionCode' in body)) set('region_code', resolveRegionCode(newAddress, geo.lat, geo.lng));
      }
    }
    if ('eventStart' in body) set('event_start', optionalDate(body.eventStart));
    if ('eventEnd' in body) set('event_end', optionalDate(body.eventEnd));
    if (sets.length === 0) throw new HttpError(400, '변경할 내용이 없어요');

    params.push(req.params.id);
    const { rowCount } = await pool.query(
      `UPDATE places SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`,
      params,
    );
    if (!rowCount) throw new HttpError(404, '장소를 찾을 수 없어요');
    const { rows } = await pool.query(`${PLACE_SELECT} WHERE p.id = $1`, [req.params.id]);
    res.json(mapPlace(rows[0], publicBaseUrl(req)));
  }),
);

placesRouter.delete(
  '/:id',
  handle(async (req, res) => {
    await pool.query('DELETE FROM places WHERE id = $1', [req.params.id]);
    res.status(204).end();
  }),
);

placesRouter.put(
  '/:id/review',
  handle(async (req, res) => {
    const rating = Math.round(Number(req.body?.rating));
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, '별점은 1~5점이에요');
    const { rows } = await pool.query(
      `INSERT INTO place_reviews (place_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)
       ON CONFLICT (place_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = now()
       RETURNING *`,
      [req.params.id, userId(req), rating, optionalString(req.body?.comment)],
    );
    res.json(mapReview(rows[0]));
  }),
);

placesRouter.post(
  '/:id/visits',
  handle(async (req, res) => {
    const visitedOn = optionalDate(req.body?.visitedOn) ?? new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `INSERT INTO visits (place_id, visited_on, note, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, visitedOn, optionalString(req.body?.note), userId(req)],
    );
    await pool.query(`UPDATE places SET status = 'visited', updated_at = now() WHERE id = $1`, [req.params.id]);
    res.status(201).json(mapVisit(rows[0]));
  }),
);

export const visitsRouter = Router();

visitsRouter.delete(
  '/:id',
  handle(async (req, res) => {
    await pool.query('DELETE FROM visits WHERE id = $1', [req.params.id]);
    res.status(204).end();
  }),
);
