import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET ?? 'photos';
const MAX_BYTES = 12 * 1024 * 1024;

const uploadsDir = path.join(__dirname, '..', 'uploads');

export type MediaUploadInput = {
  base64: string;
  contentType?: string;
  filename?: string;
  userId: string;
};

export type MediaUploadResult = {
  url: string;
  path: string;
  contentType: string;
  bytes: number;
};

function ensureUploadsDir(): void {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function stripDataUrl(base64: string): { contentType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(base64);
  if (match) {
    return { contentType: match[1], data: match[2] };
  }
  return { contentType: 'image/jpeg', data: base64 };
}

function safeExt(contentType: string, filename?: string): string {
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') return ext;
  }
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  return '.jpg';
}

async function uploadToSupabase(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Storage upload failed: ${response.status} ${text}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

export async function persistMediaUpload(
  input: MediaUploadInput,
  publicBaseUrl: string,
): Promise<MediaUploadResult> {
  const parsed = stripDataUrl(input.base64.trim());
  const contentType = input.contentType || parsed.contentType || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    throw new Error('Only image uploads are allowed');
  }

  const buffer = Buffer.from(parsed.data, 'base64');
  if (!buffer.length) throw new Error('Empty image payload');
  if (buffer.length > MAX_BYTES) throw new Error('Image too large (max 12MB)');

  const ext = safeExt(contentType, input.filename);
  const objectPath = `${input.userId}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  const remoteUrl = await uploadToSupabase(objectPath, buffer, contentType);
  if (remoteUrl) {
    return { url: remoteUrl, path: objectPath, contentType, bytes: buffer.length };
  }

  ensureUploadsDir();
  const localName = objectPath.replace(/\//g, '__');
  const localPath = path.join(uploadsDir, localName);
  fs.writeFileSync(localPath, buffer);
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    url: `${base}/media/files/${encodeURIComponent(localName)}`,
    path: objectPath,
    contentType,
    bytes: buffer.length,
  };
}

export function getUploadsDir(): string {
  ensureUploadsDir();
  return uploadsDir;
}
