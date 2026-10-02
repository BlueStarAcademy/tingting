import { Router, type NextFunction, type Request, type Response } from 'express';
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

/** Make sure both of us exist, and give anyone without a password the initial one. */
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
  if (!config.coupleInitialPassword) return;
  const { rowCount } = await pool.query(`UPDATE users SET password_hash = $1 WHERE password_hash = ''`, [
    await bcrypt.hash(config.coupleInitialPassword, 10),
  ]);
  if (rowCount) console.log(`[auth] set initial password for ${rowCount} user(s)`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_PASSWORD_LENGTH = 4;
const MAX_FAILURES = 5;
const LOCK_MS = 5 * 60 * 1000;

const failures = new Map<string, { count: number; lockedUntil: number }>();

function assertNotLocked(id: string): void {
  const entry = failures.get(id);
  if (!entry || entry.lockedUntil <= Date.now()) return;
  const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
  throw new HttpError(429, `비밀번호를 여러 번 틀렸어요. ${minutes}분 뒤에 다시 시도해 주세요`);
}

/** Checks the password and counts failures; locks the user after MAX_FAILURES in a row. */
async function verifyPassword(id: string, hash: string, password: string, wrong: HttpError): Promise<void> {
  assertNotLocked(id);
  if (!hash) throw new HttpError(403, '아직 비밀번호가 설정되지 않았어요. 서버 설정을 확인해 주세요');
  if (await bcrypt.compare(password, hash)) {
    failures.delete(id);
    return;
  }
  const count = (failures.get(id)?.count ?? 0) + 1;
  if (count >= MAX_FAILURES) {
    failures.set(id, { count: 0, lockedUntil: Date.now() + LOCK_MS });
    throw new HttpError(429, '비밀번호를 여러 번 틀렸어요. 5분 뒤에 다시 시도해 주세요');
  }
  failures.set(id, { count, lockedUntil: 0 });
  throw wrong;
}

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
    const password = req.body?.password;
    if (typeof password !== 'string') throw new HttpError(400, '앱을 최신 버전으로 업데이트한 뒤 비밀번호를 입력해 주세요');
    if (!password) throw new HttpError(400, '비밀번호를 입력해 주세요');
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows[0]) throw new HttpError(404, '사용자를 찾을 수 없어요');
    await verifyPassword(id, String(rows[0].password_hash ?? ''), password, new HttpError(401, '비밀번호가 맞지 않아요'));
    const session = await buildSession(id, publicBaseUrl(req));
    res.json({ token: signToken(id, String(rows[0].email)), session });
  }),
);

authRouter.post(
  '/refresh',
  authMiddleware,
  handle(async (req, res) => {
    const id = userId(req);
    const session = await buildSession(id, publicBaseUrl(req));
    res.json({ token: signToken(id, session.user.email), session });
  }),
);

authRouter.post(
  '/password',
  authMiddleware,
  handle(async (req, res) => {
    const id = userId(req);
    const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!current) throw new HttpError(400, '현재 비밀번호를 입력해 주세요');
    if (next.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(400, `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요`);
    }
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
    if (!rows[0]) throw new HttpError(401, '계정을 찾을 수 없어요');
    await verifyPassword(id, String(rows[0].password_hash ?? ''), current, new HttpError(400, '현재 비밀번호가 맞지 않아요'));
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 10), id]);
    res.status(204).end();
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
