import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { CoupleUser } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
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
  const [selected, setSelected] = useState<CoupleUser | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const openPassword = (user: CoupleUser) => {
    setSelected(user);
    setPassword('');
    setPasswordError('');
  };

  const closePassword = () => {
    if (enteringId) return;
    setSelected(null);
  };

  const enter = async () => {
    if (!selected || !password) return;
    setEnteringId(selected.id);
    setPasswordError('');
    try {
      await api.enterAs(selected.id, password);
      await refresh();
      setSelected(null);
      router.replace(APP_ENTRY_HREF);
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : t('auth.unknownError'));
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
                onPress={() => openPassword(u)}
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

      <AppModal visible={selected != null} animationType="fade" onRequestClose={closePassword} variant="center">
        <View style={styles.passwordSheet}>
          <Text style={styles.passwordTitle}>{t('auth.passwordTitle', { name: selected?.displayName ?? '' })}</Text>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setPasswordError('');
            }}
            placeholder={t('auth.password')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={enter}
            editable={enteringId == null}
          />
          {passwordError ? <Text style={styles.passwordError}>{passwordError}</Text> : null}
          <PremiumButton title={t('auth.enter')} onPress={enter} loading={enteringId != null} disabled={!password} />
          <PremiumButton title={t('common.cancel')} variant="ghost" onPress={closePassword} disabled={enteringId != null} />
        </View>
      </AppModal>
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
  passwordSheet: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  passwordTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginBottom: theme.spacing.xs },
  passwordInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  passwordError: { color: theme.colors.error, fontSize: 13 },
  error: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
