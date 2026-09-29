import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { config } from './config';

export interface AuthedRequest extends Request {
  user?: { userId: string; email: string };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Handler = (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>;

export function handle(fn: Handler): RequestHandler {
  return (req, res, next) => {
    fn(req as AuthedRequest, res, next).catch(next);
  };
}

export function userId(req: AuthedRequest): string {
  if (!req.user) throw new HttpError(401, '로그인이 필요해요');
  return req.user.userId;
}

export function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function optionalDate(value: unknown): string | null {
  const s = optionalString(value);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `날짜 형식이 올바르지 않아요: ${s}`);
  return s;
}

const MEDIA_PATH = '/media/files/';

/** Store photos as `/media/files/...` so they keep working if the API domain changes. */
export function toStoredUri(uri: string): string {
  const idx = uri.indexOf(MEDIA_PATH);
  if (idx > 0 && /^https?:\/\//i.test(uri)) return uri.slice(idx);
  return uri;
}

export function publicBaseUrl(req: Request): string {
  return config.publicApiUrl || `${req.protocol}://${req.get('host')}`;
}

export function toPublicUri(stored: string | null | undefined, base: string): string | undefined {
  if (!stored) return undefined;
  return stored.startsWith(MEDIA_PATH) ? `${base}${stored}` : stored;
}
