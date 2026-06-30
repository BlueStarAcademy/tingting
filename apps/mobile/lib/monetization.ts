/**
 * RevenueCat placeholder — wire up react-native-purchases in production.
 * Client displays offerings only; receipt validation is server-side.
 */

export type SubscriptionPlanId = 'plus_monthly' | 'plus_yearly' | 'couple_monthly';

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
    id: 'plus_monthly',
    name: 'TingTing Plus',
    priceLabel: '₩4,900',
    period: '/월',
    perks: ['AI 일일 쿼터 2배', '워터마크 제거', '지역 슬롯 +10', '그룹 1개 추가 무료', '오프라인 팩'],
    revenueCatProductId: 'tingting_plus_monthly',
  },
  {
    id: 'plus_yearly',
    name: 'TingTing Plus 연간',
    priceLabel: '₩39,900',
    period: '/년',
    perks: ['월간 Plus 전체 혜택', '연간 한정 프레임', '약 32% 할인'],
    revenueCatProductId: 'tingting_plus_yearly',
  },
  {
    id: 'couple_monthly',
    name: 'TingTing Couple',
    priceLabel: '₩7,900',
    period: '/월',
    perks: ['Plus 전체', '커플 타임라인', '그룹 톤 맞춤', '커플 템플릿'],
    revenueCatProductId: 'tingting_couple_monthly',
  },
];

export const STAR_IAP_CATALOG: StarPack[] = [
  { id: 'stars_s', stars: 100, priceLabel: '₩1,100', revenueCatProductId: 'stars_s' },
  { id: 'stars_m', stars: 550, priceLabel: '₩4,900', bonus: '+10%', revenueCatProductId: 'stars_m' },
  { id: 'stars_l', stars: 1200, priceLabel: '₩9,900', bonus: '+20%', revenueCatProductId: 'stars_l' },
  { id: 'stars_xl', stars: 2800, priceLabel: '₩19,900', bonus: '+30%', revenueCatProductId: 'stars_xl' },
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
  return { success: false, message: 'Coming Soon — RevenueCat 연동 예정' };
}

export async function purchaseStarPack(_packId: string): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Coming Soon — 스타 IAP 출시 예정' };
}

export async function restorePurchases(): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Coming Soon' };
}

export function hasPlusEntitlement(_entitlements?: Record<string, unknown>): boolean {
  return false;
}
