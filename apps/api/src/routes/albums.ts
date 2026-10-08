import { Router } from 'express';
import type { PoolClient } from 'pg';
import { getRegion, type AlbumSummary, type PhotoPage } from '@tingting/shared';
import { pool } from '../db';
import { handle, HttpError, optionalString, publicBaseUrl, toPublicUri, userId } from '../http';
import { FOLDER_SELECT, mapFolder, mapPhoto, PHOTO_SELECT } from '../mappers';
import { deleteUnreferencedMedia } from '../media-refs';

export const albumsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BULK = 500;
const MAX_FOLDER_NAME = 40;

export type Placement = { regionCode: string | null; folderId: string | null; cityFolderId: string | null };

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function folderName(value: unknown): string {
  const name = optionalString(value);
  if (!name) throw new HttpError(400, '폴더 이름을 입력해 주세요');
  if (name.length > MAX_FOLDER_NAME) throw new HttpError(400, `폴더 이름은 ${MAX_FOLDER_NAME}자까지 쓸 수 있어요`);
  return name;
}

function photoIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, '사진을 선택해 주세요');
  if (value.length > MAX_BULK) throw new HttpError(400, `한 번에 ${MAX_BULK}장까지 처리할 수 있어요`);
  if (!value.every(isUuid)) throw new HttpError(400, '사진 ID가 올바르지 않아요');
  return [...new Set(value as string[])];
}

async function assertFolder(db: Pick<PoolClient, 'query'>, id: unknown): Promise<string> {
  if (!isUuid(id)) throw new HttpError(404, '폴더를 찾을 수 없어요');
  const { rowCount } = await db.query('SELECT 1 FROM album_folders WHERE id = $1', [id]);
  if (!rowCount) throw new HttpError(404, '폴더를 찾을 수 없어요');
  return id;
}

