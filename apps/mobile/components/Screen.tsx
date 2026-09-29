import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useContentWidth } from '@/hooks/useContentWidth';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

type Props = {
  title?: string;
  /** Tab screens: no back button, leave room for the tab bar */
  tab?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Rendered above the scroll area bottom (e.g. floating buttons) */
  overlay?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ title, tab, right, children, scroll = true, refreshing, onRefresh, overlay, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const contentWidth = useContentWidth();
  const bottom = tab ? MAIN_TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + theme.spacing.xl : Math.max(insets.bottom, 12) + theme.spacing.lg;

  return (
    <View style={[styles.page, { width: contentWidth, maxWidth: contentWidth }]}>
      <ScreenBackground />
      <AppHeader title={title} showBack={!tab} showActions={tab} right={right} />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, alignSelf: 'center', overflow: 'hidden', backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
});
