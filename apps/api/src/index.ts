import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import {
  ADDITIONAL_GROUP_COST,
  DEMO_EMAIL,
  GPS_QUEST_RADIUS_METERS,
  GROUP_STATION_QUEST_RADIUS_METERS,
  INITIAL_STARS,
  QUEST_REWARD_DEFAULT,
  REGIONS,
  AI_FEATURE_COSTS,
  FEATURE_PASS_COSTS,
  buildFeaturePass,
  mergeFeaturePass,
  FEATURE_PASS_TIERS,
  FREE_GROUP_MEMBER_COUNT,
  GALLERY_SLOT_BATCH_SIZE,
  getGallerySlotUnlockCost,
  getGroupMemberInviteCost,
  pickRecommendedPlaces,
  REGION_MAIN_STATIONS,
  buildGroupStationQuestId,
  GROUP_STATION_QUEST_GALLERY_REWARD,
  SEED_PUBLIC_EXPERIENCE_POSTS,
  ADMIN_EMAIL,
  ADMIN_SEED_PASSWORD,
  MAX_GROUP_SLOTS,
  normalizeAdminLoginEmail,
  isAdminProfile,
  buildAdminFeaturePasses,
  getDisplayNameChangeCost,
  validateNickname,
} from '@tingting/shared';
import type {
  AdminUserSummary,
  CustomerInquiry,
  GroupChatMessage,
  GroupInviteStatus,
  MailboxMessage,
  MailboxMessageType,
  Quest,
  FeaturePass,
  FeaturePassTier,
} from '@tingting/shared';
import type { Place } from '@tingting/shared';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET ?? 'tingting-dev-secret-change-me';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const KAKAO_APP_ID = process.env.KAKAO_APP_ID ? Number(process.env.KAKAO_APP_ID) : null;
const REGION_PHOTO_REVIEW_QUEST_TARGET = 3;
const REGION_PHOTO_REVIEW_QUEST_REWARD = 20;
const REGION_PUBLIC_REVIEW_QUEST_TARGET = 1;
const REGION_PUBLIC_REVIEW_QUEST_REWARD = 30;

function buildRegionActivityQuestId(regionCode: string, kind: 'photo_reviews' | 'public_review'): string {
  return `region-activity-${regionCode}-${kind}`;
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

interface AuthPayload {
  userId: string;
  email: string;
  emailVerified?: boolean;
  isSupabaseAuth?: boolean;
}

interface AuthedRequest extends Request {
  user?: AuthPayload;
}

type ActivityQuest = Quest & {
  questKind: 'photo_reviews' | 'public_review';
  targetCount: number;
  progressCount: number;
};

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({
  ok: true,
  service: 'tingting-api',
  config: {
    supabaseJwtSecret: SUPABASE_JWT_SECRET ? `set (${SUPABASE_JWT_SECRET.length} chars)` : 'NOT SET',
    jwtSecret: JWT_SECRET === 'tingting-dev-secret-change-me' ? 'DEFAULT (not production)' : `set (${JWT_SECRET.length} chars)`,
    corsOrigin: CORS_ORIGIN,
    nodeEnv: process.env.NODE_ENV ?? 'undefined',
    databaseUrl: DATABASE_URL ? 'set' : 'NOT SET',
  },
}));

async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const supabasePayload = verifySupabaseAccessToken(token);
    if (supabasePayload) {
      const user = await ensureUserProfile(supabasePayload);
      req.user = { ...supabasePayload, userId: user.id, email: user.email };
      next();
      return;
    }
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
    next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    res.status(401).json({ error: 'Invalid token', detail: msg });
  }
}

async function adminMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user?.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!(await userIsAdmin(req.user.userId))) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
}

function signToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
}

