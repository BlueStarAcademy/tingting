/**
 * RevenueCat placeholder — wire up react-native-purchases in production.
 * Client displays offerings only; receipt validation is server-side.
 */

export type SubscriptionPlanId = 'premium_30d' | 'premium_plus_30d';

export interface PlusPlan {
  id: SubscriptionPlanId;
  name: string;
  priceLabel: string;
  period: string;
  perks: string[];
  revenueCatProductId: string;
}

export interface StarPack {
  id: string;
  stars: number;
  priceLabel: string;
  bonus?: string;
  revenueCatProductId: string;
}

/** Replace with platform-specific key from RevenueCat dashboard */
export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

export const PLUS_PLANS: PlusPlan[] = [
  {
    id: 'premium_30d',
    name: 'TingTing Premium',
    priceLabel: '₩9,900',
    period: '/30일',
    perks: ['30일 동안 매일 스타 25', '사진편집 스티커 무제한 사용'],
    revenueCatProductId: 'tingting_premium_30d',
  },
  {
    id: 'premium_plus_30d',
    name: 'TingTing Premium+',
    priceLabel: '₩19,900',
    period: '/30일',
    perks: ['30일 동안 매일 스타 50', '모든 사진편집 기능 무제한 사용'],
    revenueCatProductId: 'tingting_premium_plus_30d',
  },
];

export const STAR_IAP_CATALOG: StarPack[] = [
  { id: 'stars_s', stars: 100, priceLabel: '₩1,900', revenueCatProductId: 'stars_s' },
  { id: 'stars_m', stars: 200, priceLabel: '₩3,900', bonus: '+50', revenueCatProductId: 'stars_m' },
  { id: 'stars_l', stars: 500, priceLabel: '₩8,900', bonus: '+150', revenueCatProductId: 'stars_l' },
  { id: 'stars_xl', stars: 1000, priceLabel: '₩17,900', bonus: '+500', revenueCatProductId: 'stars_xl' },
];

export interface MonetizationOfferings {
  plusPlans: PlusPlan[];
  starPacks: StarPack[];
  isConfigured: boolean;
}

let initialized = false;

/** Stub — call Purchases.configure({ apiKey }) when SDK is added */
export async function initRevenueCat(_userId?: string): Promise<void> {
  if (!REVENUECAT_API_KEY) return;
  initialized = true;
}

export async function getOfferings(): Promise<MonetizationOfferings> {
  return {
    plusPlans: PLUS_PLANS,
    starPacks: STAR_IAP_CATALOG,
    isConfigured: initialized && Boolean(REVENUECAT_API_KEY),
  };
}

export async function purchasePlus(_planId: SubscriptionPlanId): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '출시 예정 — RevenueCat 연동 예정' };
}

export async function purchaseStarPack(_packId: string): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '출시 예정 — 스타 IAP 출시 예정' };
}

export async function restorePurchases(): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '출시 예정' };
}

export function hasPlusEntitlement(_entitlements?: Record<string, unknown>): boolean {
  return false;
}
