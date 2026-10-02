import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Image, Pressable } from 'react-native';
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

/** Same order as GET /auth/users (created_at): first user is the boy, second the girl. */
const CHARACTERS = [require('@/assets/characters/dalting.jpg'), require('@/assets/characters/alting.jpg')];

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
        <Text style={styles.question}>{t('auth.whoAreYou')}</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <PremiumButton title={t('auth.retry')} variant="outline" onPress={load} />
          </View>
        ) : !users ? (
          <ActivityIndicator color={theme.colors.primaryLight} />
        ) : (
          <View style={styles.cards}>
            {users.map((u, i) => (
              <Pressable
                key={u.id}
                accessibilityRole="button"
                accessibilityLabel={u.displayName}
                onPress={() => enter(u)}
                disabled={enteringId != null}
                style={({ pressed }) => [
                  styles.userCard,
                  pressed && styles.userCardPressed,
                  enteringId != null && enteringId !== u.id && styles.userCardDimmed,
                ]}
              >
                <View style={styles.portraitWrap}>
                  <Image source={CHARACTERS[i % CHARACTERS.length]} style={styles.portrait} resizeMode="cover" />
                  {enteringId === u.id ? (
                    <View style={styles.portraitOverlay}>
                      <ActivityIndicator color={theme.colors.onPrimary} />
                    </View>
                  ) : null}
                </View>
                <View style={styles.nameRow}>
                  <Ionicons name="heart" size={14} color={theme.colors.primary} />
                  <Text style={styles.name} numberOfLines={1}>
                    {u.displayName}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
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
  question: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  cards: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  userCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    shadowColor: theme.colors.primaryDark,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  userCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  userCardDimmed: { opacity: 0.5 },
  portraitWrap: {
    aspectRatio: 1,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.gradientStart,
  },
  portrait: { width: '100%', height: '100%' },
  portraitOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,31,36,0.28)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: theme.spacing.sm + 2,
    paddingBottom: theme.spacing.xs + 2,
  },
  name: {
    color: theme.colors.primaryDark,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  errorBox: { gap: theme.spacing.sm },
  error: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
