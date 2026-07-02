import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PhoneVerifyModal({ visible, onClose }: Props) {
  const { t } = useLocale();
  const { profile, refresh } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && profile?.phone) {
      setPhone(formatPhone(profile.phone));
    }
  }, [visible, profile?.phone]);

  const reset = () => {
    setCode('');
    setCodeSent(false);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sendCode = async () => {
    const digits = normalizePhone(phone);
    if (!isValidPhone(digits)) {
      Alert.alert(t('common.alert'), t('group.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      await api.sendPhoneVerificationCode(digits);
      setCodeSent(true);
      Alert.alert(t('common.alert'), t('settings.demoCodeHint'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    const digits = normalizePhone(phone);
    if (!isValidPhone(digits) || !code.trim()) {
      Alert.alert(t('common.alert'), t('group.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      await api.verifyPhone(digits, code.trim());
      await refresh();
      Alert.alert(t('common.alert'), t('settings.phoneVerified'));
      handleClose();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  const verified = profile?.phoneVerified;

  return (
    <AppModal visible={visible} animationType="fade" onRequestClose={handleClose} variant="center">
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.phoneVerify')}</Text>
          <PremiumIconButton
            icon="close"
            onPress={handleClose}
            variant="soft"
            color={theme.colors.textMuted}
            accessibilityLabel={t('header.cancel')}
          />
        </View>

        {verified ? (
          <View style={styles.verifiedBox}>
            <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
            <Text style={styles.verifiedText}>{t('settings.phoneVerifyDone')}</Text>
            <Text style={styles.phoneText}>{formatPhone(profile?.phone ?? '')}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>{t('settings.phoneNumber')}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              placeholder="010-0000-0000"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="phone-pad"
              maxLength={13}
            />
            {!codeSent ? (
              <PremiumButton title={t('settings.sendCode')} onPress={sendCode} loading={loading} />
            ) : (
              <>
                <Text style={styles.label}>{t('settings.verificationCode')}</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text style={styles.hint}>{t('settings.demoCodeHint')}</Text>
                <PremiumButton title={t('settings.verify')} onPress={verify} loading={loading} />
              </>
            )}
          </>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    minWidth: 300,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  hint: { color: theme.colors.textMuted, fontSize: 13 },
  verifiedBox: { alignItems: 'center', gap: 8, paddingVertical: theme.spacing.md },
  verifiedText: { color: theme.colors.success, fontSize: 16, fontWeight: '700' },
  phoneText: { color: theme.colors.text, fontSize: 18, fontWeight: '600' },
});
