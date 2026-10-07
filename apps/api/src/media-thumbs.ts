import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { config } from './config';
import { getUploadsDir } from './media-upload';

/** Short-edge sizes the app asks for; anything else snaps up to the next one. */
const SIZES = [160, 320, 480, 720, 1080, 1440];
const NAME_RE = /^[\w.-]+\.(jpe?g|png|webp)$/i;
const MAX_JOBS = 2;
const CACHE_HEADER = 'public, max-age=2592000, immutable';

type SharpChain = {
  rotate(): SharpChain;
  resize(options: { width: number; height: number; fit: 'outside'; withoutEnlargement: boolean }): SharpChain;
  jpeg(options: { quality: number; progressive?: boolean }): SharpChain;
  toFile(file: string): Promise<unknown>;
};
type SharpFactory = ((input: string, options?: { failOn?: string; limitInputPixels?: number }) => SharpChain) & {
  cache(options: boolean): unknown;
  concurrency(n: number): number;
};

let sharpModule: SharpFactory | null | undefined;

/** sharp is optional at runtime: without it thumbnails fall back to the original file. */
function loadSharp(): SharpFactory | null {
  if (sharpModule !== undefined) return sharpModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('sharp') as SharpFactory;
    mod.cache(false);
    mod.concurrency(1);
    sharpModule = mod;
  } catch (e) {
    console.warn('[thumbs] sharp unavailable, serving originals:', e instanceof Error ? e.message : e);
    sharpModule = null;
  }
  return sharpModule;
}

const thumbsDir = config.thumbsDir || path.join(os.tmpdir(), 'tingting-thumbs');
const inflight = new Map<string, Promise<string | null>>();
let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_JOBS) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await fn();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

function snapSize(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return SIZES[1];
  return SIZES.find((s) => s >= n) ?? SIZES[SIZES.length - 1];
}

async function buildThumb(source: string, target: string, size: number): Promise<string | null> {
  const sharp = loadSharp();
  if (!sharp) return null;
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    await withSlot(() =>
      sharp(source, { failOn: 'none', limitInputPixels: 80_000_000 })
        .rotate()
        .resize({ width: size, height: size, fit: 'outside', withoutEnlargement: true })
        .jpeg({ quality: 78, progressive: true })
        .toFile(tmp),
    );
    await fs.promises.rename(tmp, target);
    return target;
  } catch (e) {
    fs.promises.unlink(tmp).catch(() => undefined);
    console.warn('[thumbs] failed', path.basename(source), e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * GET /media/thumb/:name?s=320 — a JPEG whose short edge is at least `s` px, cached on disk.
 * Public like /media/files, since it is the same picture at a smaller size.
 */
export async function serveThumb(req: Request, res: Response): Promise<void> {
  const name = String(req.params.name ?? '');
  if (!NAME_RE.test(name)) {
    res.status(400).json({ error: 'bad name' });
    return;
  }
  const source = path.join(getUploadsDir(), name);
  if (!fs.existsSync(source)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const size = snapSize(req.query.s ?? req.query.w);
  const target = path.join(thumbsDir, String(size), `${name}.jpg`);

  let file: string | null = fs.existsSync(target) ? target : null;
  if (!file) {
    const key = `${size}/${name}`;
    let job = inflight.get(key);
    if (!job) {
      job = buildThumb(source, target, size).finally(() => inflight.delete(key));
      inflight.set(key, job);
    }
    file = await job;
  }
  if (!file) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.sendFile(source);
    return;
  }
  res.setHeader('Cache-Control', CACHE_HEADER);
  res.type('jpg').sendFile(file);
}
