import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAdminProfile } from '@tingting/shared';
import { StarChip } from '@/components/StarChip';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { useAuth } from '@/hooks/useAuth';
import { useLogoutConfirm } from '@/hooks/useLogoutConfirm';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';
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
  const { profile } = useAuth();
  const { requestLogout } = useLogoutConfirm();
  const { t } = useLocale();
  const [unreadCount, setUnreadCount] = useState(0);
  const narrow = contentWidth < 380;
  const label = title ?? t('appName');

  const loadUnread = useCallback(async () => {
    if (!profile) {
      setUnreadCount(0);
      return;
    }
    setUnreadCount(await api.getUnreadMailboxCount());
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadUnread();
    }, [loadUnread])
  );

  return (
    <View style={[styles.container, styles.headerShell, { paddingTop: insets.top, width: contentWidth, maxWidth: contentWidth }]}>
      <View style={styles.row}>
        {showBack ? (
          <PremiumIconButton
            icon="arrow-back"
            onPress={() => safeBack(router)}
            accessibilityLabel={t('common.back')}
          />
        ) : null}

        {!narrow || showBack ? (
          <View style={[styles.titleWrap, showBack ? styles.titleWrapCenter : styles.titleWrapStart]}>
            <Text style={styles.title} numberOfLines={1}>
              {label}
            </Text>
            {onEditTitle ? (
              <PremiumIconButton
                icon="pencil"
                size="sm"
                onPress={onEditTitle}
                color={theme.colors.primaryLight}
                accessibilityLabel={t('group.editPhoto')}
              />
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
            {profile && isAdminProfile(profile) ? (
              <Pressable
                style={styles.adminBtn}
                onPress={() => router.push('/admin' as Href)}
                accessibilityLabel={t('header.admin')}
              >
                <Text style={styles.adminBtnText}>{t('header.admin')}</Text>
              </Pressable>
            ) : null}
            <PremiumIconButton
              icon="mail-outline"
              onPress={() => router.push('/mailbox' as Href)}
              badge={unreadCount}
              accessibilityLabel={t('header.mailbox')}
            />
            <PremiumIconButton
              icon="settings-outline"
              onPress={() => router.push('/settings' as Href)}
              accessibilityLabel={t('header.settings')}
            />
            <PremiumIconButton
              icon="log-out-outline"
              onPress={requestLogout}
              accessibilityLabel={t('header.logout')}
            />
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
    zIndex: 10,
  },
  headerShell: {
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
    color: theme.colors.primaryDark,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
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
  adminBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(79,107,149,0.12)',
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  adminBtnText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
});
