import { AppState, Platform, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Lightweight remote diagnostics: JS errors, freezes and a short trail of breadcrumbs are batched
 * to POST /client-logs (printed by the API with a `[client]` prefix). Never send photos, URIs with
 * credentials or tokens here; values are trimmed and the server redacts again.
 */

type Level = 'error' | 'warn' | 'info';
type Data = Record<string, unknown>;
export type LogEntry = { level: Level; event: string; at: string; data?: Data };
type Crumb = { t: number; e: string; d?: Data };
type SessionRecord = { id: string; started: number; updated: number; fg: boolean; crumbs: Crumb[]; pending: LogEntry[] };
type Transport = (body: { session: string; device: Data; entries: LogEntry[] }) => Promise<void>;

const SESSION_KEY = 'tingting.diag.session';
const MAX_QUEUE = 200;
const MAX_CRUMBS = 40;
const BATCH = 40;
const FLUSH_MS = 20_000;
const STALL_TICK_MS = 500;
const STALL_REPORT_MS = 1000;

const sessionId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const startedAt = Date.now();
let queue: LogEntry[] = [];
let crumbs: Crumb[] = [];
let transport: Transport | null = null;
let installed = false;
/** The previous session's record is read before this one overwrites it. */
let restored = false;
let flushing = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let backoffUntil = 0;
let foreground = true;
const stallListeners = new Set<(ms: number) => void>();

const trim = (s: string, n = 400) => (s.length > n ? `${s.slice(0, n)}…` : s);

function scrub(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) / 100 : String(value);
  if (typeof value === 'string') {
    // file/content URIs and query strings can carry names or keys; keep only the shape
    return trim(value.replace(/\?[^\s]*/g, '?…').replace(/(file|content|ph):\/\/\S+/g, '$1://…'));
  }
  if (value instanceof Error) return { name: value.name, message: scrub(value.message) };
  if (depth > 2) return '…';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out: Data = {};
    for (const [k, v] of Object.entries(value as Data).slice(0, 20)) {
      if (/token|password|authorization|secret|base64/i.test(k)) continue;
      out[k] = scrub(v, depth + 1);
    }
    return out;
  }
  return undefined;
}

function deviceInfo(): Data {
  const c = (Platform.constants ?? {}) as Record<string, unknown>;
  return scrub({
    os: Platform.OS,
    osVersion: String(Platform.Version ?? ''),
    release: c.Release,
    brand: c.Brand ?? c.Manufacturer,
    model: c.Model,
    app: Constants.expoConfig?.version,
    hermes: typeof (globalThis as { HermesInternal?: unknown }).HermesInternal !== 'undefined',
  }) as Data;
}

