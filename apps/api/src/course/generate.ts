import {
  COURSE_DWELL_MIN,
  courseTitle,
  dayEndClock,
  dayPoints,
  distanceMeters,
  estimateLeg,
  getRecommendationCategory,
  getRegion,
  REGION_HUBS,
  retimeDay,
  type CourseDay,
  type CourseDraft,
  type CourseNotice,
  type CoursePoint,
  type CourseRequest,
  type CourseSlot,
  type CourseStop,
  type RecommendationCategory,
  type RecommendationSource,
  type RecommendedPlace,
  type RouteSource,
} from '@tingting/shared';
import { config } from '../config';
import { HttpError } from '../http';
import { recommendForRegion, searchNearby } from '../recommend';
import { tourFestivalsBetween } from '../recommend/tour';
import { routeLegs } from './routing';

type Pools = Partial<Record<RecommendationCategory, RecommendedPlace[]>>;
type Scored = { place: RecommendedPlace; score: number };

/** Small seeded PRNG so "다시 추천" with a new seed reshuffles picks reproducibly. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => distanceMeters(a.lat, a.lng, b.lat, b.lng);

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const PAGES: Partial<Record<RecommendationCategory, number>> = { food: 2, sight: 3, cafe: 2, activity: 2, stay: 2 };

async function loadCategory(regionCode: string, category: RecommendationCategory) {
  const first = await recommendForRegion(regionCode, category, 1);
  const items = [...first.items];
  for (let page = 2; first.hasMore && first.source && page <= (PAGES[category] ?? 1); page++) {
    const next = await recommendForRegion(regionCode, category, page, first.source).catch(() => null);
    if (!next?.items.length) break;
    items.push(...next.items);
    if (!next.hasMore) break;
  }
  return { items, source: first.source, notice: first.notice };
}

async function loadPools(req: CourseRequest, lastDate: string) {
  const { focus, regionCode } = req;
  const categories: RecommendationCategory[] = ['sight', 'food'];
  if (focus.includes('cafe') || focus.includes('food')) categories.push('cafe');
  if (focus.includes('activity')) categories.push('activity');
  if (req.nights > 0) categories.push('stay');

  const pools: Pools = {};
  const notices: CourseNotice[] = [];
  const sources = new Set<RecommendationSource>();
  const failed: RecommendationCategory[] = [];
  // Two at a time: the keyless OpenStreetMap fallback allows only a couple of parallel queries.
  for (let i = 0; i < categories.length; i += 2) {
    const batch = categories.slice(i, i + 2);
    const results = await Promise.all(batch.map((c) => loadCategory(regionCode, c)));
    batch.forEach((category, k) => {
      const r = results[k];
      pools[category] = r.items;
      if (r.items.length && r.source) sources.add(r.source);
      if (r.notice?.code === 'provider_error') failed.push(category);
    });
  }
  if (failed.length) {
    const labels = failed.map((c) => getRecommendationCategory(c).label).join(' · ');
    notices.push({
      code: 'provider_error',
      message: `장소 서버가 바빠 ${labels} 정보를 못 불러왔어요. 잠시 뒤 '다시 추천'을 누르면 더 알찬 코스가 나와요.`,
    });
  }

  if (focus.includes('event')) {
    if (!config.tourApiKey) {
      notices.push({ code: 'tour_key_required', message: '기간 행사는 관광공사 API 키가 있어야 찾을 수 있어요. 볼거리로 채웠어요.' });
    } else {
      try {
        pools.event = await tourFestivalsBetween(regionCode, req.startDate, lastDate);
        if (pools.event.length) sources.add('tour');
        else notices.push({ code: 'no_events', message: '여행 날짜에 열리는 행사를 찾지 못해 볼거리로 채웠어요.' });
      } catch (e) {
        notices.push({ code: 'provider_error', message: e instanceof Error ? e.message : '행사 정보를 불러오지 못했어요' });
      }
    }
  }

  // The same place can appear under two categories (e.g. a museum café); keep its first use.
  const seen = new Set<string>();
  for (const category of ['event', 'sight', 'activity', 'food', 'cafe', 'stay'] as RecommendationCategory[]) {
    pools[category] = (pools[category] ?? []).filter((p) => {
      const key = `${p.name}@${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
      if (seen.has(p.id) || seen.has(key)) return false;
      seen.add(p.id);
      seen.add(key);
      return true;
    });
  }
  return { pools, notices, sources };
}

/** Provider order is a quality signal; photos make nicer cards; the seed adds variety. */
function scorePools(pools: Pools, random: () => number): Partial<Record<RecommendationCategory, Scored[]>> {
  const out: Partial<Record<RecommendationCategory, Scored[]>> = {};
  for (const [category, items] of Object.entries(pools) as [RecommendationCategory, RecommendedPlace[]][]) {
    out[category] = items.map((place, i) => ({
      place,
      score: (1 - i / Math.max(1, items.length)) * 0.6 + (place.imageUrl ? 0.15 : 0) + random() * 0.45,
    }));
  }
  return out;
}

