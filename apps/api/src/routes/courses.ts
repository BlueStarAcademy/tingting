import { Router } from 'express';
import {
  COURSE_SLOT_LABELS,
  getRegion,
  isRecommendationCategory,
  REGION_HUBS,
  type CourseDay,
  type CourseFocus,
  type CourseNights,
  type CoursePoint,
  type CourseRequest,
  type CourseSlot,
  type CourseStop,
  type CourseTransport,
  type PlaceExtraInfo,
  type RecommendationSource,
  type RecommendedPlace,
  type RouteLeg,
  type RouteSource,
  type TripCourse,
  type TripCourseSummary,
} from '@tingting/shared';
import { pool } from '../db';
import { handle, HttpError, optionalDate, optionalString, userId } from '../http';
import { config } from '../config';
import { rateLimit } from '../rate-limit';
import { generateCourse } from '../course/generate';
import { routeLegs } from '../course/routing';
import { tourPlaceInfo } from '../recommend/tour';

const FOCUS: CourseFocus[] = ['food', 'sight', 'event', 'cafe', 'activity'];
const SLOTS = Object.keys(COURSE_SLOT_LABELS) as CourseSlot[];
const PLACE_SOURCES: RecommendationSource[] = ['tour', 'kakao', 'osm'];
const ROUTE_SOURCES: RouteSource[] = ['kakao', 'osrm', 'estimate'];
const MAX_STOPS_PER_DAY = 14;

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const text = (v: unknown, max = 300): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const inKorea = (lat: number | null, lng: number | null) => lat !== null && lng !== null;

function parsePoint(value: unknown): CoursePoint | undefined {
  const o = obj(value);
  if (!o) return undefined;
  const lat = num(o.lat, 32, 39.5);
  const lng = num(o.lng, 124, 132);
  if (!inKorea(lat, lng)) throw new HttpError(400, '출발 위치는 한국 안이어야 해요');
  return { name: text(o.name, 80) ?? '출발', lat: lat!, lng: lng! };
}

function parseRequest(body: unknown): CourseRequest {
  const o = obj(body) ?? {};
  const regionCode = String(o.regionCode ?? '');
  if (!getRegion(regionCode)) throw new HttpError(400, '지역을 선택해 주세요');
  const focus = Array.isArray(o.focus) ? FOCUS.filter((f) => (o.focus as unknown[]).includes(f)) : [];
  const nights = num(o.nights, 0, 2);
  const transport = o.transport === 'transit' ? 'transit' : o.transport === 'car' ? 'car' : null;
  const startDate = optionalDate(o.startDate);
  if (nights === null || !Number.isInteger(nights)) throw new HttpError(400, '여행 기간을 골라 주세요');
  if (!transport) throw new HttpError(400, '이동 수단을 골라 주세요');
  if (!startDate) throw new HttpError(400, '여행 날짜를 골라 주세요');
  const seed = num(o.seed, 0, 2 ** 32);
  return {
    regionCode,
    focus: focus.length ? focus : ['sight', 'food'],
    nights: nights as CourseNights,
    transport: transport as CourseTransport,
    startDate,
    start: parsePoint(o.start),
    seed: seed === null ? undefined : Math.floor(seed),
  };
}

function parsePlace(value: unknown, regionCode: string): RecommendedPlace {
  const o = obj(value);
  const lat = num(o?.lat, 32, 39.5);
  const lng = num(o?.lng, 124, 132);
  const name = text(o?.name, 120);
  const category = o?.category;
  if (!o || !name || !inKorea(lat, lng) || !isRecommendationCategory(category)) throw new HttpError(400, '코스의 장소 정보가 올바르지 않아요');
  const source = PLACE_SOURCES.find((s) => s === o.source) ?? 'osm';
  return {
    id: text(o.id, 120) ?? `${source}:${name}`,
    source,
    category,
    name,
    categoryLabel: text(o.categoryLabel, 40),
    address: text(o.address, 200),
    lat: lat!,
    lng: lng!,
    phone: text(o.phone, 60),
    imageUrl: text(o.imageUrl, 500),
    thumbnailUrl: text(o.thumbnailUrl, 500),
    kakaoPlaceId: text(o.kakaoPlaceId, 40),
    url: text(o.url, 500),
    regionCode: text(o.regionCode, 8) ?? regionCode,
    eventStart: optionalDate(o.eventStart) ?? undefined,
    eventEnd: optionalDate(o.eventEnd) ?? undefined,
    tourContentTypeId: text(o.tourContentTypeId, 4),
    openingHours: text(o.openingHours, 200),
  };
}

