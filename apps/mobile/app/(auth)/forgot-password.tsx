import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return Alert.alert(t('common.alert'), t('auth.email') + '을(를) 입력해 주세요');
    setLoading(true);
    try {
      await api.requestPasswordReset(trimmedEmail);
      Alert.alert(t('auth.resetEmailSent'), t('auth.resetEmailSentSub'), [
        { text: t('common.continue'), onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
            <Text style={styles.sub}>{t('auth.forgotPasswordSub')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <PremiumButton title={t('auth.sendResetEmail')} onPress={submit} loading={loading} />
            <PremiumButton title={t('auth.backToLogin')} onPress={() => router.back()} variant="outline" />
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
  card: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.primaryDark,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
});
