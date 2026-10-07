import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { logError } from '@/lib/diagnostics';
import { safeBack } from '@/lib/navigation';
import { theme } from '@/constants/theme';

type Props = ErrorBoundaryProps & {
  /** where the crash happened, for the diagnostics log */
  screen: string;
  /** extra recovery action, e.g. reopening the camera without live effects */
  alternate?: { label: string; onPress: () => void | Promise<void> };
  /** tab screens have no back stack to return to */
  canGoBack?: boolean;
};

/** Korean recovery screen shown instead of a blank or frozen screen when a route throws. */
export function ScreenErrorBoundary({ error, retry, screen, alternate, canGoBack = false }: Props) {
  const router = useRouter();

  useEffect(() => {
    logError('error_boundary', error, { screen });
  }, [error, screen]);

  return (
    <View style={styles.root}>
      <Ionicons name="alert-circle-outline" size={44} color={theme.colors.primary} />
      <Text style={styles.title}>화면을 여는 중에 문제가 생겼어요</Text>
      <Text style={styles.message}>
        잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 앱을 완전히 닫았다가 다시 열어 주세요. 문제 내용은 자동으로 기록돼요.
      </Text>
      <Pressable style={styles.primary} onPress={() => void retry()}>
        <Text style={styles.primaryText}>다시 시도</Text>
      </Pressable>
      {alternate ? (
        <Pressable
          style={styles.secondary}
          onPress={async () => {
            await alternate.onPress();
            await retry();
          }}
        >
          <Text style={styles.secondaryText}>{alternate.label}</Text>
        </Pressable>
      ) : null}
      {canGoBack ? (
        <Pressable style={styles.link} onPress={() => safeBack(router)}>
          <Text style={styles.linkText}>뒤로 가기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  message: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primary: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { backgroundColor: theme.colors.tint.light, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  secondaryText: { color: theme.colors.primaryDark, fontWeight: '800' },
  link: { padding: 8 },
  linkText: { color: theme.colors.textMuted, fontWeight: '600' },
});
