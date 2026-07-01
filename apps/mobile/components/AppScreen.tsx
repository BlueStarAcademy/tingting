import { ReactNode, ReactElement } from 'react';
import { View, ScrollView, StyleSheet, RefreshControlProps, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { GradientBackground } from '@/components/GradientBackground';
import { ScreenBackground } from '@/components/ScreenBackground';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

interface AppScreenProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showActions?: boolean;
  scroll?: boolean;
  gradient?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function AppScreen({
  children,
  title,
  showBack,
  showActions = true,
  scroll = true,
  gradient = false,
  refreshControl,
  contentStyle,
}: AppScreenProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  const inner = (
    <>
      <AppHeader title={title} showBack={showBack} showActions={showActions} />
      {body}
    </>
  );

  if (gradient) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          {inner}
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, styles.plain]} edges={['bottom']}>
      <ScreenBackground />
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' },
  plain: { backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: theme.spacing.lg, paddingBottom: theme.spacing.xl + MAIN_TAB_BAR_HEIGHT },
  content: { flex: 1, minHeight: 0, padding: theme.spacing.lg, paddingBottom: MAIN_TAB_BAR_HEIGHT },
});
