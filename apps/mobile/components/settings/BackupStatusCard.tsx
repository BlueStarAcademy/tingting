import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import type { BackupStatus } from '@tingting/shared';
import { PremiumButton } from '@/components/PremiumButton';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { dDayLabel, formatDateKey, formatTimestamp, parseDateKey, todayKey } from '@/lib/dates';
import { theme } from '@/constants/theme';

type Tone = 'ok' | 'busy' | 'error' | 'off';

const TONE_COLOR: Record<Tone, string> = {
  ok: theme.colors.success,
  busy: theme.colors.accent,
  error: theme.colors.error,
  off: theme.colors.textSubtle,
};

const TOKEN_WARN_DAYS = 14;

function daysUntil(key: string): number {
  return Math.round((parseDateKey(key).getTime() - parseDateKey(todayKey()).getTime()) / 86_400_000);
}

export function BackupStatusCard() {
  const { t } = useLocale();
  const { data: status, setData, error, reload } = useFocusLoad(() => api.getBackupStatus());
  const [running, setRunning] = useState(false);
  const recheck = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(recheck.current), []);

  const runNow = async () => {
    setRunning(true);
    try {
      setData(await api.runBackup());
      clearTimeout(recheck.current);
      recheck.current = setTimeout(reload, 4000);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setRunning(false);
    }
  };

  const describe = (s: BackupStatus): { tone: Tone; title: string; detail?: string } => {
    if (!s.enabled) return { tone: 'off', title: t('backup.off'), detail: t('backup.offDetail') };
    if (s.errorStatus === 401 || s.errorStatus === 403) {
      return { tone: 'error', title: t('backup.tokenExpired'), detail: t('backup.tokenExpiredDetail') };
    }
    if (s.errorStatus === 507) return { tone: 'error', title: t('backup.quotaFull'), detail: t('backup.retryDetail') };
    if (s.errorStatus != null) {
      return { tone: 'error', title: t('backup.failed'), detail: `${t('backup.retryDetail')} (${s.errorMessage ?? ''})` };
    }
    if (s.running) return { tone: 'busy', title: t('backup.running', { count: s.pending }) };
    if (s.pending > 0) return { tone: 'busy', title: t('backup.waiting', { count: s.pending }) };
    return { tone: 'ok', title: t('backup.ok') };
  };

  const renderToken = (s: BackupStatus) => {
    if (!s.enabled) return null;
    if (!s.tokenExpiresAt) return <Text style={styles.meta}>{t('backup.tokenExpiryUnknown')}</Text>;
    const left = daysUntil(s.tokenExpiresAt);
    const color = left < 0 ? theme.colors.error : left <= TOKEN_WARN_DAYS ? theme.colors.accentDark : theme.colors.textMuted;
    return (
      <Text style={[styles.meta, { color }]}>
        {t('backup.tokenExpiry', { date: formatDateKey(s.tokenExpiresAt, true), dday: dDayLabel(s.tokenExpiresAt) })}
      </Text>
    );
  };

  if (!status) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>{t('backup.title')}</Text>
        {error ? <Text style={styles.meta}>{error}</Text> : <ActivityIndicator color={theme.colors.primaryLight} />}
      </View>
    );
  }

  const { tone, title, detail } = describe(status);
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('backup.title')}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: TONE_COLOR[tone] }]} />
        <Text style={[styles.status, { color: tone === 'error' ? theme.colors.error : theme.colors.text }]}>{title}</Text>
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {status.enabled ? (
        <Text style={styles.meta}>
          {t('backup.count', { count: status.backedUp })}
          {status.lastSuccessAt ? ` · ${t('backup.lastChecked', { time: formatTimestamp(status.lastSuccessAt) })}` : ''}
        </Text>
      ) : null}
      {renderToken(status)}
      {status.enabled ? (
        <PremiumButton
          title={t('backup.runNow')}
          variant="outline"
          compact
          onPress={runNow}
          loading={running}
          disabled={status.running}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  heading: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  status: { fontSize: 16, fontWeight: '700' },
  detail: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  meta: { color: theme.colors.textMuted, fontSize: 13 },
  button: { marginTop: theme.spacing.xs },
});
