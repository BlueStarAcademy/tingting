import { loadPublicConfig } from './public-config';

/** Build-time fallback; on web prefer `usePublicConfig()` or `loadPublicConfig()`. */
export const APK_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL?.replace(/\/$/, '') ?? '';

export const SITE_URL =
  process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';

export function getDownloadQrImageUrl(data: string, size = 128): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=8`;
}

/** @deprecated Use getDownloadQrImageUrl */
export const getApkQrImageUrl = getDownloadQrImageUrl;

export function openDownloadUrl(url: string): boolean {
  if (!url) return false;
  if (typeof window !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tingting.apk';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
  return false;
}

/** @deprecated Use openDownloadUrl */
export function openApkDownload(url = APK_DOWNLOAD_URL): boolean {
  return openDownloadUrl(url);
}

export { loadPublicConfig, usePublicConfig } from './public-config';
