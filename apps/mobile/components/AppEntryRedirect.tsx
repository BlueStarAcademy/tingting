import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

/** 사용자를 골랐으면 홈, 아니면 사용자 선택으로 이동 */
export function AppEntryRedirect() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/(auth)/select-user');
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
