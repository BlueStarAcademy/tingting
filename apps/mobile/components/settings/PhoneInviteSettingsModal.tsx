import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { AppModal } from '@/components/AppModal';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PhoneInviteSettingsModal({ visible, onClose }: Props) {
  const { t } = useLocale();
  const { profile, refresh } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setBlocked(profile?.blockPhoneInvite ?? false);
  }, [visible, profile?.blockPhoneInvite]);

  const toggle = async (value: boolean) => {
    if (!profile?.phoneVerified) {
      Alert.alert(t('common.alert'), t('settings.phoneVerifyPending'));
      return;
    }
    setBlocked(value);
    setSaving(true);
    try {
      await api.updatePhoneInviteSettings(value);
      await refresh();
    } catch (e: unknown) {
      setBlocked(!value);
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal visible={visible} animationType="fade" onRequestClose={onClose} variant="center">
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.phoneInviteSettings')}</Text>
          <PremiumIconButton
            icon="close"
            onPress={onClose}
            variant="soft"
            color={theme.colors.textMuted}
            accessibilityLabel={t('header.cancel')}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t('settings.blockPhoneInvite')}</Text>
            <Text style={styles.hint}>{t('settings.blockPhoneInviteHint')}</Text>
          </View>
          <Switch
            value={blocked}
            onValueChange={toggle}
            disabled={saving || !profile?.phoneVerified}
            trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primaryLight }}
          />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    minWidth: 300,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  rowText: { flex: 1 },
  rowLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
});