function parseLeg(value: unknown): RouteLeg | undefined {
  const o = obj(value);
  if (!o) return undefined;
  const distanceM = num(o.distanceM, 0, 2_000_000);
  const durationMin = num(o.durationMin, 0, 24 * 60);
  if (distanceM === null || durationMin === null) return undefined;
  const path = Array.isArray(o.path)
    ? (o.path as unknown[])
        .slice(0, 400)
        .filter((p): p is [number, number] => Array.isArray(p) && num(p[0], 32, 39.5) !== null && num(p[1], 124, 132) !== null)
        .map(([lat, lng]) => [Number(lat), Number(lng)] as [number, number])
    : undefined;
  return {
    distanceM: Math.round(distanceM),
    durationMin: Math.round(durationMin),
    source: ROUTE_SOURCES.find((s) => s === o.source) ?? 'estimate',
    path: path?.length ? path : undefined,
  };
}

function hubPoint(regionCode: string): CoursePoint {
  const hub = REGION_HUBS[regionCode];
  return { name: hub.name, lat: hub.lat, lng: hub.lng };
}

function parseDays(value: unknown, request: CourseRequest): CourseDay[] {
  if (!Array.isArray(value) || value.length !== request.nights + 1) throw new HttpError(400, '코스 일정이 올바르지 않아요');
  return value.map((raw, i) => {
    const o = obj(raw) ?? {};
    const stops = Array.isArray(o.stops) ? o.stops.slice(0, MAX_STOPS_PER_DAY) : [];
    const startTime = typeof o.startTime === 'string' && /^\d{2}:\d{2}$/.test(o.startTime) ? o.startTime : '10:00';
    return {
      day: i + 1,
      date: optionalDate(o.date) ?? request.startDate,
      startTime,
      start: parsePoint(o.start) ?? request.start ?? hubPoint(request.regionCode),
      stops: stops.map((s): CourseStop => {
        const so = obj(s) ?? {};
        const slot = SLOTS.find((x) => x === so.slot);
        if (!slot) throw new HttpError(400, '코스의 일정 구분이 올바르지 않아요');
        return {
          key: text(so.key, 40) ?? `s${i}`,
          slot,
          arrive: typeof so.arrive === 'string' && /^\d{2}:\d{2}$/.test(so.arrive) ? so.arrive : startTime,
          dwellMin: Math.round(num(so.dwellMin, 0, 600) ?? 60),
          place: parsePlace(so.place, request.regionCode),
          leg: parseLeg(so.leg),
        };
      }),
    };
  });
}

type Row = Record<string, unknown>;

