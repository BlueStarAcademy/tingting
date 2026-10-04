import { pool } from './db';

const MAX_MEMORY_ENTRIES = 400;
const memory = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
let lastPurge = 0;

function remember(key: string, value: unknown, expires: number): void {
  memory.delete(key);
  memory.set(key, { value, expires });
  if (memory.size > MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value!);
}

async function readDb<T>(key: string): Promise<{ value: T; expires: number } | null> {
  try {
    const { rows } = await pool.query('SELECT payload, expires_at FROM recommendation_cache WHERE key = $1 AND expires_at > now()', [key]);
    return rows[0] ? { value: rows[0].payload as T, expires: new Date(rows[0].expires_at).getTime() } : null;
  } catch (e) {
    console.warn('[cache] read failed', e instanceof Error ? e.message : e);
    return null;
  }
}

async function writeDb(key: string, value: unknown, expires: number): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO recommendation_cache (key, payload, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`,
      [key, JSON.stringify(value), new Date(expires)],
    );
    if (Date.now() - lastPurge > 3600_000) {
      lastPurge = Date.now();
      await pool.query('DELETE FROM recommendation_cache WHERE expires_at < now()');
    }
  } catch (e) {
    console.warn('[cache] write failed', e instanceof Error ? e.message : e);
  }
}

/** Memory first, then the DB table; `load` runs once per key even under concurrent requests. Errors are not cached. */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const task = (async () => {
    const stored = await readDb<T>(key);
    if (stored) {
      remember(key, stored.value, stored.expires);
      return stored.value;
    }
    const value = await load();
    const expires = Date.now() + ttlMs;
    remember(key, value, expires);
    await writeDb(key, value, expires);
    return value;
  })();
  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}
