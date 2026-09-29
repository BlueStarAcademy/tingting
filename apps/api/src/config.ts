import path from 'path';

const DEV_JWT_SECRET = 'tingting-dev-secret-change-me';

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
  coupleUsers: [1, 2]
    .map((n) => ({
      email: (process.env[`COUPLE_USER${n}_EMAIL`] ?? '').trim().toLowerCase(),
      password: process.env[`COUPLE_USER${n}_PASSWORD`] ?? '',
      displayName: (process.env[`COUPLE_USER${n}_NAME`] ?? '').trim() || `사용자${n}`,
    }))
    .filter((u) => u.email && u.password),
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
}
