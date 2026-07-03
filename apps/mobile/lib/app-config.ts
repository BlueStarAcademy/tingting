/** Android APK direct download URL (EAS Build artifact or hosted file) */
export const APK_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL?.replace(/\/$/, '') ?? '';

export const SITE_URL =
  process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';

export function getApkQrImageUrl(data: string, size = 128): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=8`;
}

export function openApkDownload(): boolean {
  if (!APK_DOWNLOAD_URL) return false;
  if (typeof window !== 'undefined') {
    window.open(APK_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}
