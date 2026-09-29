import { Router } from 'express';
import { pool } from '../db';
import { handle, HttpError, optionalString, publicBaseUrl, toStoredUri, userId } from '../http';
import { mapPhoto, PHOTO_SELECT } from '../mappers';
import { deleteMediaFile } from '../media-upload';

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
      where.push(`pl.region_code = $${params.length}`);
    }
    const { rows } = await pool.query(
      `${PHOTO_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ph.taken_at DESC LIMIT 1000`,
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

photosRouter.post(
  '/',
  handle(async (req, res) => {
    const originalUri = optionalString(req.body?.originalUri);
    if (!originalUri) throw new HttpError(400, '사진이 필요해요');
    const editedUri = optionalString(req.body?.editedUri);
    const takenAt = optionalString(req.body?.takenAt);
    const { rows } = await pool.query(
      `INSERT INTO photos (place_id, visit_id, original_uri, edited_uri, taken_at, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()), $6) RETURNING id`,
      [
        optionalString(req.body?.placeId),
        optionalString(req.body?.visitId),
        toStoredUri(originalUri),
        editedUri ? toStoredUri(editedUri) : null,
        takenAt,
        userId(req),
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
      if (current[0].edited_uri && current[0].edited_uri !== stored) deleteMediaFile(String(current[0].edited_uri));
      await pool.query('UPDATE photos SET edited_uri = $1 WHERE id = $2', [stored, id]);
    }
    if ('placeId' in body) {
      await pool.query('UPDATE photos SET place_id = $1 WHERE id = $2', [optionalString(body.placeId), id]);
    }
    res.json(await loadPhoto(id, publicBaseUrl(req)));
  }),
);

photosRouter.delete(
  '/:id',
  handle(async (req, res) => {
    const { rows } = await pool.query('DELETE FROM photos WHERE id = $1 RETURNING original_uri, edited_uri', [req.params.id]);
    if (rows[0]) {
      deleteMediaFile(String(rows[0].original_uri));
      deleteMediaFile(rows[0].edited_uri ? String(rows[0].edited_uri) : null);
    }
    res.status(204).end();
  }),
);
