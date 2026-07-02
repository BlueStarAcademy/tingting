import { FEATURE_PASS_COSTS, FEATURE_PASS_DAYS } from './constants';
import type { EditorFeature, FeaturePass, FeaturePassTier } from './types';

export function getFeaturePassCost(tier: FeaturePassTier): number {
  return FEATURE_PASS_COSTS[tier];
}

export function isFeaturePassActive(
  passes: FeaturePass[],
  featureId: string,
  now = Date.now(),
): boolean {
  return passes.some(
    (pass) =>
      pass.featureId === featureId &&
      (pass.expiresAt === null || new Date(pass.expiresAt).getTime() > now),
  );
}

export function getActiveFeaturePass(
  passes: FeaturePass[],
  featureId: string,
  now = Date.now(),
): FeaturePass | undefined {
  return passes
    .filter(
      (pass) =>
        pass.featureId === featureId &&
        (pass.expiresAt === null || new Date(pass.expiresAt).getTime() > now),
    )
    .sort((a, b) => {
      if (a.expiresAt === null) return -1;
      if (b.expiresAt === null) return 1;
      return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
    })[0];
}

export function isEditorFeatureUnlocked(
  feature: EditorFeature,
  passes: FeaturePass[],
  now = Date.now(),
): boolean {
  if (feature.free) return true;
  return isFeaturePassActive(passes, feature.id, now);
}

/** 새 이용권 생성 (기존 만료일 연장 또는 영구 전환) */
export function buildFeaturePass(
  existing: FeaturePass[],
  featureId: string,
  tier: FeaturePassTier,
  purchasedAt = new Date(),
): FeaturePass {
  const days = FEATURE_PASS_DAYS[tier];
  if (days === null) {
    return {
      featureId,
      tier,
      purchasedAt: purchasedAt.toISOString(),
      expiresAt: null,
    };
  }

  const active = getActiveFeaturePass(existing, featureId, purchasedAt.getTime());
  const base =
    active?.expiresAt && new Date(active.expiresAt) > purchasedAt
      ? new Date(active.expiresAt)
      : new Date(purchasedAt);
  base.setDate(base.getDate() + days);

  return {
    featureId,
    tier,
    purchasedAt: purchasedAt.toISOString(),
    expiresAt: base.toISOString(),
  };
}

export function mergeFeaturePass(existing: FeaturePass[], next: FeaturePass): FeaturePass[] {
  const without = existing.filter((pass) => pass.featureId !== next.featureId);
  return [...without, next];
}

export function formatPassExpiry(
  pass: FeaturePass | undefined,
  locale: 'ko' | 'en',
  now = Date.now(),
): string | null {
  if (!pass) return null;
  if (pass.expiresAt === null) {
    return locale === 'ko' ? '영구' : 'Permanent';
  }
  const ms = new Date(pass.expiresAt).getTime() - now;
  if (ms <= 0) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (locale === 'ko') return `${days}일 남음`;
  return `${days}d left`;
}