function verifySupabaseAccessToken(token: string): AuthPayload | null {
  if (!SUPABASE_JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload & {
      email?: string;
      email_verified?: boolean;
      email_confirmed_at?: string;
      role?: string;
    };
    if (!payload.sub || !payload.email) return null;
    if (payload.role && payload.role !== 'authenticated') return null;
    return {
      userId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: Boolean(payload.email_verified || payload.email_confirmed_at || payload.role === 'authenticated'),
      isSupabaseAuth: true,
    };
  } catch (e) {
    console.error('[verifySupabaseAccessToken] failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapUser(row: Record<string, unknown>) {
  const role = (row.role as string) ?? 'user';
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    stars: row.stars,
    onboardingComplete: row.onboarding_complete,
    visitedRegions: row.visited_regions ?? [],
    isDemo: row.is_demo ?? false,
    role,
    isAdmin: role === 'admin',
    unlockedGroupSlots: role === 'admin' ? MAX_GROUP_SLOTS : undefined,
    displayNameChangeCount: Number(row.display_name_change_count ?? 0),
    emailVerified: Boolean(row.email_verified),
    photoUri: row.photo_uri ?? undefined,
    birthday: row.birthday ?? undefined,
    profilePublic: row.profile_public !== false,
  };
}

function mapPublicUser(row: Record<string, unknown>, viewerId?: string) {
  const profile = mapUser(row);
  if (viewerId === String(row.id) || profile.profilePublic !== false) return profile;
  return {
    ...profile,
    email: '',
    birthday: undefined,
    mbti: undefined,
    mbtiTestCompleted: false,
    phone: undefined,
    profilePublic: false,
  };
}

function nicknameValidationError(name: string): string | null {
  const err = validateNickname(name);
  if (err === 'empty') return '닉네임을 입력해 주세요';
  if (err === 'too_short') return '닉네임은 2자 이상 입력해 주세요';
  if (err === 'too_long') return '닉네임은 8자 이하로 입력해 주세요';
  return null;
}

async function userIsAdmin(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.role === 'admin';
}

async function getUserById(id: string) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function ensureUserProfile(payload: AuthPayload) {
  const verifiedAt = payload.emailVerified ? new Date() : null;
  const byId = await getUserById(payload.userId);
  if (byId) {
    const { rows } = await pool.query(
      `UPDATE users
       SET email = $1,
           email_verified = email_verified OR $2,
           email_verified_at = COALESCE(email_verified_at, $3)
       WHERE id = $4
       RETURNING *`,
      [payload.email.toLowerCase(), Boolean(payload.emailVerified), verifiedAt, payload.userId],
    );
    return rows[0];
  }

  const { rows: byEmailRows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [payload.email]);
  if (byEmailRows[0]) {
    const { rows } = await pool.query(
      `UPDATE users
       SET email_verified = email_verified OR $1,
           email_verified_at = COALESCE(email_verified_at, $2)
       WHERE id = $3
       RETURNING *`,
      [Boolean(payload.emailVerified), verifiedAt, byEmailRows[0].id],
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO users (id, email, password_hash, display_name, stars, email_verified, email_verified_at)
     VALUES ($1, $2, '', '', $3, $4, $5)
     RETURNING *`,
    [payload.userId, payload.email.toLowerCase(), INITIAL_STARS, Boolean(payload.emailVerified), verifiedAt],
  );
  return rows[0];
}

async function migrate() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '001_railway.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);

  const kakaoSqlPath = path.join(__dirname, '..', 'migrations', '002_kakao_auth.sql');
  if (fs.existsSync(kakaoSqlPath)) {
    await pool.query(fs.readFileSync(kakaoSqlPath, 'utf8'));
  }

  const nicknameSqlPath = path.join(__dirname, '..', 'migrations', '003_nickname_change_count.sql');
  if (fs.existsSync(nicknameSqlPath)) {
    await pool.query(fs.readFileSync(nicknameSqlPath, 'utf8'));
  }

  const supabaseAuthSqlPath = path.join(__dirname, '..', 'migrations', '004_supabase_auth.sql');
  if (fs.existsSync(supabaseAuthSqlPath)) {
    await pool.query(fs.readFileSync(supabaseAuthSqlPath, 'utf8'));
  }

  // Ensure every group owner has a group_members row (legacy data repair).
  await pool.query(
    `INSERT INTO group_members (group_id, user_id)
     SELECT g.id, g.owner_id FROM groups g
     WHERE NOT EXISTS (
       SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = g.owner_id
     )`
  );

  const adminHash = await bcrypt.hash(ADMIN_SEED_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, display_name, stars, onboarding_complete, role)
     VALUES ($1, $2, 'tingadmin', 999999, true, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       display_name = EXCLUDED.display_name,
       onboarding_complete = true`,
    [ADMIN_EMAIL, adminHash]
  );
  console.log(`Admin account ready: ${ADMIN_EMAIL}`);

  const seedCandidates = [
    path.join(__dirname, '..', 'seed', 'places.json'),
    path.join(__dirname, '..', '..', '..', 'seed', 'places.json'),
    path.join(process.cwd(), 'seed', 'places.json'),
  ];
  const placesPath = seedCandidates.find((p) => fs.existsSync(p));
  if (!placesPath) {
    console.warn('places.json seed not found — food/stay/recommended places may be missing');
    return;
  }

  const places = JSON.parse(fs.readFileSync(placesPath, 'utf8')) as Array<Record<string, unknown>>;
  for (const p of places) {
    await pool.query(
      `INSERT INTO places (id, region_code, name, description, lat, lng, category, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         region_code = EXCLUDED.region_code,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         category = EXCLUDED.category,
         image_url = EXCLUDED.image_url`,
      [p.id, p.regionCode, p.name, p.description ?? '', p.lat, p.lng, p.category ?? '', p.imageUrl ?? null]
    );
  }
  console.log(`Seeded ${places.length} places from ${placesPath}`);
}

// --- Auth ---

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body as { email?: string; password?: string; displayName?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const name = (displayName ?? '').trim();
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, stars) VALUES ($1,$2,$3,$4) RETURNING *`,
      [email.toLowerCase(), hash, name, INITIAL_STARS]
    );
    const user = rows[0];
    const token = signToken(user.id, user.email);
    res.json({ token, session: { userId: user.id, email: user.email, isDemo: false }, profile: mapUser(user) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Signup failed';
    if (msg.includes('duplicate')) res.status(409).json({ error: 'Email already registered' });
    else res.status(500).json({ error: msg });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const normalizedEmail = normalizeAdminLoginEmail(email);
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken(user.id, user.email);
    res.json({ token, session: { userId: user.id, email: user.email, isDemo: user.is_demo }, profile: mapUser(user) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Login failed' });
  }
});

app.post('/auth/demo', async (_req, res) => {
  try {
    let { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [DEMO_EMAIL]);
    let user = rows[0];
    if (!user) {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, stars, onboarding_complete, visited_regions, is_demo)
         VALUES ($1,'', '데모 여행자', $2, true, $3, true) RETURNING *`,
        [DEMO_EMAIL, INITIAL_STARS, ['SEO', 'BUS', 'JEJ']]
      );
      user = result.rows[0];
    }
    const token = signToken(user.id, user.email);
    res.json({ token, session: { userId: user.id, email: user.email, isDemo: true }, profile: mapUser(user) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Demo login failed' });
  }
});

interface KakaoProfile {
  id: number;
  nickname: string;
}

async function fetchKakaoProfile(accessToken: string): Promise<KakaoProfile> {
  const tokenRes = await fetch('https://kapi.kakao.com/v1/user/access_token_info', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!tokenRes.ok) {
    throw new Error('Invalid Kakao access token');
  }

  const tokenInfo = (await tokenRes.json()) as { app_id?: number };
  if (KAKAO_APP_ID && tokenInfo.app_id !== KAKAO_APP_ID) {
    throw new Error('Kakao token app mismatch');
  }

  const meRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meRes.ok) {
    throw new Error('Failed to load Kakao profile');
  }

  const me = (await meRes.json()) as {
    id: number;
    properties?: { nickname?: string };
    kakao_account?: { profile?: { nickname?: string } };
  };

  const nickname =
    me.kakao_account?.profile?.nickname?.trim() ||
    me.properties?.nickname?.trim() ||
    `카카오${String(me.id).slice(-4)}`;

  return { id: me.id, nickname };
}

function kakaoOAuthEmail(kakaoId: number): string {
  return `kakao_${kakaoId}@oauth.tingting.app`;
}

app.post('/auth/kakao', async (req, res) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };
    if (!accessToken) {
      res.status(400).json({ error: 'accessToken required' });
      return;
    }

    const kakao = await fetchKakaoProfile(accessToken);
    let { rows } = await pool.query('SELECT * FROM users WHERE kakao_id = $1', [kakao.id]);
    let user = rows[0];

    if (!user) {
      const email = kakaoOAuthEmail(kakao.id);
      const insert = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, stars, kakao_id)
         VALUES ($1, '', $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           kakao_id = COALESCE(users.kakao_id, EXCLUDED.kakao_id),
           display_name = CASE
             WHEN users.display_name = '' OR users.display_name IS NULL THEN EXCLUDED.display_name
             ELSE users.display_name
           END
         RETURNING *`,
        [email, kakao.nickname, INITIAL_STARS, kakao.id],
      );
      user = insert.rows[0];
    }

    const token = signToken(user.id, user.email);
    res.json({
      token,
      session: { userId: user.id, email: user.email, isDemo: false },
      profile: mapUser(user),
    });
  } catch (e: unknown) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Kakao login failed' });
  }
});

app.get('/auth/me', authMiddleware, async (req: AuthedRequest, res) => {
  const user = await getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ profile: mapUser(user) });
});

app.post('/auth/onboarding', authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { displayName } = req.body as { displayName?: string };
    const trimmed = (displayName ?? '').trim();
    const nicknameError = nicknameValidationError(trimmed);
    if (nicknameError) {
      res.status(400).json({ error: nicknameError });
      return;
    }
    const { rows } = await pool.query(
      'UPDATE users SET display_name = $1, onboarding_complete = true WHERE id = $2 RETURNING *',
      [trimmed, req.user!.userId],
    );
    res.json({ profile: mapUser(rows[0]) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Onboarding failed' });
  }
});

app.patch('/profile', authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { photoUri, birthday, profilePublic } = req.body as {
      photoUri?: unknown;
      birthday?: unknown;
      profilePublic?: unknown;
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    if (Object.prototype.hasOwnProperty.call(req.body, 'photoUri')) {
      values.push(typeof photoUri === 'string' && photoUri.trim() ? photoUri.trim() : null);
      updates.push(`photo_uri = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'birthday')) {
      values.push(typeof birthday === 'string' && birthday.trim() ? birthday.trim() : null);
      updates.push(`birthday = $${values.length}`);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'profilePublic')) {
      if (typeof profilePublic !== 'boolean') {
        res.status(400).json({ error: 'profilePublic must be boolean' });
        return;
      }
      values.push(profilePublic);
      updates.push(`profile_public = $${values.length}`);
    }

    if (updates.length === 0) {
      const user = await getUserById(req.user!.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ profile: mapUser(user) });
      return;
    }

    values.push(req.user!.userId);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ profile: mapUser(rows[0]) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Profile update failed' });
  }
});

