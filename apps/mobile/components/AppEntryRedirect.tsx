import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

/** 인증 상태에 따라 로그인 / 홈으로 이동 (닉네임 설정은 OnboardingNicknameGate 모달) */
export function AppEntryRedirect() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [loading, session, router]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primaryLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
