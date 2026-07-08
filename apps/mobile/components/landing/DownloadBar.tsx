import { View, Text, Pressable, Image, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { launchAppExperience, requestWebFullscreen } from '@/lib/pwa';
import { theme } from '@/constants/theme';

const appIcon = require('@/assets/icon.png');

export const DOWNLOAD_BAR_HEIGHT = 72;

export function DownloadBar() {
  const { t } = useLocale();
  const router = useRouter();

  const onTry = () => {
    void launchAppExperience((path) => {
      requestWebFullscreen();
      router.push(path as '/app');
    });
  };

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Image source={appIcon} style={styles.brandIcon} />
          <Text style={styles.logo}>{t('appName')}</Text>
          <Text style={styles.badge}>{t('landing.pwaBadge')}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.tryBtn} onPress={onTry}>
            <Ionicons name="play" size={18} color={theme.colors.onPrimary} />
            <Text style={styles.tryText}>{t('landing.tryWeb')}</Text>
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
  tryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tryText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
