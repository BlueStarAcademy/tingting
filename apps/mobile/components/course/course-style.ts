import type { CourseSlot } from '@tingting/shared';
import type { IconName } from '@/components/ui';
import { theme } from '@/constants/theme';

export const SLOT_STYLE: Record<CourseSlot, { color: string; icon: IconName }> = {
  morning: { color: theme.colors.primary, icon: 'sunny' },
  afternoon: { color: theme.colors.primary, icon: 'camera' },
  lunch: { color: theme.colors.accentDark, icon: 'restaurant' },
  dinner: { color: theme.colors.accentDark, icon: 'restaurant' },
  cafe: { color: '#A0715A', icon: 'cafe' },
  event: { color: '#8E6CC9', icon: 'calendar' },
  activity: { color: '#4F86C6', icon: 'sparkles' },
  stay: { color: theme.colors.teal, icon: 'bed' },
};
