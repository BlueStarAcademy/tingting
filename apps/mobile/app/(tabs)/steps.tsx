import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from '@/components/AppModal';
import { StepRouletteModal } from '@/components/StepRouletteModal';
import { Pedometer } from '@/lib/pedometer';
import { useFocusEffect } from 'expo-router';
import { TabPage } from '@/components/TabPage';
import { StepsProgressRing } from '@/components/StepsProgressRing';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import {
  countAvailableRouletteSpins,
  countClaimedMilestones,
  findNextRouletteMilestone,
  getNextStepTarget,
  MAX_DAILY_ROULETTE,
} from '@/lib/step-roulette';
import {
  TIMEZONE_OPTIONS,
  canChangeTimezone,
  getDayStartInTimezone,
  getTimezoneShortLabel,
  DEFAULT_TIMEZONE,
} from '@/lib/timezone';
import type { PedometerDayState } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function StepsScreen() {
  const { t } = useLocale();
  const { session, refresh } = useAuth();
  const [state, setState] = useState<(PedometerDayState & { timezone: string; timezoneLockedUntil?: string }) | null>(null);
  const [available, setAvailable] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [pendingMilestone, setPendingMilestone] = useState(0);
  const [tzOpen, setTzOpen] = useState(false);

  const isDemo = session?.isDemo ?? false;

  const load = async () => {
    setState(await api.getPedometerState());
  };

  useFocusEffect(
    useCallback(() => {
      load();
      refresh();
    }, [])
  );

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    (async () => {
      const ok = await Pedometer.isAvailableAsync();
      setAvailable(ok);
      if (!ok) return;

      if (Platform.OS === 'ios') {
        sub = Pedometer.watchStepCount(async (result: { steps: number }) => {
          await api.syncPedometerSteps(result.steps);
          load();
        });
      } else {
        const poll = async () => {
          const tz = (await api.getPedometerState()).timezone ?? DEFAULT_TIMEZONE;
          const end = new Date();
          const start = getDayStartInTimezone(tz, end);
          try {
            const r = await Pedometer.getStepCountAsync(start, end);
            await api.syncPedometerSteps(r.steps);
            load();
          } catch {
            /* ignore */
          }
        };
        poll();
        const id = setInterval(poll, 15000);
        sub = { remove: () => clearInterval(id) };
      }
    })();
    return () => sub?.remove();
  }, []);

  const dailySteps = state?.dailySteps ?? 0;
  const claimed = state?.claimedMilestones ?? [];
  const rouletteUsed = state?.rouletteUsed ?? 0;
  const tzShortLabel = getTimezoneShortLabel(state?.timezone ?? DEFAULT_TIMEZONE);
  const tzLocked = !canChangeTimezone(state?.timezoneLockedUntil);

  const availableSpins = useMemo(
    () => countAvailableRouletteSpins(dailySteps, claimed, rouletteUsed, isDemo),
    [claimed, dailySteps, isDemo, rouletteUsed],
  );
  const nextMilestone = useMemo(
    () => findNextRouletteMilestone(dailySteps, claimed, isDemo),
    [claimed, dailySteps, isDemo],
  );
  const nextTarget = useMemo(() => getNextStepTarget(dailySteps, claimed), [claimed, dailySteps]);
  const claimedCount = countClaimedMilestones(state);
  const canSpin = availableSpins > 0 && nextMilestone !== null;

  const openRoulette = () => {
    if (!canSpin || !nextMilestone) return;
    setPendingMilestone(nextMilestone);
    setRouletteOpen(true);
  };

  const handleRouletteContinue = async () => {
    const fresh = await api.getPedometerState();
    setState(fresh);
    await refresh();

    const spins = countAvailableRouletteSpins(
      fresh.dailySteps,
      fresh.claimedMilestones,
      fresh.rouletteUsed,
      isDemo,
    );
    const next = findNextRouletteMilestone(fresh.dailySteps, fresh.claimedMilestones, isDemo);
    if (spins > 0 && next) {
      setPendingMilestone(next);
      return true;
    }
    setRouletteOpen(false);
    return false;
  };

  const changeTz = async (tz: string) => {
    if (tzLocked) return;
    try {
      await api.setStepTimezone(tz);
      setTzOpen(false);
      await load();
      Alert.alert(t('steps.timezoneChanged'), t('steps.timezoneLockNote'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('steps.failed'));
    }
  };

  return (
    <TabPage contentContainerStyle={styles.page}>
      <View style={styles.ringContainer}>
        <StepsProgressRing steps={dailySteps} stepsLabel={t('steps.stepsUnit')} />
        <Pressable style={styles.tzOverlay} onPress={() => setTzOpen(true)}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
          <Text style={styles.tzOverlayText}>{tzShortLabel}</Text>
        </Pressable>
      </View>

      {!available ? <Text style={styles.warn}>{t('steps.unavailable')}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.rouletteCard,
          canSpin && styles.rouletteCardReady,
          canSpin && pressed && styles.rouletteCardPressed,
          !canSpin && styles.rouletteCardDisabled,
        ]}
        onPress={openRoulette}
        disabled={!canSpin}
      >
        <View style={[styles.rouletteIconWrap, canSpin && styles.rouletteIconWrapReady]}>
          <Ionicons name="gift" size={24} color={canSpin ? theme.colors.star : theme.colors.textSubtle} />
          {availableSpins > 0 ? (
            <View style={styles.rouletteBadge}>
              <Text style={styles.rouletteBadgeText}>{availableSpins}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.rouletteBody}>
          <Text style={styles.rouletteTitle}>{t('steps.rouletteTitle')}</Text>
          <Text style={styles.rouletteSub}>
            {canSpin
              ? t('steps.rouletteAvailable', { count: availableSpins })
              : claimedCount >= MAX_DAILY_ROULETTE || rouletteUsed >= MAX_DAILY_ROULETTE
                ? t('steps.rouletteAllDone')
                : nextTarget
                  ? t('steps.rouletteUntilNext', {
                      target: nextTarget.target.toLocaleString(),
                      remain: nextTarget.remain.toLocaleString(),
                    })
                  : t('steps.rouletteHint')}
          </Text>
          <Text style={styles.rouletteMeta}>
            {t('steps.rouletteProgress', { done: claimedCount, total: MAX_DAILY_ROULETTE })}
          </Text>
        </View>
        <Ionicons
          name={canSpin ? 'chevron-forward' : 'lock-closed'}
          size={18}
          color={canSpin ? theme.colors.primaryLight : theme.colors.textSubtle}
        />
      </Pressable>

      <AppModal visible={tzOpen} animationType="fade" onRequestClose={() => setTzOpen(false)} variant="center">
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('steps.timezonePick')}</Text>
          <Text style={styles.modalHint}>{t('steps.timezoneChangeLockHint')}</Text>
          <ScrollView style={styles.tzList} showsVerticalScrollIndicator={false}>
            {TIMEZONE_OPTIONS.map((o) => {
              const active = o.id === state?.timezone;
              const disabled = tzLocked && !active;
              return (
                <Pressable
                  key={o.id}
                  style={[styles.tzOpt, active && styles.tzOptActive, disabled && styles.tzOptDisabled]}
                  onPress={() => changeTz(o.id)}
                  disabled={disabled}
                >
                  <Text style={[styles.tzOptText, active && styles.tzOptTextActive]}>
                    {getTimezoneShortLabel(o.id)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </AppModal>

      <StepRouletteModal
        visible={rouletteOpen}
        milestone={pendingMilestone}
        remainingSpins={availableSpins}
        onClose={() => setRouletteOpen(false)}
        onComplete={async () => {
          await refresh();
          await load();
        }}
        onContinueAfterWin={handleRouletteContinue}
      />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.md },
  ringContainer: {
    alignSelf: 'center',
  },
  tzOverlay: {
    position: 'absolute',
    top: 8,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  tzOverlayText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  warn: { color: theme.colors.star, textAlign: 'center' },
  rouletteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  rouletteCardReady: {
    borderColor: theme.colors.star,
    backgroundColor: theme.colors.starGlow,
  },
  rouletteCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  rouletteCardDisabled: {
    opacity: 0.88,
  },
  rouletteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rouletteIconWrapReady: {
    backgroundColor: 'rgba(232,168,48,0.18)',
  },
  rouletteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surfaceElevated,
  },
  rouletteBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  rouletteBody: {
    flex: 1,
    gap: 2,
  },
  rouletteTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  rouletteSub: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  rouletteMeta: {
    color: theme.colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modalSheet: {
    padding: theme.spacing.md,
    maxHeight: 420,
    minWidth: 280,
  },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  modalHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  tzList: { maxHeight: 300 },
  tzOpt: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLight,
  },
  tzOptActive: { backgroundColor: theme.colors.tint.soft },
  tzOptDisabled: { opacity: 0.45 },
  tzOptText: { color: theme.colors.text, fontSize: 15 },
  tzOptTextActive: { color: theme.colors.primaryDark, fontWeight: '700' },
});
