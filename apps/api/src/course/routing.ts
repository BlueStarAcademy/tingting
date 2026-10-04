import { distanceMeters, estimateLeg, type CourseTransport, type RouteLeg, type RouteSource } from '@tingting/shared';
import { cached } from '../cache';
import { config } from '../config';

export interface LatLng {
  lat: number;
  lng: number;
}

const ROUTE_TTL = 7 * 24 * 3600_000;
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const KAKAO_WAYPOINTS_URL = 'https://apis-navi.kakaomobility.com/v1/waypoints/directions';
/** Kakao rejects legs shorter than ~5 m and both services return noise for tiny hops. */
const MIN_ROUTED_M = 50;
const MAX_PATH_POINTS = 160;

type Path = [number, number][];

/** Douglas–Peucker in degrees (≈5 m tolerance), then thinned to a fixed budget. */
function simplify(path: Path): Path {
  if (path.length <= 2) return path;
  const tolerance = 0.00005;
  const keep = new Uint8Array(path.length);
  keep[0] = keep[path.length - 1] = 1;
  const stack: [number, number][] = [[0, path.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ay, ax] = path[a];
    const [by, bx] = path[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    let worst = -1;
    let worstDist = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [py, px] = path[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > worstDist) {
        worst = i;
        worstDist = d;
      }
    }
    if (worst > 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  let out = path.filter((_, i) => keep[i]);
  if (out.length > MAX_PATH_POINTS) {
    const step = out.length / MAX_PATH_POINTS;
    out = Array.from({ length: MAX_PATH_POINTS }, (_, i) => out[Math.floor(i * step)]).concat([out[out.length - 1]]);
  }
  return out.map(([lat, lng]) => [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5]);
}

async function kakaoRoute(points: LatLng[]): Promise<RouteLeg[]> {
  const xy = (p: LatLng) => ({ x: String(p.lng), y: String(p.lat) });
  const res = await fetch(KAKAO_WAYPOINTS_URL, {
    method: 'POST',
    headers: { Authorization: `KakaoAK ${config.kakaoRestApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: xy(points[0]),
      destination: xy(points[points.length - 1]),
      waypoints: points.slice(1, -1).map(xy),
      priority: 'RECOMMEND',
      summary: false,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`kakao directions HTTP ${res.status}`);
  const data = (await res.json()) as {
    routes?: {
      result_code: number;
      result_msg?: string;
      sections?: { distance: number; duration: number; roads?: { vertexes: number[] }[] }[];
    }[];
  };
  const route = data.routes?.[0];
  if (!route || route.result_code !== 0 || !route.sections) throw new Error(`kakao directions: ${route?.result_msg ?? 'no route'}`);
  if (route.sections.length !== points.length - 1) throw new Error('kakao directions: section count mismatch');
  return route.sections.map((section) => {
    const path: Path = [];
    for (const road of section.roads ?? []) {
      for (let i = 0; i + 1 < road.vertexes.length; i += 2) path.push([road.vertexes[i + 1], road.vertexes[i]]);
    }
    return {
      distanceM: Math.round(section.distance),
      durationMin: Math.max(1, Math.round(section.duration / 60)),
      source: 'kakao' as const,
      path: simplify(path),
    };
  });
}

async function osrmRoute(points: LatLng[]): Promise<RouteLeg[]> {
  const coords = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const res = await fetch(`${OSRM_URL}/${coords}?overview=false&steps=true&geometries=geojson`, {
    headers: { 'User-Agent': 'TingTing/1.0 (private couple travel journal)' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`osrm HTTP ${res.status}`);
  const data = (await res.json()) as {
    code: string;
    routes?: { legs: { distance: number; duration: number; steps: { geometry: { coordinates: [number, number][] } }[] }[] }[];
  };
  const legs = data.routes?.[0]?.legs;
  if (data.code !== 'Ok' || !legs || legs.length !== points.length - 1) throw new Error(`osrm: ${data.code}`);
  return legs.map((leg) => {
    const path: Path = [];
    for (const step of leg.steps) for (const [lng, lat] of step.geometry.coordinates) path.push([lat, lng]);
    return {
      distanceM: Math.round(leg.distance),
      // The demo profile ignores traffic and signals; city driving takes noticeably longer.
      durationMin: Math.max(1, Math.round((leg.duration / 60) * 1.25 + 2)),
      source: 'osrm' as const,
      path: simplify(path),
    };
  });
}

const pointsKey = (points: LatLng[]) => points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';');

/**
 * Road legs between consecutive points. Cars use Kakao Mobility (when the REST key is set), then the
 * public OSRM server, then straight-line estimates. Transit has no public routing API, so it is estimated.
 */
export async function routeLegs(points: LatLng[], transport: CourseTransport): Promise<{ legs: RouteLeg[]; source: RouteSource }> {
  const estimates = points.slice(1).map((p, i) => estimateLeg(points[i], p, transport));
  if (transport === 'transit' || points.length < 2) return { legs: estimates, source: 'estimate' };

  // Route only between points that are meaningfully apart; tiny hops keep their estimate.
  const kept: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const prev = points[kept[kept.length - 1]];
    if (distanceMeters(prev.lat, prev.lng, points[i].lat, points[i].lng) >= MIN_ROUTED_M) kept.push(i);
  }
  if (kept.length < 2) return { legs: estimates, source: 'estimate' };
  const routable = kept.map((i) => points[i]);

  const providers: [RouteSource, (p: LatLng[]) => Promise<RouteLeg[]>][] = [];
  if (config.kakaoRestApiKey) providers.push(['kakao', kakaoRoute]);
  providers.push(['osrm', osrmRoute]);

  for (const [source, run] of providers) {
    try {
      const routed = await cached(`route:${source}:${pointsKey(routable)}`, ROUTE_TTL, () => run(routable));
      const legs = [...estimates];
      kept.slice(1).forEach((pointIndex, k) => {
        // Legs from skipped near-duplicate points fold into the routed leg that reaches this point.
        legs[pointIndex - 1] = routed[k];
      });
      return { legs, source };
    } catch (e) {
      console.warn(`[route] ${source} failed:`, e instanceof Error ? e.message : e);
    }
  }
  return { legs: estimates, source: 'estimate' };
}
