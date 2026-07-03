import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { handleSupabaseAuthUrl } from '@/lib/supabase';
import { theme } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const incomingUrl = Linking.useURL();
  const { t } = useLocale();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const url =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : incomingUrl ?? (await Linking.getInitialURL());
        if (url) await handleSupabaseAuthUrl(url);
      } catch (e: unknown) {
        Alert.alert(t('auth.authLinkFailed'), e instanceof Error ? e.message : t('auth.unknownError'));
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [incomingUrl, t]);

  const submit = async () => {
    if (password.length < 6) return Alert.alert(t('common.alert'), t('auth.passwordTooShort'));
    if (password !== confirmPassword) return Alert.alert(t('common.alert'), t('auth.passwordMismatch'));
    setLoading(true);
    try {
      await api.updatePassword(password);
      await api.signOut();
      Alert.alert(t('auth.passwordResetDone'), t('auth.login'), [
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
            {initializing ? (
              <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            ) : (
              <>
                <Text style={styles.title}>{t('auth.resetPasswordTitle')}</Text>
                <Text style={styles.sub}>{t('auth.resetPasswordSub')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.newPassword')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.confirmPassword')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                <PremiumButton title={t('auth.resetPasswordTitle')} onPress={submit} loading={loading} />
              </>
            )}
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
