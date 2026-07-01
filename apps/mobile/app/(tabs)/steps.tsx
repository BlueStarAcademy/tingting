import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, Platform, Modal } from 'react-native';
import { Pedometer } from '@/lib/pedometer';
import { useFocusEffect } from 'expo-router';
import { PageHeader } from '@/components/PageHeader';
import { TabPage } from '@/components/TabPage';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { TIMEZONE_OPTIONS, canChangeTimezone, getDayStartInTimezone, DEFAULT_TIMEZONE } from '@/lib/timezone';
import type { PedometerDayState } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function StepsScreen() {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const [state, setState] = useState<(PedometerDayState & { timezone: string; timezoneLockedUntil?: string }) | null>(null);
  const [available, setAvailable] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<number | null>(null);
  const [pendingMilestone, setPendingMilestone] = useState(0);
  const [tzOpen, setTzOpen] = useState(false);

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

  const milestones = [1, 2, 3, 4, 5];
  const dailySteps = state?.dailySteps ?? 0;

  const openRoulette = (m: number) => {
    setPendingMilestone(m);
    setRouletteResult(null);
    setRouletteOpen(true);
  };

  const spin = async () => {
    try {
      const result = await api.spinStepRoulette(pendingMilestone);
      setRouletteResult(result.reward);
      await refresh();
      await load();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('steps.failed'));
      setRouletteOpen(false);
    }
  };

  const changeTz = async (tz: string) => {
    try {
      await api.setStepTimezone(tz);
      setTzOpen(false);
      await load();
      Alert.alert(t('steps.timezoneChanged'), t('steps.timezoneLockNote'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('steps.failed'));
    }
  };

  const tzLabel = TIMEZONE_OPTIONS.find((o) => o.id === state?.timezone)?.label ?? state?.timezone;
  const tzLocked = !canChangeTimezone(state?.timezoneLockedUntil);

  return (
    <TabPage contentContainerStyle={styles.page}>
      <PageHeader title={t('steps.title')} subtitle={t('steps.sub')} />

      <View style={styles.counter}>
        <Text style={styles.steps}>{dailySteps.toLocaleString()}</Text>
        <Text style={styles.unit}>{t('steps.stepsUnit')}</Text>
      </View>

      {!available ? <Text style={styles.warn}>{t('steps.unavailable')}</Text> : null}

      <Pressable style={styles.tzRow} onPress={() => !tzLocked && setTzOpen(true)} disabled={tzLocked}>
        <Text style={styles.tzLabel}>{t('steps.timezone')}: {tzLabel}</Text>
        {tzLocked ? (
          <Text style={styles.tzLock}>{t('steps.timezoneLocked')}</Text>
        ) : (
          <Text style={styles.tzChange}>{t('steps.timezoneChange')}</Text>
        )}
      </Pressable>

      <Text style={styles.section}>{t('steps.rouletteTitle')}</Text>
      <View style={styles.milestones}>
        {milestones.map((m) => {
          const reached = dailySteps >= m * 1000;
          const claimed = state?.claimedMilestones.includes(m);
          const canSpin = reached && !claimed && (state?.rouletteUsed ?? 0) < 5;
          return (
            <Pressable
              key={m}
              style={[styles.milestone, reached && styles.milestoneOn, claimed && styles.milestoneDone]}
              onPress={() => canSpin && openRoulette(m)}
              disabled={!canSpin}
            >
              <Text style={styles.milestoneNum}>{m * 1000}</Text>
              <Text style={styles.milestoneSub}>
                {claimed ? '✓' : canSpin ? t('steps.spin') : t('steps.locked')}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{t('steps.rouletteHint')}</Text>

      <Modal visible={tzOpen} transparent animationType="fade" onRequestClose={() => setTzOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setTzOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('steps.timezonePick')}</Text>
          {TIMEZONE_OPTIONS.map((o) => (
            <Pressable key={o.id} style={styles.tzOpt} onPress={() => changeTz(o.id)}>
              <Text style={styles.tzOptText}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      <Modal visible={rouletteOpen} transparent animationType="slide" onRequestClose={() => setRouletteOpen(false)}>
        <View style={styles.rouletteWrap}>
          <Text style={styles.rouletteTitle}>{t('steps.rouletteSpin')}</Text>
          {rouletteResult === null ? (
            <>
              <Text style={styles.rouletteDesc}>{t('steps.rouletteDesc', { steps: pendingMilestone * 1000 })}</Text>
              <PremiumButton title={t('steps.spinNow')} onPress={spin} />
            </>
          ) : (
            <>
              <Text style={styles.rouletteReward}>✦ {rouletteResult}</Text>
              <PremiumButton title={t('common.continue')} onPress={() => setRouletteOpen(false)} />
            </>
          )}
        </View>
      </Modal>
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.md },
  counter: { alignItems: 'center', paddingVertical: theme.spacing.lg },
  steps: { color: theme.colors.primaryDark, fontSize: 48, fontWeight: '900' },
  unit: { color: theme.colors.textMuted, fontSize: 16 },
  warn: { color: theme.colors.star, textAlign: 'center' },
  tzRow: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tzLabel: { color: theme.colors.text, fontWeight: '600' },
  tzChange: { color: theme.colors.primaryLight, marginTop: 4, fontSize: 13 },
  tzLock: { color: theme.colors.textMuted, marginTop: 4, fontSize: 12 },
  section: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  milestones: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  milestone: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    opacity: 0.5,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  milestoneOn: { opacity: 1, borderColor: theme.colors.primaryLight },
  milestoneDone: { opacity: 0.7, backgroundColor: theme.colors.successSoft },
  milestoneNum: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  milestoneSub: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  hint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  modalBg: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    maxHeight: '50%',
  },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: theme.spacing.sm },
  tzOpt: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceLight },
  tzOptText: { color: theme.colors.text, fontSize: 15 },
  rouletteWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: theme.spacing.lg,
  },
  rouletteTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: theme.spacing.md },
  rouletteDesc: { color: '#fff', textAlign: 'center', marginBottom: theme.spacing.lg },
  rouletteReward: { color: theme.colors.star, fontSize: 48, fontWeight: '900', marginBottom: theme.spacing.lg },
});
