import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { MOBILE_MAX_WIDTH } from '@/constants/layout';
import { theme } from '@/constants/theme';

export function WebMobileFrame({ children }: { children: React.ReactNode }) {
  const { width: windowWidth } = useWindowDimensions();

  if (Platform.OS !== 'web') return <>{children}</>;

  const hasWidth = windowWidth > 0;
  const frameWidth = Math.min(Math.round(hasWidth ? windowWidth : MOBILE_MAX_WIDTH), MOBILE_MAX_WIDTH);

  return (
    <View style={[styles.root, hasWidth ? { width: windowWidth } : styles.rootFullWidth]}>
      <View style={[styles.frame, { width: frameWidth, maxWidth: frameWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    backgroundColor: '#EEF1F5',
    overflow: 'hidden',
  },
  rootFullWidth: {
    width: '100%',
  },
  frame: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
});
