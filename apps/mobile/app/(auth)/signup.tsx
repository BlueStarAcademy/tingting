import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !displayName.trim()) return Alert.alert('Error', 'Fill all fields');
    setLoading(true);
    try {
      await api.signUp(email.trim(), password, displayName.trim());
      await refresh();
      router.replace('/(auth)/onboarding');
    } catch (e: unknown) {
      Alert.alert('Signup failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.title}>Join TingTing</Text>
        <TextInput style={styles.input} placeholder="Display name" placeholderTextColor={theme.colors.textMuted} value={displayName} onChangeText={setDisplayName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        <PremiumButton title="Sign Up" onPress={handleSignup} loading={loading} />
        <PremiumButton title="Back to Login" onPress={() => router.back()} variant="outline" />
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: theme.spacing.lg },
  input: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
