import { Router, type NextFunction, type Response } from 'express';
import bcrypt from 'bcryptjs';
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
    res.status(401).json({ error: '로그인이 필요해요' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { userId: string; email: string };
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해 주세요' });
  }
}

/** Create the two couple accounts from env on first boot. Existing passwords are never overwritten. */
export async function seedCoupleUsers(): Promise<void> {
  if (config.coupleUsers.length === 0) {
    console.warn('[auth] COUPLE_USER1_EMAIL / COUPLE_USER1_PASSWORD not set; no accounts seeded');
    return;
  }
  for (const u of config.coupleUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    const { rowCount } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [u.email, hash, u.displayName],
    );
    if (rowCount) console.log(`[auth] seeded ${u.email}`);
  }
}

async function buildSession(id: string, base: string): Promise<AuthSession> {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at');
  const me = rows.find((r) => String(r.id) === id);
  if (!me) throw new HttpError(401, '계정을 찾을 수 없어요');
  const partner = rows.find((r) => String(r.id) !== id);
  return { user: mapUser(me, base), partner: partner ? mapUser(partner, base) : null };
}

export const authRouter = Router();

authRouter.post(
  '/login',
  handle(async (req, res) => {
    const email = optionalString(req.body?.email)?.toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) throw new HttpError(400, '이메일과 비밀번호를 입력해 주세요');
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, String(row.password_hash)))) {
      throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않아요');
    }
    const session = await buildSession(String(row.id), publicBaseUrl(req));
    res.json({ token: signToken(String(row.id), email), session });
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

authRouter.post(
  '/password',
  authMiddleware,
  handle(async (req, res) => {
    const current = String(req.body?.currentPassword ?? '');
    const next = String(req.body?.newPassword ?? '');
    if (next.length < 6) throw new HttpError(400, '새 비밀번호는 6자 이상이어야 해요');
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId(req)]);
    if (!rows[0] || !(await bcrypt.compare(current, String(rows[0].password_hash)))) {
      throw new HttpError(400, '현재 비밀번호가 올바르지 않아요');
    }
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 10), userId(req)]);
    res.status(204).end();
  }),
);