app.post('/profile/display-name', authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { displayName } = req.body as { displayName?: string };
    const trimmed = (displayName ?? '').trim();
    const nicknameError = nicknameValidationError(trimmed);
    if (nicknameError) {
      res.status(400).json({ error: nicknameError });
      return;
    }

    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (trimmed === user.display_name) {
      res.json({ profile: mapUser(user), cost: 0 });
      return;
    }

    const priorCount = Number(user.display_name_change_count ?? 0);
    const cost = getDisplayNameChangeCost(priorCount);
    if (cost > 0 && Number(user.stars) < cost) {
      res.status(400).json({ error: '스타가 부족합니다' });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE users SET
         display_name = $1,
         display_name_change_count = $2,
         stars = stars - $3
       WHERE id = $4
       RETURNING *`,
      [trimmed, priorCount + 1, cost, req.user!.userId],
    );

    res.json({ profile: mapUser(rows[0]), cost });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Nickname change failed' });
  }
});

app.get('/users/:userId/profile', authMiddleware, async (req: AuthedRequest, res) => {
  const user = await getUserById(req.params.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(mapPublicUser(user, req.user!.userId));
});

// --- Dashboard ---

app.get('/dashboard', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const groupsResult = await pool.query(
    `SELECT g.*, array_agg(gm.user_id) AS member_ids
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE g.owner_id = $1 OR EXISTS (SELECT 1 FROM group_members x WHERE x.group_id = g.id AND x.user_id = $1)
     GROUP BY g.id ORDER BY g.created_at DESC`,
    [userId]
  );

  const visitsResult = await pool.query(
    'SELECT * FROM visits WHERE user_id = $1 ORDER BY visited_at DESC LIMIT 6',
    [userId]
  );

  const visitedSet = new Set<string>(user.visited_regions ?? []);

  res.json({
    profile: mapUser(user),
    groups: groupsResult.rows.map(mapGroupRow),
    recentVisits: visitsResult.rows.map(mapVisit),
    regionProgress: REGIONS.map((r) => ({ code: r.code, visited: visitedSet.has(r.code) })),
    totalRegions: REGIONS.length,
    visitedCount: (user.visited_regions ?? []).length,
  });
});

// --- Groups ---

app.get('/groups', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, array_agg(gm.user_id) AS member_ids FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE g.owner_id = $1 OR EXISTS (SELECT 1 FROM group_members x WHERE x.group_id = g.id AND x.user_id = $1)
     GROUP BY g.id ORDER BY g.created_at DESC`,
    [req.user!.userId]
  );
  res.json(rows.map(mapGroupRow));
});

app.post('/groups', authMiddleware, async (req: AuthedRequest, res) => {
  const client = await pool.connect();
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name) {
      res.status(400).json({ error: 'name required' });
      return;
    }
    await client.query('BEGIN');
    const userId = req.user!.userId;
    const isAdmin = await userIsAdmin(userId);
    const countResult = await client.query('SELECT COUNT(*)::int AS c FROM groups WHERE owner_id = $1', [userId]);
    const cost = isAdmin ? 0 : countResult.rows[0].c >= 1 ? ADDITIONAL_GROUP_COST : 0;
    const userResult = await client.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const stars = userResult.rows[0].stars;
    if (!isAdmin && stars < cost) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Insufficient stars' });
      return;
    }
    if (cost > 0) {
      await client.query('UPDATE users SET stars = stars - $1 WHERE id = $2', [cost, userId]);
      await client.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [userId, -cost, 'create_group']);
    }
    const groupResult = await client.query(
      'INSERT INTO groups (name, description, owner_id) VALUES ($1,$2,$3) RETURNING *',
      [name, description ?? null, userId]
    );
    const group = groupResult.rows[0];
    await client.query('INSERT INTO group_members (group_id, user_id) VALUES ($1,$2)', [group.id, userId]);
    await client.query('COMMIT');
    res.json({
      group: mapGroupRow({ ...group, member_ids: [userId] }),
      cost,
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e instanceof Error ? e.message : 'Create group failed' });
  } finally {
    client.release();
  }
});

app.get('/groups/:id', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, array_agg(gm.user_id) AS member_ids FROM groups g
     JOIN group_members gm ON gm.group_id = g.id WHERE g.id = $1 GROUP BY g.id`,
    [req.params.id]
  );
  const g = rows[0];
  if (!g) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json(mapGroupRow(g));
});

app.post('/groups/:id/shared-gallery-uploader', authMiddleware, async (req: AuthedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.userId;
  const { memberId } = req.body as { memberId?: string | null };
  const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1', [groupId]);
  const group = groupResult.rows[0];
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.owner_id !== userId) {
    res.status(403).json({ error: 'Only owner can delegate shared gallery uploads' });
    return;
  }

  const nextUploaderId = typeof memberId === 'string' && memberId.trim() ? memberId.trim() : null;
  if (nextUploaderId) {
    if (nextUploaderId === group.owner_id) {
      res.status(400).json({ error: 'Owner already has upload permission by default' });
      return;
    }
    const memberResult = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, nextUploaderId],
    );
    if (!memberResult.rows[0]) {
      res.status(400).json({ error: 'Upload permission can only be delegated to a group member' });
      return;
    }
  }

  await pool.query('UPDATE groups SET shared_gallery_uploader_id = $1 WHERE id = $2', [nextUploaderId, groupId]);
  const { rows } = await pool.query(
    `SELECT g.*, array_agg(gm.user_id) AS member_ids
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE g.id = $1
     GROUP BY g.id`,
    [groupId],
  );
  res.json(mapGroupRow(rows[0]));
});

app.post('/groups/:id/unlock-gallery-slots', authMiddleware, async (req: AuthedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.userId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const groupResult = await client.query('SELECT * FROM groups WHERE id = $1 FOR UPDATE', [groupId]);
    const group = groupResult.rows[0];
    if (!group) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    if (group.owner_id !== userId) {
      await client.query('ROLLBACK');
      res.status(403).json({ error: 'Only owner can unlock gallery slots' });
      return;
    }
    const isAdmin = await userIsAdmin(userId);
    const cost = isAdmin ? 0 : getGallerySlotUnlockCost();
    const userResult = await client.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!isAdmin && Number(userResult.rows[0]?.stars ?? 0) < cost) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Insufficient stars' });
      return;
    }
    if (cost > 0) {
      await client.query('UPDATE users SET stars = stars - $1 WHERE id = $2', [cost, userId]);
      await client.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [
        userId,
        -cost,
        'unlock_gallery_slots',
      ]);
    }
    await client.query(
      'UPDATE groups SET unlocked_gallery_slots = COALESCE(unlocked_gallery_slots, 0) + $1 WHERE id = $2',
      [GALLERY_SLOT_BATCH_SIZE, groupId],
    );
    const { rows } = await client.query(
      `SELECT g.*, array_agg(gm.user_id) AS member_ids
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE g.id = $1
       GROUP BY g.id`,
      [groupId],
    );
    await client.query('COMMIT');
    res.json({ group: mapGroupRow(rows[0]), cost });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unlock gallery slots failed' });
  } finally {
    client.release();
  }
});

async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2
     UNION ALL
     SELECT 1 FROM groups WHERE id = $1 AND owner_id = $2
     LIMIT 1`,
    [groupId, userId]
  );
  return rows.length > 0;
}

