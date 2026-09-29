import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { CoupleUser } from '@tingting/shared';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { APP_ENTRY_HREF } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function SelectUserScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { t } = useLocale();
  const [users, setUsers] = useState<CoupleUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setUsers(null);
    try {
      setUsers(await api.listUsers());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const enter = async (user: CoupleUser) => {
    setEnteringId(user.id);
    try {
      await api.enterAs(user.id);
      await refresh();
      router.replace(APP_ENTRY_HREF);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setEnteringId(null);
    }
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heart}>
          <Ionicons name="heart" size={34} color={theme.colors.onPrimary} />
        </View>
        <Text style={styles.logo}>{t('appName')}</Text>
        <Text style={styles.sub}>{t('auth.tagline')}</Text>
        <View style={styles.card}>
          <Text style={styles.question}>{t('auth.whoAreYou')}</Text>
          {error ? (
            <>
              <Text style={styles.error}>{error}</Text>
              <PremiumButton title={t('auth.retry')} variant="outline" onPress={load} />
            </>
          ) : !users ? (
            <ActivityIndicator color={theme.colors.primaryLight} />
          ) : (
            users.map((u) => (
              <PremiumButton
                key={u.id}
                title={u.displayName}
                onPress={() => enter(u)}
                loading={enteringId === u.id}
                disabled={enteringId != null}
              />
            ))
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.xl },
  heart: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  logo: {
    fontSize: 44,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    textAlign: 'center',
    letterSpacing: -1,
  },
  sub: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  question: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  error: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
