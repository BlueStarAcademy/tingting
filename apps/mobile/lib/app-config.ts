export const SITE_URL =
  process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';

export { loadPublicConfig, usePublicConfig } from './public-config';
