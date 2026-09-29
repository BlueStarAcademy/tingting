import { Router, type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthSession } from '@tingting/shared';
import { config } from './config';
import { pool } from './db';
import { handle, HttpError, optionalString, publicBaseUrl, toStoredUri, userId, type AuthedRequest } from './http';
import { mapUser } from './mappers';

function signToken(id: string, email: string): string {
  return jwt.sign({ userId: id, email }, config.jwtSecret, { expiresIn: '180d' });
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '사용자를 먼저 선택해 주세요' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { userId: string; email: string };
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: '세션이 만료됐어요. 앱을 다시 열어 주세요' });
  }
}

function requireAppKey(req: Request, res: Response, next: NextFunction): void {
  if (!config.appKey || req.get('x-app-key') === config.appKey) {
    next();
    return;
  }
  res.status(401).json({ error: '허용되지 않은 앱이에요' });
}

/** Make sure both of us exist. There is no password login, so email/password_hash are placeholders. */
export async function seedCoupleUsers(): Promise<void> {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  for (let n = Number(rows[0].n) + 1; n <= 2; n++) {
    const { rowCount } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, '', $2)
       ON CONFLICT (email) DO NOTHING`,
      [`user${n}@tingting.local`, config.coupleNames[n - 1]],
    );
    if (rowCount) console.log(`[auth] seeded user${n}`);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function buildSession(id: string, base: string): Promise<AuthSession> {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at');
  const me = rows.find((r) => String(r.id) === id);
  if (!me) throw new HttpError(401, '계정을 찾을 수 없어요');
  const partner = rows.find((r) => String(r.id) !== id);
  return { user: mapUser(me, base), partner: partner ? mapUser(partner, base) : null };
}

export const authRouter = Router();

authRouter.get(
  '/users',
  requireAppKey,
  handle(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at LIMIT 2');
    const base = publicBaseUrl(req);
    res.json(rows.map((r) => mapUser(r, base)));
  }),
);

authRouter.post(
  '/enter',
  requireAppKey,
  handle(async (req, res) => {
    const id = optionalString(req.body?.userId);
    if (!id || !UUID_RE.test(id)) throw new HttpError(400, '사용자를 선택해 주세요');
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows[0]) throw new HttpError(404, '사용자를 찾을 수 없어요');
    const session = await buildSession(id, publicBaseUrl(req));
    res.json({ token: signToken(id, String(rows[0].email)), session });
  }),
);

authRouter.get(
  '/me',
  authMiddleware,
  handle(async (req, res) => {
    res.json(await buildSession(userId(req), publicBaseUrl(req)));
  }),
);

authRouter.patch(
  '/me',
  authMiddleware,
  handle(async (req, res) => {
    const displayName = optionalString(req.body?.displayName);
    const avatarUri = optionalString(req.body?.avatarUri);
    const { rows } = await pool.query(
      `UPDATE users SET
         display_name = COALESCE($1, display_name),
         avatar_uri = COALESCE($2, avatar_uri)
       WHERE id = $3 RETURNING *`,
      [displayName, avatarUri ? toStoredUri(avatarUri) : null, userId(req)],
    );
    res.json(mapUser(rows[0], publicBaseUrl(req)));
  }),
);