/** Nearest neighbour from `start`, then 2-opt on the open path (start fixed, end free). */
function orderStops<T extends { lat: number; lng: number }>(start: { lat: number; lng: number }, items: T[]): T[] {
  const rest = [...items];
  const route: T[] = [];
  let at: { lat: number; lng: number } = start;
  while (rest.length) {
    let best = 0;
    for (let i = 1; i < rest.length; i++) if (dist(at, rest[i]) < dist(at, rest[best])) best = i;
    const next = rest.splice(best, 1)[0];
    route.push(next);
    at = next;
  }
  const pathLength = (r: T[]) => r.reduce((sum, p, i) => sum + dist(i === 0 ? start : r[i - 1], p), 0);
  let improved = true;
  for (let guard = 0; improved && guard < 50; guard++) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const candidate = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        if (pathLength(candidate) + 1 < pathLength(route)) {
          route.splice(0, route.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return route;
}

interface DayShape {
  visits: number;
  morning: number;
  cafe: boolean;
  dinner: boolean;
  stay: boolean;
  /** Latest the last activity should end, minutes after midnight */
  endBy: number;
}

function shapeDay(req: CourseRequest, dayIndex: number, totalDays: number, firstArrival: number | null): DayShape {
  const { focus, transport } = req;
  const isLast = totalDays > 1 && dayIndex === totalDays - 1;
  const sightsy = focus.includes('sight') || focus.includes('activity') || focus.includes('event');
  let visits = transport === 'car' ? 3 : 2;
  if (focus.includes('sight')) visits += 1;
  if (!sightsy) visits -= 1;
  if (isLast) visits -= 1;
  let morning = visits >= 4 ? 2 : 1;
  // A long drive from home eats the morning.
  if (firstArrival !== null && firstArrival > 11 * 60 + 30) {
    morning = 0;
    if (firstArrival > 14 * 60) visits -= 1;
  }
  visits = Math.min(4, Math.max(1, visits));
  return {
    visits,
    morning: Math.min(morning, visits),
    cafe: focus.includes('cafe') || focus.includes('food'),
    dinner: !isLast,
    stay: dayIndex < totalDays - 1,
    endBy: isLast ? 18 * 60 + 30 : 21 * 60,
  };
}

let keyCounter = 0;
const stopKey = () => `s${Date.now().toString(36)}${(keyCounter++).toString(36)}`;

function makeStop(slot: CourseSlot, place: RecommendedPlace): CourseStop {
  return { key: stopKey(), slot, arrive: '00:00', dwellMin: COURSE_DWELL_MIN[slot], place };
}

export async function generateCourse(req: CourseRequest): Promise<CourseDraft> {
  const startedAt = Date.now();
  const region = getRegion(req.regionCode);
  const hub = REGION_HUBS[req.regionCode];
  if (!region || !hub) throw new HttpError(400, '알 수 없는 지역이에요');

  const totalDays = req.nights + 1;
  const lastDate = addDays(req.startDate, req.nights);
  const random = mulberry32(req.seed ?? Date.now());
  const { pools, notices, sources } = await loadPools(req, lastDate);
  const scored = scorePools(pools, random);
  const used = new Set<string>();
  const take = (s: Scored) => used.add(s.place.id);
  const free = (category: RecommendationCategory) => (scored[category] ?? []).filter((s) => !used.has(s.place.id));

  const radius = req.transport === 'car' ? 12_000 : 3_500;
  // Region lists are centred on the hub (OSM food/cafés within a few km of it), so a day out
  // at the edge of the region searches around its own area before placing meals and the stay.
  const nearRadius = req.transport === 'car' ? 4_000 : 1_500;
  const topUp = async (categories: RecommendationCategory[], around: { lat: number; lng: number }) => {
    if (Date.now() - startedAt > 25_000) return;
    const point = { lat: Number(around.lat.toFixed(2)), lng: Number(around.lng.toFixed(2)), radius: nearRadius };
    for (const category of categories) {
      if (free(category).some((s) => dist(around, s.place) <= nearRadius)) continue;
      const page = await searchNearby(point, { category }, 1);
      const known = new Set(
        Object.values(scored).flatMap((list) => (list ?? []).flatMap((s) => [s.place.id, `${s.place.name}@${s.place.lat.toFixed(3)}`])),
      );
      const fresh = page.items.filter((p) => !known.has(p.id) && !known.has(`${p.name}@${p.lat.toFixed(3)}`));
      if (!fresh.length) continue;
      if (page.source) sources.add(page.source);
      scored[category] = [
        ...(scored[category] ?? []),
        ...fresh.map((place, i) => ({ place, score: (1 - i / fresh.length) * 0.6 + (place.imageUrl ? 0.15 : 0) + random() * 0.45 })),
      ];
    }
  };
  const tripStart: CoursePoint = req.start ?? { name: hub.name, lat: hub.lat, lng: hub.lng };
  // OpenStreetMap lists parts of one site separately (a temple and its pagodas); one visit per spot.
  const visited: { lat: number; lng: number }[] = [];
  const sameSpot = (p: { lat: number; lng: number }) => visited.some((v) => dist(v, p) < 350);
  const startFar = dist(tripStart, hub) > 40_000;

  // Day anchors first, so each night's stay can lean toward the next day's area.
  const anchorPool = [...free('sight'), ...free('activity')].sort((a, b) => b.score - a.score);
  const anchors: Scored[] = [];
  for (let d = 0; d < totalDays; d++) {
    const date = addDays(req.startDate, d);
    const event = req.focus.includes('event')
      ? free('event').find((e) => (e.place.eventStart ?? '') <= date && (e.place.eventEnd ?? e.place.eventStart ?? '') >= date && !anchors.includes(e))
      : undefined;
    const spaced = anchorPool.find((c) => !anchors.includes(c) && anchors.every((a) => dist(a.place, c.place) > radius * 0.6));
    const anchor = event ?? spaced ?? anchorPool.find((c) => !anchors.includes(c) && anchors.every((a) => dist(a.place, c.place) > 350));
    if (anchor) anchors.push(anchor);
    else if (anchors.length) anchors.push(anchors[anchors.length - 1]);
  }
  for (const a of anchors) visited.push(a.place);

  const days: CourseDay[] = [];
  let dayStart = tripStart;
  for (let d = 0; d < totalDays; d++) {
    const date = addDays(req.startDate, d);
    const anchor = anchors[d];
    const center = anchor?.place ?? hub;
    const startTime = d === 0 ? (startFar ? '08:30' : '10:00') : '09:30';
    const firstArrival =
      d === 0 && startFar ? 8 * 60 + 30 + estimateLeg(dayStart, center, req.transport).durationMin : null;
    const shape = shapeDay(req, d, totalDays, firstArrival);

    // Pick the day's visits near the anchor: event first, then a requested activity, then sights.
    const near = (s: Scored) => s.score - (1.2 * dist(center, s.place)) / radius;
    const pickNear = (category: RecommendationCategory, filter: (s: Scored) => boolean = () => true): Scored | undefined => {
      const options = free(category).filter((s) => filter(s) && !sameSpot(s.place));
      const close = options.filter((s) => dist(center, s.place) <= radius * 1.5);
      const pick = (close.length ? close : options).sort((a, b) => near(b) - near(a))[0];
      if (pick) {
        take(pick);
        visited.push(pick.place);
      }
      return pick;
    };
    const visits: { scored: Scored; slot: CourseSlot }[] = [];
    if (anchor && !used.has(anchor.place.id)) {
      take(anchor);
      visited.push(anchor.place);
      visits.push({ scored: anchor, slot: anchor.place.category === 'event' ? 'event' : anchor.place.category === 'activity' ? 'activity' : 'afternoon' });
    }
    if (req.focus.includes('event') && !visits.some((v) => v.slot === 'event')) {
      const event = pickNear('event', (e) => (e.place.eventStart ?? '') <= date && (e.place.eventEnd ?? e.place.eventStart ?? '') >= date);
      if (event) visits.push({ scored: event, slot: 'event' });
    }
    if (req.focus.includes('activity') && !visits.some((v) => v.slot === 'activity') && visits.length < shape.visits) {
      const activity = pickNear('activity');
      if (activity) visits.push({ scored: activity, slot: 'activity' });
    }
    while (visits.length < shape.visits) {
      const next = pickNear('sight') ?? pickNear('activity');
      if (!next) break;
      visits.push({ scored: next, slot: next.place.category === 'activity' ? 'activity' : 'afternoon' });
    }

    const ordered = orderStops(
      dayStart,
      visits.map((v) => ({ ...v, lat: v.scored.place.lat, lng: v.scored.place.lng })),
    );
    const sequence: CourseStop[] = ordered.map((v, i) => makeStop(v.slot === 'afternoon' && i < shape.morning ? 'morning' : v.slot, v.scored.place));
    const areaCenter = sequence.length
      ? {
          lat: sequence.reduce((sum, s) => sum + s.place.lat, 0) / sequence.length,
          lng: sequence.reduce((sum, s) => sum + s.place.lng, 0) / sequence.length,
        }
      : center;
    await topUp(['food', ...(shape.cafe ? (['cafe'] as const) : []), ...(shape.stay ? (['stay'] as const) : [])], areaCenter);

    // Meals and cafés go where (within their time window) they add the least detour.
    const insertBest = (category: RecommendationCategory, slot: CourseSlot, from: number, to: number): number => {
      const options = free(category);
      if (!options.length) return -1;
      const first = Math.min(Math.max(0, from), sequence.length);
      let best = { cost: Infinity, at: first, pick: options[0] };
      for (let at = first; at <= Math.max(first, Math.min(to, sequence.length)); at++) {
        const prev = at > 0 ? sequence[at - 1].place : dayStart;
        const next = sequence[at]?.place;
        const base = next ? dist(prev, next) : 0;
        for (const s of options) {
          const cost = (dist(prev, s.place) + (next ? dist(s.place, next) : 0) - base) / radius - s.score * 0.6;
          if (cost < best.cost) best = { cost, at, pick: s };
        }
      }
      take(best.pick);
      sequence.splice(best.at, 0, makeStop(slot, best.pick.place));
      return best.at;
    };
    const lunchAt = Math.min(shape.morning, sequence.length);
    const lunchIdx = insertBest(
      'food',
      'lunch',
      Math.max(shape.morning > 0 ? 1 : 0, lunchAt - 1),
      shape.morning >= 2 ? lunchAt : lunchAt + 1,
    );
    if (shape.cafe) insertBest('cafe', 'cafe', lunchIdx >= 0 ? lunchIdx + 1 : lunchAt, sequence.length);
    if (shape.dinner) insertBest('food', 'dinner', sequence.length, sequence.length);
    if (lunchIdx >= 0) {
      const lunchPos = sequence.findIndex((s) => s.slot === 'lunch');
      sequence.forEach((s, i) => {
        if (s.slot === 'morning' || s.slot === 'afternoon') s.slot = i < lunchPos ? 'morning' : 'afternoon';
      });
    }
    if (shape.stay) {
      const last = sequence[sequence.length - 1]?.place ?? center;
      const nextCenter = anchors[d + 1]?.place ?? center;
      const options = free('stay');
      if (options.length) {
        const cost = (s: Scored) => (dist(last, s.place) + 0.5 * dist(s.place, nextCenter)) / radius - s.score * 0.6;
        const pick = options.sort((a, b) => cost(a) - cost(b))[0];
        take(pick);
        sequence.push(makeStop('stay', pick.place));
      }
    }

    let day: CourseDay = { day: d + 1, date, startTime, start: dayStart, stops: sequence };
    const estimate = (x: CourseDay) => {
      const points = dayPoints(x);
      return retimeDay({ ...x, stops: x.stops.map((s, i) => ({ ...s, leg: estimateLeg(points[i], points[i + 1], req.transport) })) });
    };
    day = estimate(day);
    // Drop afternoon sights (never meals, events or the stay) until the day ends at a sensible hour.
    for (let guard = 0; guard < 3 && dayEndClock(day) > shape.endBy; guard++) {
      const idx = day.stops.map((s) => s.slot).lastIndexOf('afternoon');
      if (idx < 0 || day.stops.filter((s) => s.slot === 'afternoon' || s.slot === 'morning').length <= 1) break;
      used.delete(day.stops[idx].place.id);
      day = estimate({ ...day, stops: day.stops.filter((_, i) => i !== idx) });
    }
    days.push(day);
    const stay = day.stops.find((s) => s.slot === 'stay')?.place;
    const lastStop = day.stops[day.stops.length - 1]?.place;
    if (stay ?? lastStop) dayStart = { name: (stay ?? lastStop)!.name, lat: (stay ?? lastStop)!.lat, lng: (stay ?? lastStop)!.lng };
  }

  if (days.every((d) => d.stops.length === 0)) {
    throw new HttpError(502, notices.find((n) => n.code === 'provider_error')?.message ?? '추천할 장소를 찾지 못했어요. 잠시 후 다시 시도해 주세요');
  }
  if (days.some((d) => d.stops.length < 3)) {
    notices.push({ code: 'few_places', message: '이 지역에서 찾은 장소가 적어 일부 날은 코스가 짧아요.' });
  }

  const routed = await routeDays(days, req.transport);
  if (req.transport === 'transit') {
    notices.push({ code: 'estimated_routes', message: '대중교통 시간은 직선거리로 계산한 예상치예요. 실제 노선은 길찾기 앱에서 확인해 주세요.' });
  } else if (routed.source === 'estimate') {
    notices.push({ code: 'estimated_routes', message: '도로 경로 서비스에 연결하지 못해 직선거리로 이동 시간을 예상했어요.' });
  }

  const alternatives: CourseDraft['alternatives'] = {};
  for (const category of Object.keys(scored) as RecommendationCategory[]) {
    alternatives[category] = free(category)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((s) => s.place);
  }

  return {
    request: req,
    title: courseTitle(region.name, req.nights),
    days: routed.days,
    alternatives,
    notices,
    routeSource: routed.source,
    sources: [...sources],
  };
}

/** Replaces each day's legs with road routes where available and retimes the stops. */
export async function routeDays(days: CourseDay[], transport: CourseRequest['transport']): Promise<{ days: CourseDay[]; source: RouteSource }> {
  const results = await Promise.all(days.map((day) => routeLegs(dayPoints(day), transport)));
  const out = days.map((day, i) => retimeDay({ ...day, stops: day.stops.map((s, k) => ({ ...s, leg: results[i].legs[k] })) }));
  const order: RouteSource[] = ['estimate', 'osrm', 'kakao'];
  const source = results.reduce<RouteSource>((worst, r) => (order.indexOf(r.source) < order.indexOf(worst) ? r.source : worst), 'kakao');
  return { days: out, source: days.some((d) => d.stops.length) ? source : 'estimate' };
}
