import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config';

const MEDIA_PATH = '/media/files/';

function ensureUploadsDir(): void {
  if (!fs.existsSync(config.uploadsDir)) {
    fs.mkdirSync(config.uploadsDir, { recursive: true });
  }
}

function stripDataUrl(base64: string): { contentType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(base64);
  if (match) return { contentType: match[1], data: match[2] };
  return { contentType: 'image/jpeg', data: base64 };
}

function safeExt(contentType: string, filename?: string): string {
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  }
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  return '.jpg';
}

/** Write an uploaded image to the uploads volume and return its `/media/files/...` path. */
export function persistMediaUpload(input: { base64: string; contentType?: string; filename?: string }): string {
  const parsed = stripDataUrl(input.base64.trim());
  const contentType = input.contentType || parsed.contentType || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error('이미지만 업로드할 수 있어요');

  const buffer = Buffer.from(parsed.data, 'base64');
  if (!buffer.length) throw new Error('빈 이미지예요');
  if (buffer.length > config.maxUploadBytes) throw new Error('이미지가 너무 커요 (최대 25MB)');

  ensureUploadsDir();
  const name = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${safeExt(contentType, input.filename)}`;
  fs.writeFileSync(path.join(config.uploadsDir, name), buffer);
  return `${MEDIA_PATH}${name}`;
}

/** Remove a stored upload; ignores external URLs and missing files. */
export function deleteMediaFile(storedUri: string | null | undefined): void {
  if (!storedUri?.startsWith(MEDIA_PATH)) return;
  const name = path.basename(storedUri);
  fs.promises.unlink(path.join(config.uploadsDir, name)).catch(() => undefined);
}

export function getUploadsDir(): string {
  ensureUploadsDir();
  return config.uploadsDir;
}