app.get('/groups/:id/visits', authMiddleware, async (req: AuthedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.userId;
  if (!(await isGroupMember(groupId, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const { rows } = await pool.query(
    'SELECT * FROM visits WHERE group_id = $1 ORDER BY visited_at DESC',
    [groupId]
  );
  res.json(rows.map(mapVisit));
});

app.get('/groups/:id/chat', authMiddleware, async (req: AuthedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.userId;
  if (!(await isGroupMember(groupId, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const { rows } = await pool.query(
    `SELECT m.*, u.display_name FROM group_chat_messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.group_id = $1
     ORDER BY m.created_at ASC
     LIMIT 200`,
    [groupId]
  );
  res.json(rows.map(mapChatMessage));
});

app.post('/groups/:id/chat', authMiddleware, async (req: AuthedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.userId;
  const { text } = req.body as { text?: string };
  const trimmed = text?.trim();
  if (!trimmed) {
    res.status(400).json({ error: 'text required' });
    return;
  }
  if (!(await isGroupMember(groupId, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const user = await getUserById(userId);
  const { rows } = await pool.query(
    `INSERT INTO group_chat_messages (group_id, user_id, text) VALUES ($1,$2,$3) RETURNING *`,
    [groupId, userId, trimmed]
  );
  res.json(mapChatMessage({ ...rows[0], display_name: user?.display_name ?? '' }));
});

app.delete('/groups/:id/chat/:messageId', authMiddleware, async (req: AuthedRequest, res) => {
  const { id: groupId, messageId } = req.params;
  const userId = req.user!.userId;
  if (!(await isGroupMember(groupId, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const { rows } = await pool.query(
    'SELECT * FROM group_chat_messages WHERE id = $1 AND group_id = $2',
    [messageId, groupId]
  );
  const msg = rows[0];
  if (!msg) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  if (msg.user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  await pool.query('DELETE FROM group_chat_messages WHERE id = $1 AND group_id = $2 AND user_id = $3', [
    messageId,
    groupId,
    userId,
  ]);
  res.status(204).send();
});

app.get('/groups/:id/quests', authMiddleware, async (req: AuthedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.userId;
  if (!(await isGroupMember(groupId, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const visitedRegions = await getGroupVisitedRegionCodes(groupId);
  const completedResult = await pool.query(
    'SELECT quest_id FROM group_quest_completions WHERE group_id = $1',
    [groupId]
  );
  const completedIds = new Set(completedResult.rows.map((r) => r.quest_id as string));
  const activityCounts = await getGroupRegionReviewCounts(groupId);
  res.json([
    ...buildGroupStationQuests(visitedRegions, completedIds),
    ...buildGroupActivityQuests(activityCounts, completedIds),
  ]);
});

app.post('/groups/:id/quests/:questId/complete', authMiddleware, async (req: AuthedRequest, res) => {
  const { id: groupId, questId } = req.params;
  const userId = req.user!.userId;
  const { lat, lng } = req.body as { lat?: number; lng?: number };
  if (lat == null || lng == null) {
    res.status(400).json({ error: 'lat and lng required' });
    return;
  }
  if (!(await isGroupMember(groupId, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const visitedRegions = await getGroupVisitedRegionCodes(groupId);
  const completedResult = await pool.query(
    'SELECT quest_id FROM group_quest_completions WHERE group_id = $1',
    [groupId]
  );
  const completedIds = new Set(completedResult.rows.map((r) => r.quest_id as string));
  const quests = buildGroupStationQuests(visitedRegions, completedIds);
  const quest = quests.find((q) => q.id === questId);
  if (!quest) {
    res.status(404).json({ error: 'Quest not found' });
    return;
  }
  if (quest.completed) {
    res.status(400).json({ error: 'Already completed' });
    return;
  }
  const dist = haversineMeters(lat, lng, quest.targetLat, quest.targetLng);
  if (dist > quest.radiusMeters) {
    res.status(400).json({ error: 'Too far from quest location', distance: Math.round(dist) });
    return;
  }
  await pool.query('INSERT INTO group_quest_completions (group_id, quest_id) VALUES ($1,$2)', [groupId, questId]);
  res.json({ rewardGallerySlots: GROUP_STATION_QUEST_GALLERY_REWARD });
});

app.post('/groups/:id/quests/:questId/skip-purchase', authMiddleware, async (req: AuthedRequest, res) => {
  const { id: groupId, questId } = req.params;
  const userId = req.user!.userId;
  if (!(await isGroupMember(groupId, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const existing = await pool.query(
    'SELECT 1 FROM group_quest_completions WHERE group_id = $1 AND quest_id = $2',
    [groupId, questId]
  );
  if (existing.rows.length) {
    res.status(400).json({ error: 'Already completed' });
    return;
  }
  await pool.query('INSERT INTO group_quest_completions (group_id, quest_id) VALUES ($1,$2)', [groupId, questId]);
  res.json({ rewardGallerySlots: GROUP_STATION_QUEST_GALLERY_REWARD });
});

// --- Places ---

app.get('/places', async (req, res) => {
  const region = req.query.region as string | undefined;
  const { rows } = region
    ? await pool.query('SELECT * FROM places WHERE region_code = $1 ORDER BY name', [region])
    : await pool.query('SELECT * FROM places ORDER BY region_code, name');
  res.json(rows.map(mapPlace));
});

app.get('/places/recommended', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '6'), 10) || 6, 1), 20);
  const { rows } = await pool.query('SELECT * FROM places ORDER BY region_code, name');
  const places = rows.map(mapPlace);
  res.json(pickRecommendedPlaces(places, limit));
});

app.get('/places/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM places WHERE id = $1', [req.params.id]);
  if (!rows[0]) {
    res.status(404).json({ error: 'Place not found' });
    return;
  }
  res.json(mapPlace(rows[0]));
});

app.get('/feed/experiences', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT v.*, u.display_name, u.photo_uri AS user_photo_uri, p.name AS place_name, p.region_code
     FROM visits v
     JOIN users u ON u.id = v.user_id
     JOIN places p ON p.id = v.place_id
     WHERE v.is_public = true
       AND COALESCE(v.photo_uri, v.edited_photo_uri) IS NOT NULL
       AND COALESCE(NULLIF(TRIM(v.note), ''), '') <> ''
     ORDER BY v.visited_at DESC
     LIMIT 100`,
  );
  const fromVisits = rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    displayName: String(row.display_name ?? '여행러'),
    userPhotoUri: row.user_photo_uri ? String(row.user_photo_uri) : undefined,
    placeId: String(row.place_id),
    placeName: String(row.place_name ?? row.place_id),
    regionCode: String(row.region_code ?? ''),
    photoUri: String(row.edited_photo_uri ?? row.photo_uri),
    note: row.note ? String(row.note) : undefined,
    visitedAt: row.visited_at as string,
  }));
  res.json([...fromVisits, ...SEED_PUBLIC_EXPERIENCE_POSTS]);
});

// --- Visits ---

app.get('/visits', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query('SELECT * FROM visits WHERE user_id = $1 ORDER BY visited_at DESC', [req.user!.userId]);
  res.json(rows.map(mapVisit));
});

app.post('/visits', authMiddleware, async (req: AuthedRequest, res) => {
  const { placeId, photoUri, groupId, note, lat, lng, isPublic, isSharedGallery } = req.body as Record<string, unknown>;
  if (!placeId || !photoUri) {
    res.status(400).json({ error: 'placeId and photoUri required' });
    return;
  }
  const placeResult = await pool.query('SELECT * FROM places WHERE id = $1', [placeId]);
  const place = placeResult.rows[0];
  if (!place) {
    res.status(404).json({ error: 'Place not found' });
    return;
  }
  const userId = req.user!.userId;
  const groupIdValue = typeof groupId === 'string' && groupId.trim() ? groupId.trim() : null;
  if (groupIdValue && !(await isGroupMember(groupIdValue, userId))) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (groupIdValue && isSharedGallery === true) {
    const groupResult = await pool.query('SELECT owner_id, shared_gallery_uploader_id FROM groups WHERE id = $1', [
      groupIdValue,
    ]);
    const group = groupResult.rows[0];
    const allowedUploaderId = group?.shared_gallery_uploader_id ?? group?.owner_id;
    if (allowedUploaderId !== userId) {
      res.status(403).json({ error: 'No shared gallery upload permission' });
      return;
    }
  }
  const noteValue = typeof note === 'string' && note.trim() ? note.trim() : null;
  const visitResult = await pool.query(
    `INSERT INTO visits (user_id, place_id, group_id, photo_uri, note, lat, lng, is_public, is_shared_gallery)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [userId, placeId, groupIdValue, photoUri, noteValue, lat ?? null, lng ?? null, isPublic === true, isSharedGallery === true]
  );
  await pool.query(
    `UPDATE users SET visited_regions = (
       SELECT array_agg(DISTINCT x) FROM unnest(COALESCE(visited_regions, '{}') || $1::text) AS x
     ) WHERE id = $2`,
    [[place.region_code], userId]
  );
  if (groupIdValue) {
    await awardCompletedActivityQuests(groupIdValue, userId);
  }
  res.json(mapVisit(visitResult.rows[0]));
});

app.patch('/visits/:id', authMiddleware, async (req: AuthedRequest, res) => {
  const { editedPhotoUri, filter, note, photoUri, isPublic } = req.body as Record<string, unknown>;
  const userId = req.user!.userId;
  const visitId = req.params.id;
  const noteValue = typeof note === 'string' && note.trim() ? note.trim() : null;
  const hasIsPublic = Object.prototype.hasOwnProperty.call(req.body, 'isPublic');

  if (photoUri) {
    const { rows } = await pool.query(
      `UPDATE visits SET
         photo_uri = $1,
         edited_photo_uri = NULL,
         filter = NULL,
         note = COALESCE($2, note),
         is_public = CASE WHEN $3::boolean IS NULL THEN is_public ELSE $3::boolean END
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [photoUri, noteValue, hasIsPublic ? isPublic === true : null, visitId, userId]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }
    if (rows[0].group_id) await awardCompletedActivityQuests(rows[0].group_id, userId);
    res.json(mapVisit(rows[0]));
    return;
  }

  const { rows } = await pool.query(
    `UPDATE visits SET
       edited_photo_uri = COALESCE($1, edited_photo_uri),
       filter = COALESCE($2, filter),
       note = COALESCE($3, note),
       is_public = CASE WHEN $4::boolean IS NULL THEN is_public ELSE $4::boolean END
     WHERE id = $5 AND user_id = $6 RETURNING *`,
    [editedPhotoUri ?? null, filter ?? null, noteValue, hasIsPublic ? isPublic === true : null, visitId, userId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Visit not found' });
    return;
  }
  if (rows[0].group_id) await awardCompletedActivityQuests(rows[0].group_id, userId);
  res.json(mapVisit(rows[0]));
});

app.delete('/visits/:id', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const visitId = req.params.id;
  const deleted = await pool.query('DELETE FROM visits WHERE id = $1 AND user_id = $2 RETURNING place_id', [
    visitId,
    userId,
  ]);
  if (!deleted.rows[0]) {
    res.status(404).json({ error: 'Visit not found' });
    return;
  }

  const remaining = await pool.query(
    `SELECT DISTINCT p.region_code FROM visits v
     JOIN places p ON p.id = v.place_id
     WHERE v.user_id = $1`,
    [userId]
  );
  const regions = remaining.rows.map((r) => r.region_code);
  await pool.query('UPDATE users SET visited_regions = $1 WHERE id = $2', [regions, userId]);

  res.status(204).send();
});

// --- Quests (generated from places) ---

app.get('/quests', authMiddleware, async (req: AuthedRequest, res) => {
  const placesResult = await pool.query('SELECT * FROM places LIMIT 8');
  const completedResult = await pool.query('SELECT quest_id FROM quest_completions WHERE user_id = $1', [req.user!.userId]);
  const completed = new Set(completedResult.rows.map((r) => r.quest_id));
  const quests = placesResult.rows.map((p, i) => ({
    id: 'quest-' + p.id,
    placeId: p.id,
    title: p.name + ' 방문 퀘스트',
    description: p.name + ' 근처에서 GPS 인증을 완료하세요.',
    rewardStars: QUEST_REWARD_DEFAULT + (i % 3) * 5,
    targetLat: p.lat,
    targetLng: p.lng,
    radiusMeters: GPS_QUEST_RADIUS_METERS,
    completed: completed.has('quest-' + p.id),
  }));
  res.json(quests);
});

app.post('/quests/:id/complete', authMiddleware, async (req: AuthedRequest, res) => {
  const { lat, lng } = req.body as { lat?: number; lng?: number };
  if (lat == null || lng == null) {
    res.status(400).json({ error: 'lat and lng required' });
    return;
  }
  const questId = req.params.id;
  const placeId = questId.replace(/^quest-/, '');
  const placeResult = await pool.query('SELECT * FROM places WHERE id = $1', [placeId]);
  const place = placeResult.rows[0];
  if (!place) {
    res.status(404).json({ error: 'Quest not found' });
    return;
  }
  const userId = req.user!.userId;
  const existing = await pool.query('SELECT 1 FROM quest_completions WHERE user_id = $1 AND quest_id = $2', [userId, questId]);
  if (existing.rows.length) {
    res.status(400).json({ error: 'Already completed' });
    return;
  }
  const dist = haversineMeters(lat, lng, place.lat, place.lng);
  if (dist > GPS_QUEST_RADIUS_METERS) {
    res.status(400).json({ error: 'Too far from quest location', distance: Math.round(dist) });
    return;
  }
  const reward = QUEST_REWARD_DEFAULT;
  await pool.query('INSERT INTO quest_completions (user_id, quest_id) VALUES ($1,$2)', [userId, questId]);
  const { rows } = await pool.query('UPDATE users SET stars = stars + $1 WHERE id = $2 RETURNING stars', [reward, userId]);
  await pool.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [userId, reward, 'quest_complete']);
  res.json({ reward, stars: rows[0].stars });
});

// --- Stars & AI ---

app.post('/stars/spend', authMiddleware, async (req: AuthedRequest, res) => {
  const { amount, reason } = req.body as { amount?: number; reason?: string };
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }
  const userId = req.user!.userId;
  if (await userIsAdmin(userId)) {
    const { rows } = await pool.query('SELECT stars FROM users WHERE id = $1', [userId]);
    res.json({ stars: rows[0]?.stars ?? 0 });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (rows[0].stars < amount) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Insufficient stars' });
      return;
    }
    await client.query('UPDATE users SET stars = stars - $1 WHERE id = $2', [amount, userId]);
    await client.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [userId, -amount, reason ?? 'spend']);
    const updated = await client.query('SELECT stars FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    res.json({ stars: updated.rows[0].stars });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e instanceof Error ? e.message : 'Spend failed' });
  } finally {
    client.release();
  }
});

app.post('/ai/use', authMiddleware, async (req: AuthedRequest, res) => {
  const { feature } = req.body as { feature?: string };
  const cost = AI_FEATURE_COSTS[feature ?? ''] ?? 20;
  const userId = req.user!.userId;
  if (await userIsAdmin(userId)) {
    const { rows } = await pool.query('SELECT stars FROM users WHERE id = $1', [userId]);
    res.json({ cost: 0, stars: rows[0]?.stars ?? 0 });
    return;
  }
  const { rows } = await pool.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (rows[0].stars < cost) {
    res.status(400).json({ error: 'Insufficient stars' });
    return;
  }
  await pool.query('UPDATE users SET stars = stars - $1 WHERE id = $2', [cost, userId]);
  await pool.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [userId, -cost, 'ai_' + feature]);
  const updated = await pool.query('SELECT stars FROM users WHERE id = $1', [userId]);
  res.json({ cost, stars: updated.rows[0].stars });
});

// --- Recommendations ---

app.get('/places/:id/recommendations', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM place_recommendations WHERE place_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json(rows.map((r) => ({
    id: r.id, placeId: r.place_id, userId: r.user_id, text: r.text, rating: r.rating, createdAt: r.created_at,
  })));
});

app.post('/places/:id/recommendations', authMiddleware, async (req: AuthedRequest, res) => {
  const { text, rating } = req.body as { text?: string; rating?: number };
  if (!text || !rating) {
    res.status(400).json({ error: 'text and rating required' });
    return;
  }
  const { rows } = await pool.query(
    'INSERT INTO place_recommendations (place_id, user_id, text, rating) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.params.id, req.user!.userId, text, rating]
  );
  const r = rows[0];
  res.json({ id: r.id, placeId: r.place_id, userId: r.user_id, text: r.text, rating: r.rating, createdAt: r.created_at });
});

// --- Editor unlocks ---

app.get('/editor/unlocks', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query('SELECT asset_id FROM editor_unlocks WHERE user_id = $1', [req.user!.userId]);
  res.json(rows.map((r) => r.asset_id));
});

app.post('/editor/unlock', authMiddleware, async (req: AuthedRequest, res) => {
  const { assetId, cost } = req.body as { assetId?: string; cost?: number };
  if (!assetId || !cost) {
    res.status(400).json({ error: 'assetId and cost required' });
    return;
  }
  const userId = req.user!.userId;
  const existing = await pool.query('SELECT 1 FROM editor_unlocks WHERE user_id = $1 AND asset_id = $2', [userId, assetId]);
  if (existing.rows.length) {
    const { rows } = await pool.query('SELECT asset_id FROM editor_unlocks WHERE user_id = $1', [userId]);
    res.json(rows.map((r) => r.asset_id));
    return;
  }
  const { rows: userRows } = await pool.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (userRows[0].stars < cost) {
    res.status(400).json({ error: 'Insufficient stars' });
    return;
  }
  await pool.query('UPDATE users SET stars = stars - $1 WHERE id = $2', [cost, userId]);
  await pool.query('INSERT INTO editor_unlocks (user_id, asset_id) VALUES ($1,$2)', [userId, assetId]);
  const { rows } = await pool.query('SELECT asset_id FROM editor_unlocks WHERE user_id = $1', [userId]);
  res.json(rows.map((r) => r.asset_id));
});

const featurePassStore = new Map<string, FeaturePass[]>();

app.get('/editor/passes', authMiddleware, async (req: AuthedRequest, res) => {
  if (await userIsAdmin(req.user!.userId)) {
    res.json(buildAdminFeaturePasses());
    return;
  }
  res.json(featurePassStore.get(req.user!.userId) ?? []);
});

app.post('/editor/passes', authMiddleware, async (req: AuthedRequest, res) => {
  const { featureId, tier } = req.body as { featureId?: string; tier?: FeaturePassTier };
  if (!featureId || !tier || !FEATURE_PASS_TIERS.includes(tier)) {
    res.status(400).json({ error: 'featureId and tier required' });
    return;
  }
  const userId = req.user!.userId;
  if (await userIsAdmin(userId)) {
    const { rows } = await pool.query('SELECT stars FROM users WHERE id = $1', [userId]);
    const pass = buildFeaturePass([], featureId, tier);
    res.json({ pass, stars: rows[0]?.stars ?? 0 });
    return;
  }
  const cost = FEATURE_PASS_COSTS[tier];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (rows[0].stars < cost) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Insufficient stars' });
      return;
    }
    await client.query('UPDATE users SET stars = stars - $1 WHERE id = $2', [cost, userId]);
    await client.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [
      userId,
      -cost,
      `feature_pass:${featureId}:${tier}`,
    ]);
    await client.query('COMMIT');
    const existing = featurePassStore.get(userId) ?? [];
    const pass = buildFeaturePass(existing, featureId, tier);
    featurePassStore.set(userId, mergeFeaturePass(existing, pass));
    const updated = await pool.query('SELECT stars FROM users WHERE id = $1', [userId]);
    res.json({ pass, stars: updated.rows[0].stars });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e instanceof Error ? e.message : 'Purchase failed' });
  } finally {
    client.release();
  }
});

app.get('/shop/items', (_req, res) => res.json([]));

// --- Mailbox ---

function mapMailboxMessage(row: Record<string, unknown>): MailboxMessage {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as MailboxMessageType,
    title: String(row.title),
    body: String(row.body),
    createdAt: row.created_at as string,
    readAt: row.read_at ? String(row.read_at) : undefined,
    groupId: row.group_id ? String(row.group_id) : undefined,
    groupName: row.group_name ? String(row.group_name) : undefined,
    inviterId: row.inviter_id ? String(row.inviter_id) : undefined,
    inviterName: row.inviter_name ? String(row.inviter_name) : undefined,
    inviteStatus: row.invite_status ? (row.invite_status as GroupInviteStatus) : undefined,
  };
}

function mapGroupRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    memberIds: row.member_ids ?? [],
    createdAt: row.created_at,
    unlockedGallerySlots: row.unlocked_gallery_slots ?? 0,
    sharedGalleryUploaderId: row.shared_gallery_uploader_id ?? undefined,
  };
}

app.get('/mailbox', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM mailbox_messages WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user!.userId]
  );
  res.json(rows.map(mapMailboxMessage));
});

app.get('/mailbox/unread-count', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM mailbox_messages WHERE user_id = $1 AND read_at IS NULL',
    [req.user!.userId]
  );
  res.json({ count: rows[0]?.count ?? 0 });
});

app.post('/mailbox/:messageId/read', authMiddleware, async (req: AuthedRequest, res) => {
  await pool.query(
    'UPDATE mailbox_messages SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
    [req.params.messageId, req.user!.userId]
  );
  res.status(204).send();
});

app.post('/mailbox/read-all', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `UPDATE mailbox_messages
     SET read_at = now()
     WHERE user_id = $1
       AND read_at IS NULL
       AND NOT (type = 'group_invite' AND invite_status = 'pending')
     RETURNING id`,
    [req.user!.userId]
  );
  res.json({ count: rows.length });
});

app.delete('/mailbox/:messageId', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `DELETE FROM mailbox_messages
     WHERE id = $1 AND user_id = $2
       AND NOT (type = 'group_invite' AND invite_status = 'pending')
     RETURNING id`,
    [req.params.messageId, req.user!.userId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: '우편을 찾을 수 없거나 삭제할 수 없습니다' });
    return;
  }
  res.status(204).send();
});

app.delete('/mailbox', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `DELETE FROM mailbox_messages
     WHERE user_id = $1
       AND NOT (type = 'group_invite' AND invite_status = 'pending')
     RETURNING id`,
    [req.user!.userId]
  );
  res.json({ count: rows.length });
});

app.post('/mailbox/:messageId/invite-response', authMiddleware, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const accept = Boolean(req.body?.accept);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const msgResult = await client.query(
      `SELECT * FROM mailbox_messages
       WHERE id = $1 AND user_id = $2 AND type = 'group_invite'
       FOR UPDATE`,
      [req.params.messageId, userId]
    );
    const message = msgResult.rows[0];
    if (!message) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: '초대장을 찾을 수 없습니다' });
      return;
    }
    if (message.invite_status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: '이미 처리된 초대입니다' });
      return;
    }
    if (!message.group_id) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: '잘못된 초대장입니다' });
      return;
    }

    let group = null;
    if (accept) {
      const groupResult = await client.query('SELECT * FROM groups WHERE id = $1', [message.group_id]);
      if (!groupResult.rows[0]) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: '그룹을 찾을 수 없습니다' });
        return;
      }

      const memberCountResult = await client.query(
        'SELECT COUNT(*)::int AS count FROM group_members WHERE group_id = $1',
        [message.group_id]
      );
      const memberCount = memberCountResult.rows[0]?.count ?? 0;
      if (memberCount >= FREE_GROUP_MEMBER_COUNT) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: '그룹 구성원 슬롯이 가득 찼습니다' });
        return;
      }

      await client.query(
        `INSERT INTO group_members (group_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [message.group_id, userId]
      );

      const updatedGroup = await client.query(
        `SELECT g.*, array_agg(gm.user_id) AS member_ids
         FROM groups g
         JOIN group_members gm ON gm.group_id = g.id
         WHERE g.id = $1
         GROUP BY g.id`,
        [message.group_id]
      );
      group = mapGroupRow(updatedGroup.rows[0]);
    }

    await client.query('DELETE FROM mailbox_messages WHERE id = $1', [message.id]);

    await client.query('COMMIT');
    res.json(group);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e instanceof Error ? e.message : 'Invite response failed' });
  } finally {
    client.release();
  }
});

// --- Customer inquiries ---

function mapInquiry(row: Record<string, unknown>): CustomerInquiry {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    userEmail: row.user_email ? String(row.user_email) : undefined,
    userDisplayName: row.user_display_name ? String(row.user_display_name) : undefined,
    message: String(row.message),
    status: row.status as CustomerInquiry['status'],
    createdAt: row.created_at as string,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  };
}

app.post('/inquiries', authMiddleware, async (req: AuthedRequest, res) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message) {
    res.status(400).json({ error: '문의 내용을 입력해 주세요' });
    return;
  }
  const user = await getUserById(req.user!.userId);
  const { rows } = await pool.query(
    `INSERT INTO customer_inquiries (user_id, user_email, user_display_name, message)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user!.userId, user?.email ?? null, user?.display_name ?? null, message]
  );
  res.status(201).json(mapInquiry(rows[0]));
});

// --- Admin ---

function mapAdminUser(row: Record<string, unknown>): AdminUserSummary {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: String(row.display_name),
    stars: Number(row.stars),
    role: (row.role as AdminUserSummary['role']) ?? 'user',
    createdAt: row.created_at as string,
  };
}

app.get('/admin/users', authMiddleware, adminMiddleware, async (req: AuthedRequest, res) => {
  const q = String(req.query.q ?? '').trim();
  const { rows } = q
    ? await pool.query(
        `SELECT id, email, display_name, stars, role, created_at FROM users
         WHERE email ILIKE $1 OR display_name ILIKE $1
         ORDER BY created_at DESC LIMIT 50`,
        [`%${q}%`]
      )
    : await pool.query(
        `SELECT id, email, display_name, stars, role, created_at FROM users
         ORDER BY created_at DESC LIMIT 50`
      );
  res.json(rows.map(mapAdminUser));
});

app.patch('/admin/users/:userId/stars', authMiddleware, adminMiddleware, async (req: AuthedRequest, res) => {
  const amount = Number(req.body?.amount);
  const reason = String(req.body?.reason ?? 'admin_grant');
  if (!Number.isFinite(amount) || amount === 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [req.params.userId]);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const nextStars = Math.max(0, rows[0].stars + amount);
    await client.query('UPDATE users SET stars = $1 WHERE id = $2', [nextStars, req.params.userId]);
    await client.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [
      req.params.userId,
      amount,
      reason,
    ]);
    await client.query('COMMIT');
    res.json({ stars: nextStars });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e instanceof Error ? e.message : 'Grant failed' });
  } finally {
    client.release();
  }
});

app.get('/admin/inquiries', authMiddleware, adminMiddleware, async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM customer_inquiries ORDER BY created_at DESC LIMIT 100'
  );
  res.json(rows.map(mapInquiry));
});

app.patch('/admin/inquiries/:inquiryId', authMiddleware, adminMiddleware, async (req, res) => {
  const status = req.body?.status === 'resolved' ? 'resolved' : 'open';
  const { rows } = await pool.query(
    `UPDATE customer_inquiries
     SET status = $1, resolved_at = CASE WHEN $1 = 'resolved' THEN now() ELSE NULL END
     WHERE id = $2 RETURNING *`,
    [status, req.params.inquiryId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Inquiry not found' });
    return;
  }
  res.json(mapInquiry(rows[0]));
});

app.post('/admin/mailbox/send', authMiddleware, adminMiddleware, async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim();
  const title = String(req.body?.title ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  const type = (req.body?.type as MailboxMessageType) ?? 'notice';
  if (!userId || !title || !body) {
    res.status(400).json({ error: 'userId, title, body required' });
    return;
  }
  const { rows } = await pool.query(
    `INSERT INTO mailbox_messages (user_id, type, title, body)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, type, title, body]
  );
  res.status(201).json(mapMailboxMessage(rows[0]));
});

app.post('/admin/mailbox/broadcast', authMiddleware, adminMiddleware, async (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  const type = (req.body?.type as MailboxMessageType) ?? 'notice';
  if (!title || !body) {
    res.status(400).json({ error: 'title, body required' });
    return;
  }
  const userIds = Array.isArray(req.body?.userIds)
    ? (req.body.userIds as string[]).filter(Boolean)
    : null;
  const { rows: users } = userIds?.length
    ? await pool.query('SELECT id FROM users WHERE id = ANY($1::uuid[])', [userIds])
    : await pool.query('SELECT id FROM users');
  for (const user of users) {
    await pool.query(
      `INSERT INTO mailbox_messages (user_id, type, title, body) VALUES ($1, $2, $3, $4)`,
      [user.id, type, title, body]
    );
  }
  res.json({ sent: users.length });
});

function mapPlace(row: Record<string, unknown>): Place {
  return {
    id: String(row.id),
    regionCode: String(row.region_code),
    name: String(row.name),
    description: String(row.description ?? ''),
    lat: Number(row.lat),
    lng: Number(row.lng),
    category: String(row.category ?? ''),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
  };
}

function mapVisit(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    placeId: row.place_id,
    groupId: row.group_id,
    photoUri: row.photo_uri ?? '',
    editedPhotoUri: row.edited_photo_uri,
    note: row.note,
    visitedAt: row.visited_at,
    lat: row.lat,
    lng: row.lng,
    filter: row.filter,
    isPublic: row.is_public ?? false,
    isSharedGallery: row.is_shared_gallery ?? false,
  };
}

function mapChatMessage(row: Record<string, unknown>): GroupChatMessage {
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    userId: row.user_id as string,
    displayName: (row.display_name as string) ?? '',
    text: row.text as string,
    createdAt: row.created_at as string,
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

async function getGroupVisitedRegionCodes(groupId: string): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT DISTINCT p.region_code FROM visits v
     JOIN places p ON p.id = v.place_id
     WHERE v.group_id = $1`,
    [groupId]
  );
  return new Set(rows.map((r) => r.region_code as string));
}

function buildGroupStationQuests(visitedRegionCodes: Set<string>, completedIds: Set<string>): Quest[] {
  return REGIONS.map((region) => {
    const station = REGION_MAIN_STATIONS.find((s) => s.regionCode === region.code)!;
    const questId = buildGroupStationQuestId(region.code);
    return {
      id: questId,
      placeId: station.placeId,
      title: `${region.name} 갤러리 오픈`,
      description: `${region.name} 지역 내에서 GPS 인증을 완료하면 갤러리가 열립니다.`,
      rewardStars: 0,
      rewardType: 'gallery_slots' as const,
      rewardGallerySlots: GROUP_STATION_QUEST_GALLERY_REWARD,
      targetLat: station.lat,
      targetLng: station.lng,
      radiusMeters: GROUP_STATION_QUEST_RADIUS_METERS,
      isStationQuest: true,
      regionCode: region.code,
      completed: completedIds.has(questId),
    };
  }).sort((a, b) => {
    const aVisited = visitedRegionCodes.has(a.regionCode!);
    const bVisited = visitedRegionCodes.has(b.regionCode!);
    if (aVisited !== bVisited) return aVisited ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.regionCode ?? '').localeCompare(b.regionCode ?? '');
  });
}

async function getGroupRegionReviewCounts(groupId: string) {
  const { rows } = await pool.query(
    `SELECT p.region_code,
            COUNT(*) FILTER (
              WHERE COALESCE(v.photo_uri, v.edited_photo_uri) IS NOT NULL
                AND COALESCE(NULLIF(TRIM(v.note), ''), '') <> ''
            )::int AS photo_reviews,
            COUNT(*) FILTER (
              WHERE v.is_public = true
                AND COALESCE(v.photo_uri, v.edited_photo_uri) IS NOT NULL
                AND COALESCE(NULLIF(TRIM(v.note), ''), '') <> ''
            )::int AS public_reviews
     FROM visits v
     JOIN places p ON p.id = v.place_id
     WHERE v.group_id = $1
     GROUP BY p.region_code`,
    [groupId],
  );
  const counts = new Map<string, { photoReviews: number; publicReviews: number }>();
  for (const row of rows) {
    counts.set(String(row.region_code), {
      photoReviews: Number(row.photo_reviews ?? 0),
      publicReviews: Number(row.public_reviews ?? 0),
    });
  }
  return counts;
}

function buildGroupActivityQuests(
  counts: Map<string, { photoReviews: number; publicReviews: number }>,
  completedIds: Set<string>,
): ActivityQuest[] {
  return REGIONS.flatMap((region) => {
    const station = REGION_MAIN_STATIONS.find((s) => s.regionCode === region.code);
    if (!station) return [];
    const regionCounts = counts.get(region.code) ?? { photoReviews: 0, publicReviews: 0 };
    const photoQuestId = buildRegionActivityQuestId(region.code, 'photo_reviews');
    const publicQuestId = buildRegionActivityQuestId(region.code, 'public_review');
    return [
      {
        id: photoQuestId,
        placeId: station.placeId,
        title: `${region.name} 사진 후기 3개`,
        description: `${region.name} 여행 사진과 후기를 3개 남기세요.`,
        rewardStars: REGION_PHOTO_REVIEW_QUEST_REWARD,
        targetLat: station.lat,
        targetLng: station.lng,
        radiusMeters: 0,
        regionCode: region.code,
        questKind: 'photo_reviews' as const,
        targetCount: REGION_PHOTO_REVIEW_QUEST_TARGET,
        progressCount: Math.min(regionCounts.photoReviews, REGION_PHOTO_REVIEW_QUEST_TARGET),
        completed: completedIds.has(photoQuestId),
      },
      {
        id: publicQuestId,
        placeId: station.placeId,
        title: `${region.name} 공개 후기`,
        description: `${region.name} 여행 후기를 공개로 1개 올리세요.`,
        rewardStars: REGION_PUBLIC_REVIEW_QUEST_REWARD,
        targetLat: station.lat,
        targetLng: station.lng,
        radiusMeters: 0,
        regionCode: region.code,
        questKind: 'public_review' as const,
        targetCount: REGION_PUBLIC_REVIEW_QUEST_TARGET,
        progressCount: Math.min(regionCounts.publicReviews, REGION_PUBLIC_REVIEW_QUEST_TARGET),
        completed: completedIds.has(publicQuestId),
      },
    ];
  });
}

async function awardCompletedActivityQuests(groupId: string, userId: string) {
  const counts = await getGroupRegionReviewCounts(groupId);
  const completedResult = await pool.query(
    'SELECT quest_id FROM group_quest_completions WHERE group_id = $1',
    [groupId],
  );
  const completedIds = new Set(completedResult.rows.map((r) => r.quest_id as string));
  const quests = buildGroupActivityQuests(counts, completedIds);
  const newlyCompleted = quests.filter(
    (quest) => !quest.completed && (quest.progressCount ?? 0) >= (quest.targetCount ?? 1),
  );
  if (newlyCompleted.length === 0) return;

  const totalReward = newlyCompleted.reduce((sum, quest) => sum + quest.rewardStars, 0);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const quest of newlyCompleted) {
      await client.query(
        `INSERT INTO group_quest_completions (group_id, quest_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [groupId, quest.id],
      );
    }
    await client.query('UPDATE users SET stars = stars + $1 WHERE id = $2', [totalReward, userId]);
    await client.query('INSERT INTO star_transactions (user_id, amount, reason) VALUES ($1,$2,$3)', [
      userId,
      totalReward,
      `group_activity_quests:${groupId}`,
    ]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  await migrate();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TingTing API listening on :${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
