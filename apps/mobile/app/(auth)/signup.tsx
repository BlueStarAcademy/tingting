import { useState } from 'react';
import { Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !displayName.trim()) return Alert.alert(t('common.alert'), t('auth.fillAllFields'));
    setLoading(true);
    try {
      await api.signUp(email.trim(), password, displayName.trim());
      await refresh();
      router.replace('/(auth)/onboarding');
    } catch (e: unknown) {
      Alert.alert(t('auth.signupFailed'), e instanceof Error ? e.message : t('auth.unknownError'));
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
        <Text style={styles.title}>{t('auth.joinTitle')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('auth.displayName')}
          placeholderTextColor={theme.colors.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.email')}
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor={theme.colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <PremiumButton title={t('auth.signUp')} onPress={handleSignup} loading={loading} />
        <PremiumButton title={t('auth.backToLogin')} onPress={() => router.back()} variant="outline" />
        </KeyboardAvoidingView>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.primaryDark, textAlign: 'center', marginBottom: theme.spacing.lg },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