/** The city folder's id and province; photos filed there keep that province as their region album. */
export async function assertCityFolder(db: Pick<PoolClient, 'query'>, id: unknown): Promise<{ id: string; regionCode: string }> {
  if (!isUuid(id)) throw new HttpError(404, '세부 지역 폴더를 찾을 수 없어요');
  const { rows } = await db.query('SELECT region_code FROM city_folders WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, '세부 지역 폴더를 찾을 수 없어요');
  return { id, regionCode: String(rows[0].region_code) };
}

/** `{ kind: 'region' | 'folder' | 'city' | 'none', ... }` -> the columns to write. */
export async function resolveTarget(db: Pick<PoolClient, 'query'>, target: unknown): Promise<Placement> {
  const t = (target ?? {}) as Record<string, unknown>;
  if (t.kind === 'region') {
    const code = optionalString(t.regionCode);
    if (!code || !getRegion(code)) throw new HttpError(400, '지역이 올바르지 않아요');
    return { regionCode: code, folderId: null, cityFolderId: null };
  }
  if (t.kind === 'folder') return { regionCode: null, folderId: await assertFolder(db, t.folderId), cityFolderId: null };
  if (t.kind === 'city') {
    const city = await assertCityFolder(db, t.cityFolderId);
    return { regionCode: city.regionCode, folderId: null, cityFolderId: city.id };
  }
  if (t.kind === 'none') return { regionCode: null, folderId: null, cityFolderId: null };
  throw new HttpError(400, '옮길 앨범을 선택해 주세요');
}

/** `region:SEO`, `folder:<uuid>`, `city:<uuid>` or `none`, for query strings. */
function parseTargetParam(value: unknown): unknown {
  const s = optionalString(value) ?? '';
  if (s === 'none') return { kind: 'none' };
  const [kind, id] = s.split(':');
  if (kind === 'region') return { kind, regionCode: id };
  if (kind === 'folder') return { kind, folderId: id };
  if (kind === 'city') return { kind, cityFolderId: id };
  return null;
}

function encodeCursor(ts: string, id: string): string {
  return Buffer.from(JSON.stringify([ts, id])).toString('base64url');
}

function decodeCursor(value: unknown): [string, string] | null {
  const s = optionalString(value);
  if (!s) return null;
  try {
    const parsed = JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
    if (Array.isArray(parsed) && typeof parsed[0] === 'string' && isUuid(parsed[1])) return [parsed[0], parsed[1]];
  } catch {
    // fall through
  }
  throw new HttpError(400, '잘못된 페이지 정보예요');
}

albumsRouter.get(
  '/summary',
  handle(async (req, res) => {
    const base = publicBaseUrl(req);
    const [regions, folders, counts, cities] = await Promise.all([
      pool.query(`
        SELECT r.region_code, r.photo_count, c.uri AS cover_photo_uri
        FROM (SELECT region_code, COUNT(*) AS photo_count FROM photos
              WHERE region_code IS NOT NULL GROUP BY region_code) r
        LEFT JOIN LATERAL (
          SELECT COALESCE(ph.edited_uri, ph.original_uri) AS uri FROM photos ph
          WHERE ph.region_code = r.region_code ORDER BY ph.taken_at DESC, ph.id DESC LIMIT 1
        ) c ON true`),
      pool.query(`${FOLDER_SELECT} ORDER BY f.sort_order, f.created_at`),
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE region_code IS NULL AND folder_id IS NULL) AS unsorted,
        COUNT(*) AS total
        FROM photos`),
      pool.query(`
        SELECT cf.region_code, cf.city_code, COUNT(*) AS folder_count, COALESCE(SUM(p.n), 0) AS photo_count
        FROM city_folders cf
        LEFT JOIN (SELECT city_folder_id, COUNT(*) AS n FROM photos WHERE city_folder_id IS NOT NULL GROUP BY city_folder_id) p
          ON p.city_folder_id = cf.id
        GROUP BY cf.region_code, cf.city_code`),
    ]);
    const summary: AlbumSummary = {
      regions: regions.rows.map((r) => ({
        regionCode: String(r.region_code),
        photoCount: Number(r.photo_count),
        coverPhotoUri: toPublicUri(r.cover_photo_uri, base),
      })),
      folders: folders.rows.map((r) => mapFolder(r, base)),
      cities: cities.rows.map((r) => ({
        regionCode: String(r.region_code),
        cityCode: String(r.city_code),
        folderCount: Number(r.folder_count),
        photoCount: Number(r.photo_count),
      })),
      unsortedCount: Number(counts.rows[0].unsorted),
      totalCount: Number(counts.rows[0].total),
    };
    res.json(summary);
  }),
);

albumsRouter.get(
  '/photos',
  handle(async (req, res) => {
    const scope = optionalString(req.query.scope) ?? 'all';
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 60));
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, ...values: unknown[]) => {
      let sql = clause;
      for (const value of values) {
        params.push(value);
        sql = sql.replace('?', `$${params.length}`);
      }
      where.push(sql);
    };

    if (scope === 'region') {
      const code = optionalString(req.query.regionCode);
      if (!code || !getRegion(code)) throw new HttpError(400, '지역이 올바르지 않아요');
      add('ph.region_code = ?', code);
    } else if (scope === 'folder') {
      add('ph.folder_id = ?', await assertFolder(pool, req.query.folderId));
    } else if (scope === 'city') {
      add('ph.city_folder_id = ?', (await assertCityFolder(pool, req.query.cityFolderId)).id);
    } else if (scope === 'unsorted') {
      where.push('ph.region_code IS NULL AND ph.folder_id IS NULL');
    } else if (scope !== 'all') {
      throw new HttpError(400, '앨범 종류가 올바르지 않아요');
    }
    const cursor = decodeCursor(req.query.cursor);
    if (cursor) add('(ph.taken_at, ph.id) < (?::timestamptz, ?::uuid)', cursor[0], cursor[1]);

    params.push(limit + 1);
    // taken_at::text keeps microseconds, which a JS Date would drop and break the keyset cursor.
    const { rows } = await pool.query(
      `SELECT sub.*, sub.taken_at::text AS cursor_ts FROM (
         ${PHOTO_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY ph.taken_at DESC, ph.id DESC
         LIMIT $${params.length}
       ) sub`,
      params,
    );
    const base = publicBaseUrl(req);
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    const page: PhotoPage = {
      items: pageRows.map((r) => mapPhoto(r, base)),
      nextCursor: hasMore && last ? encodeCursor(String(last.cursor_ts), String(last.id)) : undefined,
    };
    res.json(page);
  }),
);

albumsRouter.post(
  '/photos/move',
  handle(async (req, res) => {
    const ids = photoIds(req.body?.photoIds);
    const target = await resolveTarget(pool, req.body?.target);
    const { rowCount } = await pool.query(
      'UPDATE photos SET region_code = $1, folder_id = $2, city_folder_id = $3 WHERE id = ANY($4::uuid[])',
      [target.regionCode, target.folderId, target.cityFolderId, ids],
    );
    res.json({ updated: rowCount ?? 0 });
  }),
);

albumsRouter.post(
  '/photos/copy',
  handle(async (req, res) => {
    const ids = photoIds(req.body?.photoIds);
    const target = await resolveTarget(pool, req.body?.target);
    // FOR SHARE waits for a concurrent delete of the source, so we never copy a row whose files are being unlinked.
    const { rows } = await pool.query(
      `INSERT INTO photos (place_id, visit_id, original_uri, edited_uri, taken_at, created_by, region_code, folder_id, city_folder_id)
       SELECT place_id, visit_id, original_uri, edited_uri, taken_at, $1, $2, $3, $4
       FROM (SELECT * FROM photos WHERE id = ANY($5::uuid[]) FOR SHARE) src
       RETURNING id`,
      [userId(req), target.regionCode, target.folderId, target.cityFolderId, ids],
    );
    const base = publicBaseUrl(req);
    const created = rows.length
      ? await pool.query(`${PHOTO_SELECT} WHERE ph.id = ANY($1::uuid[]) ORDER BY ph.taken_at DESC, ph.id DESC`, [
          rows.map((r) => r.id),
        ])
      : { rows: [] };
    res.status(201).json({ items: created.rows.map((r) => mapPhoto(r, base)) });
  }),
);

albumsRouter.post(
  '/photos/delete',
  handle(async (req, res) => {
    const ids = photoIds(req.body?.photoIds);
    const { rows } = await pool.query('DELETE FROM photos WHERE id = ANY($1::uuid[]) RETURNING original_uri, edited_uri', [ids]);
    await deleteUnreferencedMedia(rows.flatMap((r) => [r.original_uri, r.edited_uri]));
    res.json({ deleted: rows.length });
  }),
);

albumsRouter.get(
  '/folders',
  handle(async (req, res) => {
    const base = publicBaseUrl(req);
    const { rows } = await pool.query(`${FOLDER_SELECT} ORDER BY f.sort_order, f.created_at`);
    res.json(rows.map((r) => mapFolder(r, base)));
  }),
);

async function loadFolder(id: string, base: string) {
  const { rows } = await pool.query(`${FOLDER_SELECT} WHERE f.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, '폴더를 찾을 수 없어요');
  return mapFolder(rows[0], base);
}

async function assertUniqueName(name: string, exceptId?: string): Promise<void> {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM album_folders WHERE lower(btrim(name)) = lower($1) AND ($2::uuid IS NULL OR id <> $2::uuid)',
    [name, exceptId ?? null],
  );
  if (rowCount) throw new HttpError(409, '같은 이름의 폴더가 이미 있어요');
}

albumsRouter.post(
  '/folders',
  handle(async (req, res) => {
    const name = folderName(req.body?.name);
    await assertUniqueName(name);
    const { rows } = await pool.query(
      `INSERT INTO album_folders (name, sort_order, created_by)
       VALUES ($1, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM album_folders), $2) RETURNING id`,
      [name, userId(req)],
    );
    res.status(201).json(await loadFolder(String(rows[0].id), publicBaseUrl(req)));
  }),
);

albumsRouter.post(
  '/folders/reorder',
  handle(async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.every(isUuid)) throw new HttpError(400, '폴더 순서가 올바르지 않아요');
    await pool.query(
      `UPDATE album_folders f SET sort_order = o.ord - 1, updated_at = now()
       FROM unnest($1::uuid[]) WITH ORDINALITY AS o(id, ord)
       WHERE f.id = o.id`,
      [ids],
    );
    const base = publicBaseUrl(req);
    const { rows } = await pool.query(`${FOLDER_SELECT} ORDER BY f.sort_order, f.created_at`);
    res.json(rows.map((r) => mapFolder(r, base)));
  }),
);

albumsRouter.patch(
  '/folders/:id',
  handle(async (req, res) => {
    const id = await assertFolder(pool, req.params.id);
    const name = folderName(req.body?.name);
    await assertUniqueName(name, id);
    await pool.query('UPDATE album_folders SET name = $1, updated_at = now() WHERE id = $2', [name, id]);
    res.json(await loadFolder(id, publicBaseUrl(req)));
  }),
);

/**
 * `?photos=delete` removes the folder's photos too; `?photos=move&target=region:SEO|folder:<id>|none`
 * moves them first. Without `photos`, a non-empty folder answers 409.
 */
albumsRouter.delete(
  '/folders/:id',
  handle(async (req, res) => {
    const mode = optionalString(req.query.photos);
    const client = await pool.connect();
    let removedUris: unknown[] = [];
    try {
      await client.query('BEGIN');
      const id = await assertFolder(client, req.params.id);
      await client.query('SELECT 1 FROM album_folders WHERE id = $1 FOR UPDATE', [id]);
      const { rows: countRows } = await client.query('SELECT COUNT(*) AS n FROM photos WHERE folder_id = $1', [id]);
      const photoCount = Number(countRows[0].n);
      if (photoCount > 0) {
        if (mode === 'delete') {
          const { rows } = await client.query('DELETE FROM photos WHERE folder_id = $1 RETURNING original_uri, edited_uri', [id]);
          removedUris = rows.flatMap((r) => [r.original_uri, r.edited_uri]);
        } else if (mode === 'move') {
          const target = await resolveTarget(client, parseTargetParam(req.query.target));
          if (target.folderId === id) throw new HttpError(400, '지우는 폴더로는 옮길 수 없어요');
          await client.query('UPDATE photos SET region_code = $1, folder_id = $2, city_folder_id = $3 WHERE folder_id = $4', [
            target.regionCode,
            target.folderId,
            target.cityFolderId,
            id,
          ]);
        } else {
          throw new HttpError(409, `폴더에 사진 ${photoCount}장이 있어요. 사진을 함께 지울지 옮길지 골라 주세요`);
        }
      }
      await client.query('DELETE FROM album_folders WHERE id = $1', [id]);
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