/** One flat line per crumb ("-1200ms fetch route=/photos status=200 ms=84") so the server log stays readable. */
function crumbLine(c: Crumb, now: number): string {
  const parts = c.d ? Object.entries(c.d).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`) : [];
  return trim([`-${now - c.t}ms`, c.e, ...parts].join(' '), 200);
}

function lastCrumbs(n = 12, from: Crumb[] = crumbs, now = Date.now()) {
  return from.slice(-n).map((c) => crumbLine(c, now));
}

function push(entry: LogEntry) {
  queue.push(entry);
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persistSoon();
}

/** A local trail entry; sent only together with errors, stalls and session reports. */
export function breadcrumb(event: string, data?: Data) {
  crumbs.push({ t: Date.now(), e: event, d: data ? (scrub(data) as Data) : undefined });
  if (crumbs.length > MAX_CRUMBS) crumbs = crumbs.slice(-MAX_CRUMBS);
  persistSoon();
}

/** Breadcrumb persisted right away, for steps that may hang the app before the debounce fires. */
export function checkpoint(event: string, data?: Data) {
  breadcrumb(event, data);
  persistNow();
}

/** Breadcrumb that is also reported to the server (key lifecycle moments). */
export function logEvent(event: string, data?: Data, level: Level = 'info') {
  breadcrumb(event, data);
  push({ level, event, at: new Date().toISOString(), data: data ? (scrub(data) as Data) : undefined });
  if (level !== 'info') flushSoon(2000);
}

export function logError(event: string, error: unknown, data?: Data) {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(scrub(error)));
  push({
    level: 'error',
    event,
    at: new Date().toISOString(),
    data: {
      ...(data ? (scrub(data) as Data) : {}),
      name: err.name,
      message: scrub(err.message),
      stack: trim(String(err.stack ?? ''), 1500),
      crumbs: lastCrumbs(),
    },
  });
  breadcrumb(`error:${event}`, { message: trim(err.message, 120) });
  flushSoon(1500);
}

export function lastBreadcrumb(): string | null {
  return crumbs.length ? crumbs[crumbs.length - 1].e : null;
}

/** Called with the blocked duration whenever the JS thread stalls for more than a second. */
export function onJsStall(listener: (ms: number) => void): () => void {
  stallListeners.add(listener);
  return () => {
    stallListeners.delete(listener);
  };
}

export function setDiagnosticsTransport(next: Transport) {
  transport = next;
  if (queue.length) flushSoon(3000);
}

function record(): SessionRecord {
  return { id: sessionId, started: startedAt, updated: Date.now(), fg: foreground, crumbs: crumbs.slice(-20), pending: queue.slice(-30) };
}

function persistNow() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  if (!restored) return;
  AsyncStorage.setItem(SESSION_KEY, JSON.stringify(record())).catch(() => {});
}

function persistSoon() {
  if (!restored || persistTimer) return;
  persistTimer = setTimeout(persistNow, 1000);
}

function flushSoon(delay: number) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, delay);
}

export async function flush(): Promise<void> {
  if (flushing || !transport || queue.length === 0 || Date.now() < backoffUntil) return;
  flushing = true;
  const batch = queue.slice(0, BATCH);
  queue = queue.slice(batch.length);
  try {
    await transport({ session: sessionId, device: deviceInfo(), entries: batch });
    persistSoon();
    if (queue.length) flushSoon(1000);
  } catch {
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
    backoffUntil = Date.now() + 30_000;
  } finally {
    flushing = false;
  }
}

async function reportPreviousSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const prev = JSON.parse(raw) as SessionRecord;
    if (prev?.pending?.length) queue = [...prev.pending.slice(-30), ...queue].slice(-MAX_QUEUE);
    if (prev?.fg) {
      const end = prev.crumbs?.[prev.crumbs.length - 1];
      queue.unshift({
        level: 'warn',
        event: 'previous_session_ended_in_foreground',
        at: new Date(prev.updated || Date.now()).toISOString(),
        data: {
          session: prev.id,
          ranMs: (prev.updated || 0) - (prev.started || 0),
          lastAgoMs: end ? (prev.updated || 0) - end.t : null,
          crumbs: lastCrumbs(12, prev.crumbs ?? [], prev.updated || Date.now()),
        },
      });
    }
  } catch {
    // a broken record is not worth reporting
  } finally {
    restored = true;
    persistNow();
    if (queue.length) flushSoon(5000);
  }
}

function installErrorHandlers() {
  const g = globalThis as {
    ErrorUtils?: { getGlobalHandler?: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void };
    HermesInternal?: { enablePromiseRejectionTracker?: (o: unknown) => void };
    addEventListener?: (type: string, fn: (e: { reason?: unknown; error?: unknown }) => void) => void;
  };
  const previous = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((error, fatal) => {
    try {
      logError(fatal ? 'js_fatal' : 'js_error', error);
      if (fatal) {
        persistNow();
        void flush();
        setTimeout(() => previous?.(error, fatal), 800);
        return;
      }
    } catch {
      // never let logging hide the original error
    }
    previous?.(error, fatal);
  });

  if (!__DEV__ && g.HermesInternal?.enablePromiseRejectionTracker) {
    g.HermesInternal.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (_id: number, rejection: unknown) => logError('unhandled_rejection', rejection ?? 'undefined'),
      onHandled: () => {},
    });
  }
  if (Platform.OS === 'web' && typeof g.addEventListener === 'function') {
    g.addEventListener('unhandledrejection', (e) => logError('unhandled_rejection', e.reason ?? 'undefined'));
  }
}

function installStallDetector() {
  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    const blocked = now - last - STALL_TICK_MS;
    last = now;
    if (!foreground || blocked < STALL_REPORT_MS) return;
    logEvent('js_stall', { ms: blocked, last: lastBreadcrumb(), recent: lastCrumbs(6) }, 'warn');
    for (const listener of stallListeners) {
      try {
        listener(blocked);
      } catch {
        // listeners are best effort
      }
    }
  }, STALL_TICK_MS);
  AppState.addEventListener('change', () => {
    last = Date.now();
  });
}

function onAppState(state: AppStateStatus) {
  const next = state === 'active';
  if (next === foreground) return;
  foreground = next;
  breadcrumb(next ? 'app_foreground' : 'app_background');
  persistNow();
  if (!next) void flush();
}

/** Call once, as early as possible (root layout module scope). */
export function installDiagnostics() {
  if (installed) return;
  installed = true;
  foreground = AppState.currentState !== 'background';
  installErrorHandlers();
  installStallDetector();
  AppState.addEventListener('change', onAppState);
  setInterval(() => {
    if (queue.length) void flush();
  }, FLUSH_MS);
  breadcrumb('app_start', { os: Platform.OS });
  void reportPreviousSession();
}