function mapCourse(row: Row, stops: Row[]): TripCourse {
  const dayStarts = (Array.isArray(row.day_starts) ? row.day_starts : []) as { date?: string; startTime?: string; start?: CoursePoint }[];
  const startDate = String(row.start_date);
  const nights = Number(row.nights) as CourseNights;
  const days: CourseDay[] = Array.from({ length: nights + 1 }, (_, i) => ({
    day: i + 1,
    date: dayStarts[i]?.date ?? startDate,
    startTime: dayStarts[i]?.startTime ?? '10:00',
    start: dayStarts[i]?.start ?? (row.start_point as CoursePoint),
    stops: stops
      .filter((s) => Number(s.day) === i + 1)
      .map((s) => ({
        key: String(s.stop_key),
        slot: s.slot as CourseSlot,
        arrive: String(s.arrive),
        dwellMin: Number(s.dwell_min),
        place: s.place as RecommendedPlace,
        leg: (s.leg as RouteLeg | null) ?? undefined,
      })),
  }));
  return {
    id: String(row.id),
    request: {
      regionCode: String(row.region_code),
      focus: (row.focus as CourseFocus[]) ?? [],
      nights,
      transport: row.transport as CourseTransport,
      startDate,
      start: (row.start_point as CoursePoint | null) ?? undefined,
    },
    title: String(row.title),
    days,
    routeSource: (row.route_source as RouteSource) ?? 'estimate',
    sources: (row.sources as RecommendationSource[]) ?? [],
    createdBy: String(row.created_by ?? ''),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

async function loadCourse(id: string): Promise<TripCourse> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, '여행 코스를 찾을 수 없어요');
  const { rows } = await pool.query('SELECT * FROM trip_courses WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(404, '여행 코스를 찾을 수 없어요');
  const stops = await pool.query('SELECT * FROM trip_course_stops WHERE course_id = $1 ORDER BY day, position', [id]);
  return mapCourse(rows[0], stops.rows);
}

export const coursesRouter = Router();
const generateLimit = rateLimit(12, 60_000);
const routeLimit = rateLimit(60, 60_000);

coursesRouter.post(
  '/generate',
  generateLimit,
  handle(async (req, res) => {
    res.json(await generateCourse(parseRequest(req.body)));
  }),
);

coursesRouter.post(
  '/route',
  routeLimit,
  handle(async (req, res) => {
    const body = obj(req.body) ?? {};
    const points = Array.isArray(body.points) ? body.points.slice(0, 16).map((p) => parsePoint(p)) : [];
    if (points.length < 2 || points.some((p) => !p)) throw new HttpError(400, '경로를 계산할 장소가 부족해요');
    const transport: CourseTransport = body.transport === 'transit' ? 'transit' : 'car';
    res.json(await routeLegs(points as CoursePoint[], transport));
  }),
);

/** Overview, hours and fees from TourAPI; other providers have nothing more to add. */
coursesRouter.get(
  '/place-info',
  routeLimit,
  handle(async (req, res) => {
    const id = optionalString(req.query.id) ?? '';
    const typeId = optionalString(req.query.typeId) ?? undefined;
    const contentId = /^tour:(\d+)$/.exec(id)?.[1];
    if (!contentId || !config.tourApiKey) {
      res.json({} satisfies PlaceExtraInfo);
      return;
    }
    res.json(await tourPlaceInfo(contentId, typeId && /^\d{2}$/.test(typeId) ? typeId : undefined));
  }),
);

coursesRouter.get(
  '/',
  handle(async (req, res) => {
    const regionCode = optionalString(req.query.regionCode);
    const { rows } = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM trip_course_stops s WHERE s.course_id = c.id) AS stop_count
       FROM trip_courses c ${regionCode ? 'WHERE c.region_code = $1' : ''}
       ORDER BY c.start_date DESC, c.created_at DESC`,
      regionCode ? [regionCode] : [],
    );
    res.json(
      rows.map(
        (r): TripCourseSummary => ({
          id: String(r.id),
          regionCode: String(r.region_code),
          title: String(r.title),
          startDate: String(r.start_date),
          nights: Number(r.nights) as CourseNights,
          transport: r.transport as CourseTransport,
          stopCount: Number(r.stop_count),
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        }),
      ),
    );
  }),
);

coursesRouter.get(
  '/:id',
  handle(async (req, res) => {
    res.json(await loadCourse(String(req.params.id)));
  }),
);

coursesRouter.post(
  '/',
  handle(async (req, res) => {
    const body = obj(req.body) ?? {};
    const request = parseRequest(body.request);
    const days = parseDays(body.days, request);
    if (days.every((d) => d.stops.length === 0)) throw new HttpError(400, '코스에 장소가 없어요');
    const title = text(body.title, 80) ?? `${getRegion(request.regionCode)!.name} 여행`;
    const routeSource = ROUTE_SOURCES.find((s) => s === body.routeSource) ?? 'estimate';
    const sources = Array.isArray(body.sources) ? PLACE_SOURCES.filter((s) => (body.sources as unknown[]).includes(s)) : [];
    const me = userId(req);

    const client = await pool.connect();
    let id: string;
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO trip_courses (region_code, title, start_date, nights, transport, focus, start_point, day_starts, route_source, sources, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          request.regionCode,
          title,
          request.startDate,
          request.nights,
          request.transport,
          request.focus,
          request.start ? JSON.stringify(request.start) : null,
          JSON.stringify(days.map((d) => ({ date: d.date, startTime: d.startTime, start: d.start }))),
          routeSource,
          sources,
          me,
        ],
      );
      id = String(inserted.rows[0].id);
      for (const day of days) {
        for (const [position, stop] of day.stops.entries()) {
          await client.query(
            `INSERT INTO trip_course_stops (course_id, day, position, stop_key, slot, arrive, dwell_min, place, leg)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, day.day, position, stop.key, stop.slot, stop.arrive, stop.dwellMin, JSON.stringify(stop.place), stop.leg ? JSON.stringify(stop.leg) : null],
          );
        }
        const dayTitle = days.length > 1 ? `${title} ${day.day}일차` : title;
        const memo = day.stops
          .filter((s) => s.slot !== 'stay')
          .map((s) => s.place.name)
          .join(' → ')
          .slice(0, 300);
        await client.query(
          `INSERT INTO plans (plan_date, title, memo, course_id, created_by) VALUES ($1, $2, $3, $4, $5)`,
          [day.date, dayTitle, memo || null, id, me],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.status(201).json(await loadCourse(id));
  }),
);

coursesRouter.delete(
  '/:id',
  handle(async (req, res) => {
    const id = String(req.params.id);
    if (/^[0-9a-f-]{36}$/i.test(id)) await pool.query('DELETE FROM trip_courses WHERE id = $1', [id]);
    res.status(204).end();
  }),
);
