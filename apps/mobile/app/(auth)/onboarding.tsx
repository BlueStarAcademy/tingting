import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { ProgressRing } from '@/components/ProgressRing';
import { clampNicknameInput, nicknameErrorMessage, validateNickname } from '@/lib/nickname';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const { t } = useLocale();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    const validationError = validateNickname(name);
    if (validationError) {
      return Alert.alert(t('common.alert'), nicknameErrorMessage(validationError, t));
    }
    setLoading(true);
    try {
      await api.completeOnboarding(name.trim());
      await refresh();
      router.replace('/(tabs)/home');
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
      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.welcome')}</Text>
        <Text style={styles.sub}>{t('auth.onboardingSub')}</Text>
        <ProgressRing progress={0} label={t('auth.nation')} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.yourName')}
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={(text) => setName(clampNicknameInput(text))}
        />
        <PremiumButton title={t('auth.startExploring')} onPress={finish} loading={loading} />
      </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.lg },
  title: { fontSize: 32, fontWeight: '800', color: theme.colors.primaryDark },
  sub: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 15 },
  input: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
