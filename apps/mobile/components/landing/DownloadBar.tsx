import { View, Text, Pressable, Image, Linking, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { openDownloadUrl, usePublicConfig } from '@/lib/app-config';
import { theme } from '@/constants/theme';

const appIcon = require('@/assets/icon.png');

export const DOWNLOAD_BAR_HEIGHT = 72;

export function DownloadBar() {
  const { t } = useLocale();
  const router = useRouter();
  const { apkDownloadUrl, loaded } = usePublicConfig();
  const hasApk = apkDownloadUrl.length > 0;

  const openAndroid = () => {
    if (Platform.OS !== 'web') {
      Linking.openURL(apkDownloadUrl);
      return;
    }
    openDownloadUrl(apkDownloadUrl);
  };

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Image source={appIcon} style={styles.brandIcon} />
          <Text style={styles.logo}>{t('appName')}</Text>
          {hasApk ? <Text style={styles.badge}>{t('landing.downloadBadge')}</Text> : null}
        </View>

        <View style={styles.actions}>
          {hasApk ? (
            <Pressable style={styles.downloadBtn} onPress={openAndroid}>
              <Ionicons name="logo-android" size={20} color={theme.colors.onPrimary} />
              <Text style={styles.downloadText}>{t('landing.downloadAndroid')}</Text>
            </Pressable>
          ) : loaded ? (
            <Text style={styles.comingSoon}>{t('landing.apkComingSoon')}</Text>
          ) : null}

          <Pressable style={styles.webBtn} onPress={() => router.push('/app')}>
            <Ionicons name="globe-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.webText}>{t('landing.tryWeb')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: theme.colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...(Platform.OS === 'web'
      ? ({ position: 'fixed' } as object)
      : null),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: DOWNLOAD_BAR_HEIGHT,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.teal,
    backgroundColor: theme.colors.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  downloadText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  webText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  comingSoon: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
