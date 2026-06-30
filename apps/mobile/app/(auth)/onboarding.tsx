import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { ProgressRing } from '@/components/ProgressRing';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Enter your name');
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
      <View style={styles.container}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.sub}>Explore 17 regions across Korea and earn stars</Text>
        <ProgressRing progress={0} label="Nation" />
        <TextInput style={styles.input} placeholder="Your display name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
        <PremiumButton title="Start Exploring" onPress={finish} loading={loading} />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.lg },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  sub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 15 },
  input: { width: '100%', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
