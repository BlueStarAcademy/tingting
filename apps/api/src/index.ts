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
  INITIAL_STARS,
  QUEST_REWARD_DEFAULT,
  REGIONS,
  SHOP_ITEMS,
  FREE_GROUP_MEMBER_COUNT,
  getGroupMemberInviteCost,
} from '@tingting/shared';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET ?? 'tingting-dev-secret-change-me';
const DATABASE_URL = process.env.DATABASE_URL;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

interface AuthPayload {
  userId: string;
  email: string;
}

interface AuthedRequest extends Request {
  user?: AuthPayload;
}

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'tingting-api' }));

function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function signToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
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
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    stars: row.stars,
    onboardingComplete: row.onboarding_complete,
    visitedRegions: row.visited_regions ?? [],
    isDemo: row.is_demo ?? false,
  };
}

async function getUserById(id: string) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function migrate() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '001_railway.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);

  const placesPath = path.join(__dirname, '..', '..', '..', 'seed', 'places.json');
  if (fs.existsSync(placesPath)) {
    const places = JSON.parse(fs.readFileSync(placesPath, 'utf8')) as Array<Record<string, unknown>>;
    for (const p of places) {
      await pool.query(
        `INSERT INTO places (id, region_code, name, description, lat, lng, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.regionCode, p.name, p.description ?? '', p.lat, p.lng, p.category ?? '']
      );
    }
    console.log(`Seeded ${places.length} places`);
  }
}

// --- Auth ---

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body as { email?: string; password?: string; displayName?: string };
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'email, password, displayName required' });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, stars) VALUES ($1,$2,$3,$4) RETURNING *`,
      [email.toLowerCase(), hash, displayName, INITIAL_STARS]
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
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
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

app.get('/auth/me', authMiddleware, async (req: AuthedRequest, res) => {
  const user = await getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ profile: mapUser(user) });
});

app.post('/auth/onboarding', authMiddleware, async (req: AuthedRequest, res) => {
  const { displayName } = req.body as { displayName?: string };
  if (!displayName) {
    res.status(400).json({ error: 'displayName required' });
    return;
  }
  const { rows } = await pool.query(
    'UPDATE users SET display_name = $1, onboarding_complete = true WHERE id = $2 RETURNING *',
    [displayName, req.user!.userId]
  );
  res.json({ profile: mapUser(rows[0]) });
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
    groups: groupsResult.rows.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      ownerId: g.owner_id,
      memberIds: g.member_ids ?? [],
      createdAt: g.created_at,
    })),
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
  res.json(rows.map((g) => ({
    id: g.id, name: g.name, description: g.description, ownerId: g.owner_id,
    memberIds: g.member_ids ?? [], createdAt: g.created_at,
  })));
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
    const countResult = await client.query('SELECT COUNT(*)::int AS c FROM groups WHERE owner_id = $1', [userId]);
    const cost = countResult.rows[0].c >= 1 ? ADDITIONAL_GROUP_COST : 0;
    const userResult = await client.query('SELECT stars FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const stars = userResult.rows[0].stars;
    if (stars < cost) {
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
      group: { id: group.id, name: group.name, description: group.description, ownerId: group.owner_id, memberIds: [userId], createdAt: group.created_at },
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
  res.json({ id: g.id, name: g.name, description: g.description, ownerId: g.owner_id, memberIds: g.member_ids ?? [], createdAt: g.created_at });
});

// --- Places ---

app.get('/places', async (req, res) => {
  const region = req.query.region as string | undefined;
  const { rows } = region
    ? await pool.query('SELECT * FROM places WHERE region_code = $1 ORDER BY name', [region])
    : await pool.query('SELECT * FROM places ORDER BY region_code, name');
  res.json(rows.map(mapPlace));
});

app.get('/places/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM places WHERE id = $1', [req.params.id]);
  if (!rows[0]) {
    res.status(404).json({ error: 'Place not found' });
    return;
  }
  res.json(mapPlace(rows[0]));
});

// --- Visits ---

app.get('/visits', authMiddleware, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query('SELECT * FROM visits WHERE user_id = $1 ORDER BY visited_at DESC', [req.user!.userId]);
  res.json(rows.map(mapVisit));
});

app.post('/visits', authMiddleware, async (req: AuthedRequest, res) => {
  const { placeId, photoUri, groupId, note, lat, lng } = req.body as Record<string, unknown>;
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
  const visitResult = await pool.query(
    `INSERT INTO visits (user_id, place_id, group_id, photo_uri, note, lat, lng)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, placeId, groupId ?? null, photoUri, note ?? null, lat ?? null, lng ?? null]
  );
  await pool.query(
    `UPDATE users SET visited_regions = (
       SELECT array_agg(DISTINCT x) FROM unnest(COALESCE(visited_regions, '{}') || $1::text) AS x
     ) WHERE id = $2`,
    [[place.region_code], userId]
  );
  res.json(mapVisit(visitResult.rows[0]));
});

app.patch('/visits/:id', authMiddleware, async (req: AuthedRequest, res) => {
  const { editedPhotoUri, filter, note, photoUri } = req.body as Record<string, unknown>;
  const userId = req.user!.userId;
  const visitId = req.params.id;

  if (photoUri) {
    const { rows } = await pool.query(
      `UPDATE visits SET photo_uri = $1, edited_photo_uri = NULL, filter = NULL, note = COALESCE($2, note)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [photoUri, note ?? null, visitId, userId]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }
    res.json(mapVisit(rows[0]));
    return;
  }

  const { rows } = await pool.query(
    `UPDATE visits SET edited_photo_uri = COALESCE($1, edited_photo_uri), filter = COALESCE($2, filter), note = COALESCE($3, note)
     WHERE id = $4 AND user_id = $5 RETURNING *`,
    [editedPhotoUri ?? null, filter ?? null, note ?? null, visitId, userId]
  );
  if (!rows[0]) {
    res.status(404).json({ error: 'Visit not found' });
    return;
  }
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
  const item = SHOP_ITEMS.find((s) => s.id.includes(feature ?? '') || s.name.includes(feature ?? ''));
  const cost = item?.cost ?? 20;
  const userId = req.user!.userId;
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

app.get('/shop/items', (_req, res) => res.json(SHOP_ITEMS));

function mapPlace(row: Record<string, unknown>) {
  return {
    id: row.id,
    regionCode: row.region_code,
    name: row.name,
    description: row.description ?? '',
    lat: row.lat,
    lng: row.lng,
    category: row.category ?? '',
    imageUrl: row.image_url,
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
  };
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
