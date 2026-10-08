import { Router } from 'express';
import {
  CITY_FOLDER_MEMO_MAX,
  CITY_FOLDER_TITLE_MAX,
  CITY_PIN_MEMO_MAX,
  CITY_PIN_NAME_MAX,
  getCity,
  getRegion,
  isCityPinCategory,
  type CityFolderDetail,
} from '@tingting/shared';
import { pool } from '../db';
import { handle, HttpError, optionalDate, optionalString, publicBaseUrl, userId } from '../http';
import { CITY_FOLDER_SELECT, mapCityFolder, mapCityPin } from '../mappers';
import { deleteUnreferencedMedia } from '../media-refs';
import { assertCityFolder, isUuid } from './albums';

/** Mounted at /albums/cities: trip folders per 시/군/구 and the places pinned on their map. */
export const cityFoldersRouter = Router();

const ORDER = 'ORDER BY cf.start_date DESC, cf.created_at DESC';

function limited(value: unknown, max: number, label: string): string | null {
  const s = optionalString(value);
  if (s && [...s].length > max) throw new HttpError(400, `${label}은(는) ${max}자까지 쓸 수 있어요`);
  return s;
}

function tripDates(start: unknown, end: unknown): { start: string; end: string | null } {
  const s = optionalDate(start);
  if (!s) throw new HttpError(400, '여행 날짜를 골라 주세요');
  const e = optionalDate(end);
  if (e && e < s) throw new HttpError(400, '끝난 날짜가 시작 날짜보다 빨라요');
  return { start: s, end: e && e !== s ? e : null };
}

function coordinate(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, '위치가 올바르지 않아요');
  return n;
}

async function loadFolder(id: string, base: string) {
  const { rows } = await pool.query(`${CITY_FOLDER_SELECT} WHERE cf.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, '세부 지역 폴더를 찾을 수 없어요');
  return mapCityFolder(rows[0], base);
}

async function loadPin(folderId: string, pinId: unknown) {
  if (!isUuid(pinId)) throw new HttpError(404, '핀을 찾을 수 없어요');
  const { rows } = await pool.query('SELECT * FROM city_folder_pins WHERE id = $1 AND folder_id = $2', [pinId, folderId]);
  if (!rows[0]) throw new HttpError(404, '핀을 찾을 수 없어요');
  return rows[0];
}

cityFoldersRouter.get(
  '/',
  handle(async (req, res) => {
    const where: string[] = [];
    const params: unknown[] = [];
    const regionCode = optionalString(req.query.regionCode);
    const cityCode = optionalString(req.query.cityCode);
    if (regionCode) {
      params.push(regionCode);
      where.push(`cf.region_code = $${params.length}`);
    }
    if (cityCode) {
      params.push(cityCode);
      where.push(`cf.city_code = $${params.length}`);
    }
    const { rows } = await pool.query(`${CITY_FOLDER_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ${ORDER}`, params);
    const base = publicBaseUrl(req);
    res.json(rows.map((r) => mapCityFolder(r, base)));
  }),
);

cityFoldersRouter.post(
  '/',
  handle(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const regionCode = optionalString(body.regionCode) ?? '';
    if (!getRegion(regionCode)) throw new HttpError(400, '지역이 올바르지 않아요');
    const city = getCity(optionalString(body.cityCode));
    if (!city || city.regionCode !== regionCode) throw new HttpError(400, '세부 지역이 올바르지 않아요');
    const dates = tripDates(body.startDate, body.endDate);
    const { rows } = await pool.query(
      `INSERT INTO city_folders (region_code, city_code, city_name, title, memo, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        regionCode,
        city.code,
        city.name,
        limited(body.title, CITY_FOLDER_TITLE_MAX, '폴더 이름'),
        limited(body.memo, CITY_FOLDER_MEMO_MAX, '한 줄 메모'),
        dates.start,
        dates.end,
        userId(req),
      ],
    );
    res.status(201).json(await loadFolder(String(rows[0].id), publicBaseUrl(req)));
  }),
);

cityFoldersRouter.get(
  '/:id',
  handle(async (req, res) => {
    const { id } = await assertCityFolder(pool, req.params.id);
    const base = publicBaseUrl(req);
    const [folder, pins] = await Promise.all([
      loadFolder(id, base),
      pool.query('SELECT * FROM city_folder_pins WHERE folder_id = $1 ORDER BY created_at, id', [id]),
    ]);
    const detail: CityFolderDetail = { folder, pins: pins.rows.map(mapCityPin) };
    res.json(detail);
  }),
);

