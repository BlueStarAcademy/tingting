import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import type { UserProfile } from '@tingting/shared';
import { NICKNAME_CHANGE_COST } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { ProgressRing } from '@/components/ProgressRing';
import { clampNicknameInput, getNicknameLength, nicknameErrorMessage, validateNickname } from '@/lib/nickname';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  profile: UserProfile;
  onComplete: (displayName: string) => Promise<void>;
}

export function NicknameSetupModal({ visible, profile, onComplete }: Props) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initial = profile.displayName?.trim();
    setName(initial && validateNickname(initial) === null ? initial : '');
  }, [visible, profile.displayName]);

  const submit = async () => {
    const trimmed = name.trim();
    const validationError = validateNickname(trimmed);
    if (validationError) {
      Alert.alert(t('common.alert'), nicknameErrorMessage(validationError, t));
      return;
    }
    setLoading(true);
    try {
      await onComplete(trimmed);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      variant="center"
      animationType="fade"
      dismissOnBackdrop={false}
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.title}>{t('auth.nicknameSetupTitle')}</Text>
          <Text style={styles.sub}>{t('auth.nicknameSetupSub')}</Text>
          <ProgressRing progress={0} label={t('auth.nation')} />
          <Text style={styles.label}>{t('auth.displayName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.yourName')}
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={(text) => setName(clampNicknameInput(text))}
            autoFocus
          />
          <Text style={styles.hint}>{t('profile.nicknameLengthHint', { count: getNicknameLength(name) })}</Text>
          <Text style={styles.costHint}>{t('profile.nicknameChangeCostHint', { cost: NICKNAME_CHANGE_COST })}</Text>
          <PremiumButton title={t('auth.nicknameSetupConfirm')} onPress={submit} loading={loading} fullWidth />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  sub: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  costHint: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
});
