import type { PedometerDayState } from '@tingting/shared';

const MILESTONES = [1, 2, 3, 4, 5] as const;
export const MAX_DAILY_ROULETTE = 5;

export function findNextRouletteMilestone(
  dailySteps: number,
  claimed: number[],
  isDemo: boolean,
): number | null {
  for (const m of MILESTONES) {
    if (claimed.includes(m)) continue;
    if (isDemo || dailySteps >= m * 1000) return m;
  }
  return null;
}

export function countAvailableRouletteSpins(
  dailySteps: number,
  claimed: number[],
  rouletteUsed: number,
  isDemo: boolean,
): number {
  const unclaimedReached = MILESTONES.filter(
    (m) => (isDemo || dailySteps >= m * 1000) && !claimed.includes(m),
  );
  const dailyRemaining = Math.max(0, MAX_DAILY_ROULETTE - rouletteUsed);
  return Math.min(unclaimedReached.length, dailyRemaining);
}

export function getNextStepTarget(
  dailySteps: number,
  claimed: number[],
): { target: number; remain: number } | null {
  for (const m of MILESTONES) {
    if (claimed.includes(m)) continue;
    const target = m * 1000;
    if (dailySteps < target) {
      return { target, remain: target - dailySteps };
    }
  }
  return null;
}

export function countClaimedMilestones(state: PedometerDayState | null | undefined): number {
  return state?.claimedMilestones.length ?? 0;
}
