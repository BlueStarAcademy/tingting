import { Router } from 'express';
import type { HomeDashboard } from '@tingting/shared';
import { pool } from '../db';
import { handle, publicBaseUrl } from '../http';
import { mapPhoto, mapPlace, mapPlan, PHOTO_SELECT, PLACE_SELECT, PLAN_SELECT } from '../mappers';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  handle(async (req, res) => {
    const base = publicBaseUrl(req);
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    const [regions, counts, plans, photos, wish] = await Promise.all([
      pool.query(`
        SELECT DISTINCT region_code FROM places WHERE status = 'visited'
        UNION
        SELECT DISTINCT pl.region_code FROM photos ph JOIN places pl ON pl.id = ph.place_id
        UNION
        SELECT DISTINCT region_code FROM photos WHERE region_code IS NOT NULL`),
      pool.query(`SELECT
        (SELECT COUNT(*) FROM places) AS places,
        (SELECT COUNT(*) FROM places WHERE status = 'visited') AS visited,
        (SELECT COUNT(*) FROM photos) AS photos`),
      pool.query(`${PLAN_SELECT} WHERE pn.plan_date >= $1 AND NOT pn.done ORDER BY pn.plan_date LIMIT 5`, [today]),
      pool.query(`${PHOTO_SELECT} ORDER BY ph.taken_at DESC LIMIT 12`),
      pool.query(`${PLACE_SELECT} WHERE p.status = 'wish' ORDER BY p.event_start NULLS LAST, p.created_at DESC LIMIT 8`),
    ]);
    const c = counts.rows[0];
    const dashboard: HomeDashboard = {
      visitedRegionCodes: regions.rows.map((r) => String(r.region_code)),
      placeCount: Number(c.places),
      visitedPlaceCount: Number(c.visited),
      photoCount: Number(c.photos),
      upcomingPlans: plans.rows.map(mapPlan),
      recentPhotos: photos.rows.map((r) => mapPhoto(r, base)),
      wishPlaces: wish.rows.map((r) => mapPlace(r, base)),
    };
    res.json(dashboard);
  }),
);
