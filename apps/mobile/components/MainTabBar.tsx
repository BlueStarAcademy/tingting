import { View, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { glassSurface, shadow } from '@/lib/ui';
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
  { href: '/(tabs)/ranking', match: '/ranking', icon: 'trophy', labelKey: 'tabs.ranking' },
  { href: '/(tabs)/shop', match: '/shop', icon: 'bag', labelKey: 'tabs.shopTab' },
];

export function MainTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const contentWidth = useContentWidth();
  const { t } = useLocale();

  if (pathname.includes('(auth)')) return null;

  return (
    <View
      style={[
        styles.bar,
        glassSurface(),
        shadow('tab'),
        {
          width: contentWidth,
          maxWidth: contentWidth,
          paddingBottom: Math.max(insets.bottom, 8),
          minHeight: MAIN_TAB_BAR_HEIGHT + Math.max(insets.bottom, 8),
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = pathname.includes(tab.match);
        return (
          <Pressable key={tab.match} style={styles.item} onPress={() => router.replace(tab.href)}>
            {active ? (
              <LinearGradient
                colors={[theme.colors.tint.gradientStart, theme.colors.tint.gradientEnd]}
                style={styles.activePill}
              >
                <Ionicons name={tab.icon} size={20} color={theme.colors.primaryDark} />
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
    borderBottomWidth: 0,
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
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  label: { color: theme.colors.textSubtle, fontSize: 10, fontWeight: '600' },
  labelActive: { color: theme.colors.primaryDark, fontWeight: '800' },
});
