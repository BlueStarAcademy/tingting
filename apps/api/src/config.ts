import path from 'path';

const DEV_JWT_SECRET = 'tingting-dev-secret-change-me';

/** data.go.kr shows an already URL-encoded key next to the raw one; store the raw one. */
function decodeServiceKey(value: string): string {
  const key = value.trim();
  if (!key.includes('%')) return key;
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  publicApiUrl: (process.env.PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  /** Mount a Railway Volume here so photos survive redeploys. */
  uploadsDir: process.env.UPLOADS_DIR ?? path.join(__dirname, '..', 'uploads'),
  maxUploadBytes: 25 * 1024 * 1024,
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY ?? '',
  /** data.go.kr TourAPI (KorService2) key; either the Encoding or Decoding form works. */
  tourApiKey: decodeServiceKey(process.env.TOUR_API_KEY ?? ''),
  /** Keyless OpenStreetMap fallback for recommendations when no other provider can answer. */
  overpassUrl: process.env.OVERPASS_URL?.trim() || 'https://overpass-api.de/api/interpreter',
  /** Shared with the app as EXPO_PUBLIC_APP_KEY; empty disables the check. */
  appKey: (process.env.APP_KEY ?? '').trim(),
  /** MYBOX personal access token; uploads are copied to MYBOX when set. */
  myboxToken: (process.env.MYBOX_TOKEN ?? '').trim(),
  myboxFolderName: process.env.MYBOX_FOLDER_NAME?.trim() || 'TingTing 사진 백업',
  /** YYYY-MM-DD; MYBOX has no API for this, so it is entered by hand to show in the app. */
  myboxTokenExpires: /^\d{4}-\d{2}-\d{2}$/.test(process.env.MYBOX_TOKEN_EXPIRES?.trim() ?? '')
    ? process.env.MYBOX_TOKEN_EXPIRES!.trim()
    : '',
  coupleNames: [process.env.COUPLE_USER1_NAME?.trim() || '나', process.env.COUPLE_USER2_NAME?.trim() || '너'],
  /** Hashed into any user whose password is still empty; changed later in the app. */
  coupleInitialPassword: process.env.COUPLE_INITIAL_PASSWORD?.trim() ?? '',
};

export function assertConfig(): void {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  if (config.isProduction && config.jwtSecret === DEV_JWT_SECRET) {
    console.error('JWT_SECRET must be set in production');
    process.exit(1);
  }
  if (!config.appKey) {
    console.warn('[auth] APP_KEY not set; anyone who knows the API URL can enter');
  }
  if (!config.coupleInitialPassword) {
    console.warn('[auth] COUPLE_INITIAL_PASSWORD not set; users without a password cannot enter');
  }
}
