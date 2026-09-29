import { Router } from 'express';
import { pool } from '../db';
import { handle, HttpError, optionalDate, optionalString, userId } from '../http';
import { mapPlan, PLAN_SELECT } from '../mappers';

export const plansRouter = Router();

async function loadPlan(id: string) {
  const { rows } = await pool.query(`${PLAN_SELECT} WHERE pn.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, '일정을 찾을 수 없어요');
  return mapPlan(rows[0]);
}

plansRouter.get(
  '/',
  handle(async (_req, res) => {
    const { rows } = await pool.query(`${PLAN_SELECT} ORDER BY pn.plan_date, pn.created_at`);
    res.json(rows.map(mapPlan));
  }),
);

plansRouter.post(
  '/',
  handle(async (req, res) => {
    const date = optionalDate(req.body?.date);
    const title = optionalString(req.body?.title);
    if (!date || !title) throw new HttpError(400, '날짜와 제목을 입력해 주세요');
    const { rows } = await pool.query(
      `INSERT INTO plans (plan_date, title, place_id, memo, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [date, title, optionalString(req.body?.placeId), optionalString(req.body?.memo), userId(req)],
    );
    res.status(201).json(await loadPlan(String(rows[0].id)));
  }),
);

plansRouter.patch(
  '/:id',
  handle(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const sets: string[] = [];
    const params: unknown[] = [];
    const set = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if ('date' in body) {
      const date = optionalDate(body.date);
      if (!date) throw new HttpError(400, '날짜를 입력해 주세요');
      set('plan_date', date);
    }
    if ('title' in body) {
      const title = optionalString(body.title);
      if (!title) throw new HttpError(400, '제목을 입력해 주세요');
      set('title', title);
    }
    if ('placeId' in body) set('place_id', optionalString(body.placeId));
    if ('memo' in body) set('memo', optionalString(body.memo));
    if ('done' in body) set('done', Boolean(body.done));
    if (sets.length === 0) throw new HttpError(400, '변경할 내용이 없어요');
    const id = String(req.params.id);
    params.push(id);
    const { rowCount } = await pool.query(`UPDATE plans SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    if (!rowCount) throw new HttpError(404, '일정을 찾을 수 없어요');
    res.json(await loadPlan(id));
  }),
);

plansRouter.delete(
  '/:id',
  handle(async (req, res) => {
    await pool.query('DELETE FROM plans WHERE id = $1', [req.params.id]);
    res.status(204).end();
  }),
);
