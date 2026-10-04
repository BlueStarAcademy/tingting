import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from './http';

/** Fixed-window limit per signed-in user (or IP); in-memory, which is fine for a single instance. */
export function rateLimit(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.user?.userId ?? req.ip ?? 'anon';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
      if (hits.size > 1000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
    }
    entry.count += 1;
    if (entry.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: '검색을 너무 자주 했어요. 잠시 후 다시 시도해 주세요' });
      return;
    }
    next();
  };
}
