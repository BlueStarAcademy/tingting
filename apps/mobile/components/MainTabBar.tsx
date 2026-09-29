import { View, Pressable, StyleSheet, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { shouldShowMainTabBar } from '@/components/AppShell';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

type TabRoute = {
  href: Href;
  match: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
  center?: boolean;
};

const TABS: TabRoute[] = [
  { href: '/home', match: '/home', icon: 'home-outline', iconActive: 'home', label: '홈' },
  { href: '/map', match: '/map', icon: 'map-outline', iconActive: 'map', label: '지도' },
  { href: '/camera', match: '/camera', icon: 'camera-outline', iconActive: 'camera', label: '카메라', center: true },
  { href: '/album', match: '/album', icon: 'images-outline', iconActive: 'images', label: '앨범' },
  { href: '/plans', match: '/plans', icon: 'calendar-outline', iconActive: 'calendar', label: '일정' },
];

export function MainTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const contentWidth = useContentWidth();
  const { session } = useAuth();

  if (!session || !shouldShowMainTabBar(pathname)) return null;

  const go = (href: Href) => {
    if (pathname === href) return;
    router.replace(href);
  };

  return (
    <View pointerEvents="box-none" style={[styles.host, Platform.OS === 'web' ? styles.hostWeb : null]}>
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
        {TABS.map((tab) => {
          const active = pathname === tab.match || pathname.startsWith(`${tab.match}/`);
          if (tab.center) {
            return (
              <Pressable key={tab.match} accessibilityRole="button" accessibilityLabel={tab.label} style={styles.item} onPress={() => go(tab.href)}>
                <LinearGradient
                  colors={[theme.colors.primaryLight, theme.colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.centerBtn, active && styles.centerBtnActive]}
                >
                  <Ionicons name={tab.iconActive} size={24} color="#fff" />
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable key={tab.match} accessibilityRole="button" accessibilityLabel={tab.label} style={styles.item} onPress={() => go(tab.href)}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? theme.colors.primary : theme.colors.textSubtle}
              />
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { width: '100%', alignItems: 'center' },
  hostWeb: {
    position: 'fixed' as unknown as 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    alignSelf: 'center',
    paddingTop: 8,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.colors.surfaceElevated,
    ...shadow('md'),
  },
  centerBtnActive: { transform: [{ scale: 1.06 }] },
  label: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '600' },
  labelActive: { color: theme.colors.primary, fontWeight: '800' },
});
