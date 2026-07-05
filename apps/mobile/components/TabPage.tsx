import { ReactNode, ComponentProps } from 'react';
import { View, ScrollView, StyleSheet, ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useContentWidth } from '@/hooks/useContentWidth';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
} & Pick<ScrollViewProps, 'refreshControl' | 'showsVerticalScrollIndicator' | 'keyboardShouldPersistTaps' | 'nestedScrollEnabled' | 'scrollEnabled'>;

export function TabPage({ children, style, contentContainerStyle, ...scrollProps }: Props) {
  const contentWidth = useContentWidth();

  return (
    <View style={[styles.page, { width: contentWidth, maxWidth: contentWidth }, style]}>
      <ScreenBackground />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal={false}
        bounces={false}
        overScrollMode="never"
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, overflow: 'hidden' },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + MAIN_TAB_BAR_HEIGHT,
  },
});
