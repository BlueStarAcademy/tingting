import { distanceMeters } from './regions';
import type {
  CourseDay,
  CourseFocus,
  CourseNights,
  CoursePoint,
  CourseSlot,
  CourseStop,
  CourseTransport,
  RecommendationCategory,
  RouteLeg,
  RouteSource,
} from './types';

export interface CourseFocusInfo {
  id: CourseFocus;
  label: string;
  icon: string;
  description: string;
}

export const COURSE_FOCUS_OPTIONS: CourseFocusInfo[] = [
  { id: 'food', label: '맛집', icon: 'restaurant', description: '현지 맛집을 중심으로' },
  { id: 'sight', label: '볼거리', icon: 'camera', description: '명소 · 박물관 · 전망' },
  { id: 'event', label: '기간 행사', icon: 'calendar', description: '여행 날짜에 열리는 축제' },
  { id: 'cafe', label: '카페', icon: 'cafe', description: '쉬어 가는 카페 타임' },
  { id: 'activity', label: '놀거리', icon: 'sparkles', description: '체험 · 레저 · 테마파크' },
];

export const COURSE_NIGHT_OPTIONS: { id: CourseNights; label: string; description: string }[] = [
  { id: 0, label: '당일치기', description: '하루 동안 알차게' },
  { id: 1, label: '1박 2일', description: '숙소 하루 포함' },
  { id: 2, label: '2박 3일', description: '여유 있게 둘러보기' },
];

export const COURSE_TRANSPORT_OPTIONS: { id: CourseTransport; label: string; icon: string; description: string }[] = [
  { id: 'car', label: '자동차', icon: 'car', description: '동선을 넓게, 하루 4~5곳' },
  { id: 'transit', label: '대중교통', icon: 'bus', description: '가까운 곳끼리, 하루 3~4곳' },
];

export const COURSE_SLOT_LABELS: Record<CourseSlot, string> = {
  morning: '오전 코스',
  lunch: '점심',
  afternoon: '오후 코스',
  cafe: '카페 타임',
  event: '행사',
  activity: '놀거리',
  dinner: '저녁',
  stay: '숙소',
};

/** Typical time spent at each kind of stop, in minutes */
export const COURSE_DWELL_MIN: Record<CourseSlot, number> = {
  morning: 80,
  lunch: 70,
  afternoon: 80,
  cafe: 50,
  event: 100,
  activity: 110,
  dinner: 80,
  stay: 0,
};

/** The recommendation category a slot is filled from */
export function slotCategory(slot: CourseSlot, placeCategory?: RecommendationCategory): RecommendationCategory {
  switch (slot) {
    case 'lunch':
    case 'dinner':
      return 'food';
    case 'cafe':
      return 'cafe';
    case 'stay':
      return 'stay';
    case 'event':
      return 'event';
    case 'activity':
      return 'activity';
    default:
      return placeCategory === 'activity' || placeCategory === 'event' ? placeCategory : 'sight';
  }
}

export const ROUTE_SOURCE_LABELS: Record<RouteSource, string> = {
  kakao: '카카오모빌리티 도로 경로',
  osrm: 'OpenStreetMap 도로 경로',
  estimate: '직선거리 기준 추정',
};

/** Straight-line distance is shorter than the road; this is the usual ratio in Korean cities. */
export const ROAD_FACTOR = 1.3;
const WALK_LIMIT_M = 1200;

/** Road distance and time from a straight line, for when no routing service answers. */
export function estimateLeg(from: { lat: number; lng: number }, to: { lat: number; lng: number }, transport: CourseTransport): RouteLeg {
  const road = distanceMeters(from.lat, from.lng, to.lat, to.lng) * ROAD_FACTOR;
  let minutes: number;
  if (transport === 'transit') {
    // Short hops are walked; longer ones pay ~10 min of walking/waiting plus a city bus pace.
    minutes = road <= WALK_LIMIT_M ? road / 75 : 10 + road / 370;
  } else {
    // Parking and city traffic dominate short trips; highways lift the average on long ones.
    const kmh = road < 3000 ? 22 : road < 20000 ? 35 : road < 80000 ? 60 : 80;
    minutes = 4 + road / ((kmh * 1000) / 60);
  }
  return { distanceM: Math.round(road), durationMin: Math.max(3, Math.round(minutes)), source: 'estimate' };
}

export function isWalkingLeg(leg: RouteLeg | undefined, transport: CourseTransport): boolean {
  return Boolean(leg && transport === 'transit' && leg.source === 'estimate' && leg.distanceM <= WALK_LIMIT_M);
}

export function parseClock(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatClock(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Earliest sensible arrival per meal; earlier arrivals wait (or browse) until then. */
const MEAL_EARLIEST: Partial<Record<CourseSlot, number>> = {
  lunch: 11 * 60 + 30,
  dinner: 17 * 60 + 30,
  stay: 15 * 60,
};

/** Recomputes arrival times from the legs and dwell times. */
export function retimeDay(day: CourseDay): CourseDay {
  let clock = parseClock(day.startTime);
  const stops = day.stops.map((stop) => {
    clock += stop.leg?.durationMin ?? 0;
    const earliest = MEAL_EARLIEST[stop.slot];
    if (earliest !== undefined && clock < earliest) clock = earliest;
    const next = { ...stop, arrive: formatClock(clock) };
    clock += stop.dwellMin;
    return next;
  });
  return { ...day, stops };
}

/** Clock time the last non-stay stop ends */
export function dayEndClock(day: CourseDay): number {
  const last = [...day.stops].reverse().find((s) => s.slot !== 'stay');
  return last ? parseClock(last.arrive) + last.dwellMin : parseClock(day.startTime);
}

export function dayTotals(day: CourseDay): { distanceM: number; moveMin: number; estimated: boolean } {
  let distanceM = 0;
  let moveMin = 0;
  let estimated = false;
  for (const stop of day.stops) {
    if (!stop.leg) continue;
    distanceM += stop.leg.distanceM;
    moveMin += stop.leg.durationMin;
    if (stop.leg.source === 'estimate') estimated = true;
  }
  return { distanceM, moveMin, estimated };
}

/** Day start followed by each stop, in visiting order */
export function dayPoints(day: CourseDay): CoursePoint[] {
  return [day.start, ...day.stops.map((s) => ({ name: s.place.name, lat: s.place.lat, lng: s.place.lng }))];
}

/** Replaces legs that are missing or whose endpoints moved with straight-line estimates. */
export function estimateMissingLegs(day: CourseDay, transport: CourseTransport): CourseDay {
  const points = dayPoints(day);
  const stops: CourseStop[] = day.stops.map((stop, i) => (stop.leg ? stop : { ...stop, leg: estimateLeg(points[i], points[i + 1], transport) }));
  return retimeDay({ ...day, stops });
}

export function formatMeters(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`;
}

export function formatMinutes(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`;
}

export function courseTitle(regionName: string, nights: CourseNights): string {
  return `${regionName} ${COURSE_NIGHT_OPTIONS.find((o) => o.id === nights)?.label ?? ''} 여행`.replace(/\s+/g, ' ').trim();
}
