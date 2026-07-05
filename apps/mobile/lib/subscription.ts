import type { MailboxMessage, ShopSubscriptionPlanId } from '@tingting/shared';
import {
  SUBSCRIPTION_DURATION_DAYS,
  getSubscriptionDailyStars,
} from '@tingting/shared';
import { getDayKey, getDayStartInTimezone } from '@/lib/timezone';

export const SUBSCRIPTION_TIMEZONE = 'Asia/Seoul';

export interface SubscriptionState {
  planId: ShopSubscriptionPlanId;
  purchasedAt: string;
  /** 구매 다음날(KST)부터 30일간 매일 0시 발송 */
  firstDeliveryDayKey: string;
  deliveredCount: number;
}

export function addDaysToDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const base = new Date(year, month - 1, day + days, 12, 0, 0);
  return getDayKey(SUBSCRIPTION_TIMEZONE, base);
}

export function getFirstDeliveryDayKey(purchasedAt = new Date()): string {
  const purchaseDayKey = getDayKey(SUBSCRIPTION_TIMEZONE, purchasedAt);
  return addDaysToDayKey(purchaseDayKey, 1);
}

export function buildSubscriptionDeliveryDayKeys(firstDayKey: string): string[] {
  return Array.from({ length: SUBSCRIPTION_DURATION_DAYS }, (_, index) =>
    addDaysToDayKey(firstDayKey, index),
  );
}

export function isDeliveryDayDue(deliveryDayKey: string, now = new Date()): boolean {
  const [year, month, day] = deliveryDayKey.split('-').map(Number);
  const probe = new Date(year, month - 1, day, 12, 0, 0);
  const midnight = getDayStartInTimezone(SUBSCRIPTION_TIMEZONE, probe);
  return now.getTime() >= midnight.getTime();
}

export function buildSubscriptionMail(
  planId: ShopSubscriptionPlanId,
  deliveryDayKey: string,
  dayIndex: number,
): Pick<
  MailboxMessage,
  'type' | 'title' | 'body' | 'rewardStars' | 'subscriptionDayKey' | 'subscriptionPlanId' | 'subscriptionDayIndex'
> {
  const stars = getSubscriptionDailyStars(planId);
  const dayNumber = dayIndex + 1;
  return {
    type: 'star_reward',
    title: `구독 스타 ${stars}개 (${dayNumber}/${SUBSCRIPTION_DURATION_DAYS})`,
    body: `매일 0시에 도착한 구독 혜택입니다. 아래 수령 버튼을 눌러 스타 ${stars}개를 받아 주세요.`,
    rewardStars: stars,
    subscriptionDayKey: deliveryDayKey,
    subscriptionPlanId: planId,
    subscriptionDayIndex: dayNumber,
  };
}

export function isStarRewardMessage(message: MailboxMessage): boolean {
  return message.type === 'star_reward' && (message.rewardStars ?? 0) > 0;
}

export function isStarRewardClaimable(message: MailboxMessage): boolean {
  return isStarRewardMessage(message) && !message.rewardClaimedAt;
}

export function isMailboxUnread(message: MailboxMessage): boolean {
  if (message.type === 'group_invite' && message.inviteStatus === 'pending') return true;
  if (isStarRewardMessage(message)) return isStarRewardClaimable(message);
  return !message.readAt;
}

export function getSubscriptionExpiresAt(firstDeliveryDayKey: string): Date {
  const lastDayKey = addDaysToDayKey(firstDeliveryDayKey, SUBSCRIPTION_DURATION_DAYS - 1);
  const [year, month, day] = lastDayKey.split('-').map(Number);
  const probe = new Date(year, month - 1, day, 12, 0, 0);
  const lastMidnight = getDayStartInTimezone(SUBSCRIPTION_TIMEZONE, probe);
  return new Date(lastMidnight.getTime() + 24 * 60 * 60 * 1000);
}

export function isSubscriptionActive(state: SubscriptionState | null, now = new Date()): boolean {
  if (!state) return false;
  return now.getTime() < getSubscriptionExpiresAt(state.firstDeliveryDayKey).getTime();
}

export function getSubscriptionBadgeLabel(planId: ShopSubscriptionPlanId): string {
  return planId === 'premium_plus' ? 'TTP+' : 'TTP';
}
