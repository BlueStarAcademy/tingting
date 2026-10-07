import { Router } from 'express';
import { handle, HttpError, userId } from '../http';

export const clientLogsRouter = Router();

const MAX_BODY_BYTES = 64 * 1024;
const MAX_ENTRIES = 50;
const MAX_TEXT = 2000;
const LEVELS = new Set(['error', 'warn', 'info']);

/** Strips anything that looks like a credential before it reaches the log stream. */
function redact(text: string): string {
  return text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]')
    .replace(/(bearer\s+)\S+/gi, '$1[token]')
    .replace(/([?&](?:token|key|apikey|api_key|access_token|password)=)[^&\s"]+/gi, '$1[redacted]');
}

function clean(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return redact(value.slice(0, MAX_TEXT));
  if (depth >= 3) return '[…]';
  if (Array.isArray(value)) return value.slice(0, 30).map((v) => clean(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      if (/token|password|authorization|secret/i.test(k)) continue;
      out[k.slice(0, 40)] = clean(v, depth + 1);
    }
    return out;
  }
  return undefined;
}

/**
 * Batched diagnostics from the app (errors, freezes, breadcrumbs). Only written to stdout with a
 * `[client]` prefix so `railway logs -s tingting-api | grep "\[client\]"` shows them; nothing is stored.
 */
clientLogsRouter.post(
  '/',
  handle(async (req, res) => {
    const size = Number(req.get('content-length') ?? 0);
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'too large');
    const body = (req.body ?? {}) as { device?: unknown; session?: unknown; entries?: unknown };
    if (!Array.isArray(body.entries)) throw new HttpError(400, 'entries required');
    const user = userId(req).slice(0, 8);
    const device = clean(body.device);
    const session = typeof body.session === 'string' ? body.session.slice(0, 40) : undefined;
    const entries = body.entries.slice(0, MAX_ENTRIES);
    for (const raw of entries) {
      if (!raw || typeof raw !== 'object') continue;
      const entry = raw as Record<string, unknown>;
      const level = LEVELS.has(String(entry.level)) ? String(entry.level) : 'info';
      const line = {
        user,
        session,
        level,
        event: clean(String(entry.event ?? 'unknown').slice(0, 80)),
        at: typeof entry.at === 'string' ? entry.at.slice(0, 30) : undefined,
        data: clean(entry.data),
        device,
      };
      console.log(`[client] ${JSON.stringify(line)}`);
    }
    if (body.entries.length > MAX_ENTRIES) {
      console.log(`[client] ${JSON.stringify({ user, session, level: 'warn', event: 'dropped', data: { count: body.entries.length - MAX_ENTRIES } })}`);
    }
    res.status(204).end();
  }),
);
