import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return Alert.alert('알림', '이메일을 입력해 주세요');
    setLoading(true);
    try {
      await api.signIn(email.trim(), password);
      await refresh();
      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('로그인 실패', e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      await api.signInDemo();
      await refresh();
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.logo}>TingTing</Text>
        <Text style={styles.sub}>전국일주를 기록하다</Text>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <PremiumButton title="로그인" onPress={handleLogin} loading={loading} />
          <View style={styles.gap} />
          <PremiumButton title="데모 모드" onPress={handleDemo} loading={loading} variant="outline" />
          <PremiumButton title="회원가입" onPress={() => router.push('/(auth)/signup')} variant="outline" />
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
  logo: { fontSize: 42, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: theme.spacing.xl, fontSize: 16 },
  form: { gap: theme.spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  gap: { height: theme.spacing.sm },
});
