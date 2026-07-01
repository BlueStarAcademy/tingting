import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StarChip } from '@/components/StarChip';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { glassSurface, iconButton } from '@/lib/ui';
import { theme } from '@/constants/theme';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showActions?: boolean;
  onEditTitle?: () => void;
}

export function AppHeader({ title, showBack, showActions = true, onEditTitle }: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentWidth = useContentWidth();
  const { profile, signOut } = useAuth();
  const { t } = useLocale();
  const narrow = contentWidth < 380;
  const label = title ?? t('appName');

  const handleLogout = () => {
    Alert.alert(t('header.logout'), t('header.logoutConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('header.logout'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, glassSurface(), { paddingTop: insets.top, width: contentWidth, maxWidth: contentWidth }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable onPress={() => router.back()} style={iconButton()} accessibilityLabel={t('common.back')}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          </Pressable>
        ) : null}

        {!narrow || showBack ? (
          <View style={[styles.titleWrap, showBack ? styles.titleWrapCenter : styles.titleWrapStart]}>
            <Text style={styles.title} numberOfLines={1}>
              {label}
            </Text>
            {onEditTitle ? (
              <Pressable style={styles.titleEditBtn} onPress={onEditTitle} hitSlop={8}>
                <Ionicons name="pencil" size={13} color={theme.colors.primaryLight} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.titleSpacer} />
        )}

        {showActions ? (
          <View style={styles.actions}>
            {profile ? (
              <StarChip
                compact
                stars={profile.stars}
                onPress={() => router.push('/(tabs)/shop' as Href)}
              />
            ) : null}
            <Pressable
              onPress={() => router.push('/settings' as Href)}
              style={iconButton()}
              accessibilityLabel={t('header.settings')}
            >
              <Ionicons name="settings-outline" size={18} color={theme.colors.text} />
            </Pressable>
            <Pressable onPress={handleLogout} style={iconButton()} accessibilityLabel={t('header.logout')}>
              <Ionicons name="log-out-outline" size={18} color={theme.colors.text} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.iconSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    backgroundColor: theme.colors.headerBg,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: theme.spacing.sm,
    gap: 6,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 6,
  },
  titleWrapStart: { justifyContent: 'flex-start', marginLeft: theme.spacing.xs },
  titleWrapCenter: { justifyContent: 'center' },
  title: {
    flexShrink: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  titleEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.tint.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  titleSpacer: { flex: 1, minWidth: 0 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
    gap: 6,
  },
  iconSpacer: { width: 38, height: 38 },
});
