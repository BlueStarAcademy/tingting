import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { APP_ENTRY_HREF } from '@/lib/navigation';
import { handleSupabaseAuthUrl } from '@/lib/supabase';
import { theme } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const incomingUrl = Linking.useURL();
  const { refresh } = useAuth();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const url =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : incomingUrl ?? (await Linking.getInitialURL());
        if (!url) return;
        await handleSupabaseAuthUrl(url);
        await refresh();
        if (!cancelled) router.replace(APP_ENTRY_HREF);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('auth.authLinkFailed'));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [incomingUrl, refresh, router, t]);

  return (
    <GradientBackground>
      <View style={styles.container}>
        {error ? (
          <View style={styles.card}>
            <Text style={styles.title}>{t('auth.authLinkFailed')}</Text>
            <Text style={styles.sub}>{error}</Text>
            <PremiumButton title={t('auth.backToLogin')} onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : (
          <View style={styles.card}>
            <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            <Text style={styles.title}>{t('auth.authCompleteTitle')}</Text>
            <Text style={styles.sub}>{t('auth.authCompleteSub')}</Text>
          </View>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
  card: {
    gap: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.primaryDark,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
