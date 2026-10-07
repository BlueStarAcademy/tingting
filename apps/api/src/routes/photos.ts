import { Router } from 'express';
import { pool } from '../db';
import { handle, HttpError, optionalString, publicBaseUrl, toStoredUri, userId } from '../http';
import { mapPhoto, PHOTO_SELECT } from '../mappers';
import { deleteUnreferencedMedia } from '../media-refs';
import { resolveTarget } from './albums';

export const photosRouter = Router();

async function loadPhoto(id: string, base: string) {
  const { rows } = await pool.query(`${PHOTO_SELECT} WHERE ph.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, '사진을 찾을 수 없어요');
  return mapPhoto(rows[0], base);
}

photosRouter.get(
  '/',
  handle(async (req, res) => {
    const where: string[] = [];
    const params: unknown[] = [];
    const placeId = optionalString(req.query.placeId);
    const regionCode = optionalString(req.query.regionCode);
    if (placeId) {
      params.push(placeId);
      where.push(`ph.place_id = $${params.length}`);
    }
    if (regionCode) {
      params.push(regionCode);
      where.push(`COALESCE(ph.region_code, pl.region_code) = $${params.length}`);
    }
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 1000));
    params.push(limit);
    const { rows } = await pool.query(
      `${PHOTO_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ph.taken_at DESC LIMIT $${params.length}`,
      params,
    );
    const base = publicBaseUrl(req);
    res.json(rows.map((r) => mapPhoto(r, base)));
  }),
);

photosRouter.get(
  '/:id',
  handle(async (req, res) => {
    res.json(await loadPhoto(String(req.params.id), publicBaseUrl(req)));
  }),
);

/** `regionCode` / `folderId` file the photo into an album; with neither, it follows the place's region. */
photosRouter.post(
  '/',
  handle(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const originalUri = optionalString(body.originalUri);
    if (!originalUri) throw new HttpError(400, '사진이 필요해요');
    const editedUri = optionalString(body.editedUri);
    const takenAt = optionalString(body.takenAt);
    const placeId = optionalString(body.placeId);
    const folderId = optionalString(body.folderId);
    const regionCode = optionalString(body.regionCode);
    const target = folderId
      ? await resolveTarget(pool, { kind: 'folder', folderId })
      : regionCode
        ? await resolveTarget(pool, { kind: 'region', regionCode })
        : null;
    const { rows } = await pool.query(
      `INSERT INTO photos (place_id, visit_id, original_uri, edited_uri, taken_at, created_by, region_code, folder_id)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()), $6,
         CASE WHEN $8::uuid IS NULL THEN COALESCE($7, (SELECT region_code FROM places WHERE id = $1)) END, $8)
       RETURNING id`,
      [
        placeId,
        optionalString(body.visitId),
        toStoredUri(originalUri),
        editedUri ? toStoredUri(editedUri) : null,
        takenAt,
        userId(req),
        target?.regionCode ?? null,
        target?.folderId ?? null,
      ],
    );
    res.status(201).json(await loadPhoto(String(rows[0].id), publicBaseUrl(req)));
  }),
);

photosRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const id = String(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { rows: current } = await pool.query('SELECT edited_uri FROM photos WHERE id = $1', [id]);
    if (!current[0]) throw new HttpError(404, '사진을 찾을 수 없어요');

    if ('editedUri' in body) {
      const next = optionalString(body.editedUri);
      const stored = next ? toStoredUri(next) : null;
      await pool.query('UPDATE photos SET edited_uri = $1 WHERE id = $2', [stored, id]);
      if (current[0].edited_uri && current[0].edited_uri !== stored) await deleteUnreferencedMedia([current[0].edited_uri]);
    }
    if ('placeId' in body) {
      // Photos outside a folder follow their place into its region album.
      await pool.query(
        `UPDATE photos SET place_id = $1::uuid,
           region_code = CASE WHEN folder_id IS NULL AND $1::uuid IS NOT NULL
             THEN COALESCE((SELECT region_code FROM places WHERE id = $1::uuid), region_code)
             ELSE region_code END
         WHERE id = $2`,
        [optionalString(body.placeId), id],
      );
    }
    res.json(await loadPhoto(id, publicBaseUrl(req)));
  }),
);

photosRouter.delete(
  '/:id',
  handle(async (req, res) => {
    const { rows } = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING original_uri, edited_uri', [req.params.id]);
    if (rows[0]) await deleteUnreferencedMedia([rows[0].original_uri, rows[0].edited_uri]);
    res.status(204).end();
  }),
);
