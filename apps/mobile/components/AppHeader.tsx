import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { safeBack } from '@/lib/navigation';
import { theme } from '@/constants/theme';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showActions?: boolean;
  right?: ReactNode;
}

export function AppHeader({ title, showBack, showActions = true, right }: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentWidth = useContentWidth();
  const { t } = useLocale();

  return (
    <View style={[styles.container, { paddingTop: insets.top, width: contentWidth, maxWidth: contentWidth }]}>
      <View style={styles.row}>
        {showBack ? (
          <PremiumIconButton icon="arrow-back" onPress={() => safeBack(router)} accessibilityLabel={t('common.back')} />
        ) : null}

        <View style={[styles.titleWrap, showBack ? styles.titleWrapCenter : styles.titleWrapStart]}>
          <Text style={styles.title} numberOfLines={1}>
            {title ?? t('appName')}
          </Text>
        </View>

        <View style={styles.actions}>
          {right}
          {showActions ? (
            <PremiumIconButton
              icon="settings-outline"
              onPress={() => router.push('/settings' as Href)}
              accessibilityLabel={t('header.settings')}
            />
          ) : null}
          {!showActions && !right ? <View style={styles.iconSpacer} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: theme.colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: theme.spacing.sm,
    gap: 6,
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  titleWrapStart: { justifyContent: 'flex-start', marginLeft: theme.spacing.xs },
  titleWrapCenter: { justifyContent: 'center' },
  title: {
    flexShrink: 1,
    color: theme.colors.primaryDark,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  actions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 6 },
  iconSpacer: { width: 38, height: 38 },
});
