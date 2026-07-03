import { View, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { shouldShowMainTabBar } from '@/components/AppShell';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

type TabRoute = {
  href: Href;
  match: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

const TABS: TabRoute[] = [
  { href: '/(tabs)/home', match: '/home', icon: 'home', labelKey: 'tabs.home' },
  { href: '/(tabs)/steps', match: '/steps', icon: 'footsteps', labelKey: 'tabs.steps' },
  { href: '/(tabs)/minigames', match: '/minigames', icon: 'game-controller', labelKey: 'tabs.minigames' },
  { href: '/(tabs)/recommend', match: '/recommend', icon: 'heart', labelKey: 'tabs.recommend' },
  { href: '/(tabs)/photos', match: '/photos', icon: 'images', labelKey: 'tabs.photos' },
  { href: '/(tabs)/shop', match: '/shop', icon: 'bag', labelKey: 'tabs.shopTab' },
];

export function MainTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const contentWidth = useContentWidth();
  const { t } = useLocale();

  if (!shouldShowMainTabBar(pathname)) return null;

  return (
    <View
      style={[
        styles.bar,
        shadow('tab'),
        {
          width: contentWidth,
          maxWidth: contentWidth,
          paddingBottom: Math.max(insets.bottom, 8),
          minHeight: MAIN_TAB_BAR_HEIGHT + Math.max(insets.bottom, 8),
        },
      ]}
    >
      <LinearGradient
        colors={[theme.colors.surfaceElevated, theme.colors.surface]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topLine} />
      {TABS.map((tab) => {
        const active = pathname.includes(tab.match);
        return (
          <Pressable key={tab.match} style={styles.item} onPress={() => router.replace(tab.href)}>
            {active ? (
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activePill}
              >
                <Ionicons name={tab.icon} size={20} color="#fff" />
              </LinearGradient>
            ) : (
              <View style={styles.iconWrap}>
                <Ionicons name={tab.icon} size={20} color={theme.colors.textSubtle} />
              </View>
            )}
            <Text style={[styles.label, active && styles.labelActive]}>{t(tab.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    alignSelf: 'center',
    paddingTop: 10,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    height: 1,
    backgroundColor: theme.colors.tint.light,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('sm'),
  },
  label: { color: theme.colors.textSubtle, fontSize: 10, fontWeight: '600' },
  labelActive: { color: theme.colors.primaryDark, fontWeight: '800' },
});
