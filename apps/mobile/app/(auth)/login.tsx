import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { APP_ENTRY_HREF } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.alert'), '이메일과 비밀번호를 입력해 주세요');
      return;
    }
    setLoading(true);
    try {
      await api.signIn(email.trim(), password);
      await refresh();
      router.replace(APP_ENTRY_HREF);
    } catch (e: unknown) {
      Alert.alert(t('auth.loginFailed'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
          <View style={styles.heart}>
            <Ionicons name="heart" size={34} color={theme.colors.onPrimary} />
          </View>
          <Text style={styles.logo}>{t('appName')}</Text>
          <Text style={styles.sub}>{t('auth.tagline')}</Text>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder={t('auth.password')}
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onSubmitEditing={handleLogin}
            />
            <PremiumButton title={t('auth.login')} onPress={handleLogin} loading={loading} />
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  container: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
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
  form: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    fontSize: 16,
  },
});
