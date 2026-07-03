import { EDITOR_FEATURES } from './editor-features';
import type { FeaturePass, UserProfile } from './types';

export const ADMIN_EMAIL = 'tingadmin@tingting.app';
export const ADMIN_DISPLAY_NAME = 'tingadmin';
export const ADMIN_SEED_PASSWORD = '230123';

export function normalizeAdminLoginEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (trimmed === 'tingadmin') return ADMIN_EMAIL;
  return trimmed;
}

export function isAdminProfile(profile: Pick<UserProfile, 'role' | 'isAdmin' | 'email'> | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === 'admin' || profile.isAdmin) return true;
  return profile.email?.toLowerCase() === ADMIN_EMAIL;
}

export function buildAdminFeaturePasses(): FeaturePass[] {
  const purchasedAt = new Date().toISOString();
  return EDITOR_FEATURES.filter((feature) => !feature.free).map((feature) => ({
    featureId: feature.id,
    tier: 'permanent',
    purchasedAt,
    expiresAt: null,
  }));
}
