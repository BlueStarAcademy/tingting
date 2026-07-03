import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

export default function VerifyEmailSentScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await api.resendEmailVerification(email);
      Alert.alert(t('common.alert'), t('auth.resendDone'));
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
            <Text style={styles.title}>{t('auth.checkEmailTitle')}</Text>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.sub}>{t('auth.checkEmailSub')}</Text>
            <PremiumButton title={t('auth.resendEmail')} onPress={resend} loading={loading} disabled={!email} />
            <PremiumButton title={t('auth.backToLogin')} onPress={() => router.replace('/(auth)/login')} variant="outline" />
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
  email: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