/** Partial update; `title: null` goes back to the default "속초 · 2026.10" title, `coverPhotoId: null` to the latest photo. */
cityFoldersRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const { id } = await assertCityFolder(pool, req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if ('title' in body) set('title', limited(body.title, CITY_FOLDER_TITLE_MAX, '폴더 이름'));
    if ('memo' in body) set('memo', limited(body.memo, CITY_FOLDER_MEMO_MAX, '한 줄 메모'));
    if ('startDate' in body || 'endDate' in body) {
      const { rows } = await pool.query('SELECT start_date, end_date FROM city_folders WHERE id = $1', [id]);
      const dates = tripDates(
        'startDate' in body ? body.startDate : rows[0].start_date,
        'endDate' in body ? body.endDate : rows[0].end_date,
      );
      set('start_date', dates.start);
      set('end_date', dates.end);
    }
    if ('coverPhotoId' in body) {
      const cover = body.coverPhotoId == null ? null : String(body.coverPhotoId);
      if (cover) {
        const { rowCount } = await pool.query('SELECT 1 FROM photos WHERE id = $1 AND city_folder_id = $2', [isUuid(cover) ? cover : null, id]);
        if (!rowCount) throw new HttpError(400, '이 폴더에 있는 사진만 대표 사진으로 고를 수 있어요');
      }
      set('cover_photo_id', cover);
    }
    if (sets.length === 0) throw new HttpError(400, '변경할 내용이 없어요');
    params.push(id);
    await pool.query(`UPDATE city_folders SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params);
    res.json(await loadFolder(id, publicBaseUrl(req)));
  }),
);

/**
 * `?photos=keep` leaves the photos in the province album, `?photos=delete` removes them too.
 * Without `photos`, a folder with photos answers 409.
 */
cityFoldersRouter.delete(
  '/:id',
  handle(async (req, res) => {
    const mode = optionalString(req.query.photos);
    const client = await pool.connect();
    let removedUris: unknown[] = [];
    try {
      await client.query('BEGIN');
      const { id } = await assertCityFolder(client, req.params.id);
      await client.query('SELECT 1 FROM city_folders WHERE id = $1 FOR UPDATE', [id]);
      const { rows: countRows } = await client.query('SELECT COUNT(*) AS n FROM photos WHERE city_folder_id = $1', [id]);
      const photoCount = Number(countRows[0].n);
      if (photoCount > 0) {
        if (mode === 'delete') {
          const { rows } = await client.query('DELETE FROM photos WHERE city_folder_id = $1 RETURNING original_uri, edited_uri', [id]);
          removedUris = rows.flatMap((r) => [r.original_uri, r.edited_uri]);
        } else if (mode === 'keep') {
          await client.query('UPDATE photos SET city_folder_id = NULL WHERE city_folder_id = $1', [id]);
        } else {
          throw new HttpError(409, `폴더에 사진 ${photoCount}장이 있어요. 사진을 지역 앨범에 남길지 함께 지울지 골라 주세요`);
        }
      }
      await client.query('DELETE FROM city_folders WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    await deleteUnreferencedMedia(removedUris as string[]);
    res.status(204).end();
  }),
);

function pinFields(body: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!partial || 'name' in body) {
    const name = limited(body.name, CITY_PIN_NAME_MAX, '장소 이름');
    if (!name) throw new HttpError(400, '장소 이름을 입력해 주세요');
    out.name = name;
  }
  if (!partial || 'category' in body) {
    if (!isCityPinCategory(body.category)) throw new HttpError(400, '종류를 골라 주세요');
    out.category = body.category;
  }
  if (!partial || 'lat' in body || 'lng' in body) {
    out.lat = coordinate(body.lat, 32, 39.5);
    out.lng = coordinate(body.lng, 124, 132.5);
  }
  if (!partial || 'memo' in body) out.memo = limited(body.memo, CITY_PIN_MEMO_MAX, '메모');
  if (!partial || 'address' in body) out.address = limited(body.address, 200, '주소');
  if (!partial || 'kakaoPlaceId' in body) out.kakao_place_id = limited(body.kakaoPlaceId, 40, '카카오 장소 ID');
  return out;
}

cityFoldersRouter.post(
  '/:id/pins',
  handle(async (req, res) => {
    const { id } = await assertCityFolder(pool, req.params.id);
    const f = pinFields((req.body ?? {}) as Record<string, unknown>, false);
    const { rows } = await pool.query(
      `INSERT INTO city_folder_pins (folder_id, name, memo, category, lat, lng, address, kakao_place_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, f.name, f.memo, f.category, f.lat, f.lng, f.address, f.kakao_place_id, userId(req)],
    );
    await pool.query('UPDATE city_folders SET updated_at = now() WHERE id = $1', [id]);
    res.status(201).json(mapCityPin(rows[0]));
  }),
);

cityFoldersRouter.patch(
  '/:id/pins/:pinId',
  handle(async (req, res) => {
    const { id } = await assertCityFolder(pool, req.params.id);
    const pin = await loadPin(id, req.params.pinId);
    const fields = pinFields((req.body ?? {}) as Record<string, unknown>, true);
    const entries = Object.entries(fields);
    if (entries.length === 0) throw new HttpError(400, '변경할 내용이 없어요');
    const sets = entries.map(([column], i) => `${column} = $${i + 1}`);
    const { rows } = await pool.query(
      `UPDATE city_folder_pins SET ${sets.join(', ')}, updated_at = now() WHERE id = $${entries.length + 1} RETURNING *`,
      [...entries.map(([, v]) => v), pin.id],
    );
    res.json(mapCityPin(rows[0]));
  }),
);

cityFoldersRouter.delete(
  '/:id/pins/:pinId',
  handle(async (req, res) => {
    const { id } = await assertCityFolder(pool, req.params.id);
    const pin = await loadPin(id, req.params.pinId);
    await pool.query('DELETE FROM city_folder_pins WHERE id = $1', [pin.id]);
    res.status(204).end();
  }),
);
