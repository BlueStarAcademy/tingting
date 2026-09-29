import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Platform } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { SettingsMenuRow } from '@/components/settings/SettingsMenuRow';
import { BackupStatusCard } from '@/components/settings/BackupStatusCard';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { api } from '@/lib/api';
import { applyAppUpdate, checkForAppUpdate, getAppVersionLabel, isAppUpdateEnabled } from '@/lib/updates';
import { theme } from '@/constants/theme';

export default function SettingsScreen() {
  const { t } = useLocale();
  const { user, partner, refresh } = useAuth();
  const { requestLogout } = useLogoutConfirm();
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const saveName = () =>
    run(async () => {
      await api.updateMe({ displayName: name.trim() });
      await refresh();
      setNameOpen(false);
    });

  const handleAppUpdate = () =>
    run(async () => {
      if (!isAppUpdateEnabled()) {
        Alert.alert(t('settings.appUpdate'), t('settings.updateDisabled'));
        return;
      }
      const { status, message } = await checkForAppUpdate();
      if (status === 'available') {
        Alert.alert(t('settings.updateApplied'), t('settings.updateAppliedMessage'));
        await applyAppUpdate();
      } else if (status === 'upToDate') {
        Alert.alert(t('settings.updateUpToDate'), t('settings.updateUpToDateMessage'));
      } else {
        Alert.alert(t('settings.updateFailed'), message ?? '');
      }
    });

  return (
    <AppScreen title={t('settings.title')} showBack showActions={false}>
      <View style={styles.coupleCard}>
        <Text style={styles.coupleNames}>
          {user?.displayName ?? ''} <Text style={styles.heart}>♥</Text> {partner?.displayName ?? ''}
        </Text>
        <Text style={styles.coupleSub}>우리 둘만의 여행 기록</Text>
      </View>

      <BackupStatusCard />

      <View style={styles.section}>
        <SettingsMenuRow
          label="내 이름"
          value={user?.displayName}
          onPress={() => {
            setName(user?.displayName ?? '');
            setNameOpen(true);
          }}
        />
        {Platform.OS !== 'web' ? (
          <SettingsMenuRow
            label={t('settings.appUpdate')}
            value={t('settings.appVersion', { version: getAppVersionLabel() })}
            onPress={handleAppUpdate}
          />
        ) : null}
        <SettingsMenuRow label={t('header.logout')} onPress={requestLogout} destructive />
      </View>

      <AppModal visible={nameOpen} animationType="fade" onRequestClose={() => setNameOpen(false)} variant="center">
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>내 이름</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="이름"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={20}
          />
          <PremiumButton title="저장" onPress={saveName} loading={busy} disabled={!name.trim()} />
        </View>
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  coupleCard: {
    alignItems: 'center',
    gap: 4,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coupleNames: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  heart: { color: theme.colors.primary },
  coupleSub: { fontSize: 13, color: theme.colors.textMuted },
  section: { gap: theme.spacing.xs },
  modalSheet: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    minWidth: 300,
  },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: theme.spacing.xs },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
});
