import { View, Text, Image, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { APK_DOWNLOAD_URL, getApkQrImageUrl, openApkDownload } from '@/lib/app-config';
import { theme } from '@/constants/theme';

interface Props {
  variant?: 'hero' | 'section';
}

export function ApkDownloadCard({ variant = 'hero' }: Props) {
  const { t } = useLocale();

  if (!APK_DOWNLOAD_URL) return null;

  const qrSize = variant === 'hero' ? 200 : 168;
  const qrUri = getApkQrImageUrl(APK_DOWNLOAD_URL, qrSize);

  const handleDownload = () => {
    if (Platform.OS !== 'web') {
      Linking.openURL(APK_DOWNLOAD_URL);
      return;
    }
    openApkDownload();
  };

  return (
    <View style={[styles.card, variant === 'section' && styles.cardSection]}>
      <View style={styles.qrWrap}>
        <Image
          source={{ uri: qrUri }}
          style={[styles.qr, { width: qrSize, height: qrSize }]}
          accessibilityLabel={t('landing.qrLabel')}
        />
      </View>
      <Text style={styles.qrHint}>{t('landing.qrHint')}</Text>
      <Text style={styles.qrDesc}>{t('landing.qrDesc')}</Text>
      {variant === 'hero' ? (
        <PremiumButton
          title={t('landing.downloadAndroid')}
          onPress={handleDownload}
          fullWidth
          style={styles.downloadBtn}
        />
      ) : (
        <Pressable style={styles.downloadPressable} onPress={handleDownload}>
          <Ionicons name="logo-android" size={22} color={theme.colors.onPrimary} />
          <Text style={styles.downloadPressableText}>{t('landing.downloadAndroid')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 12,
    marginTop: 8,
  },
  cardSection: {
    maxWidth: 360,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'center',
  },
  qrWrap: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#1A2B3D',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  qr: {
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  qrHint: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  qrDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  downloadBtn: {
    marginTop: 4,
  },
  downloadPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  downloadPressableText: {
    color: theme.colors.onPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
});
