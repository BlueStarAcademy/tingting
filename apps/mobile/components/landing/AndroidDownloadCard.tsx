import { View, Text, Image, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { getDownloadQrImageUrl, openDownloadUrl } from '@/lib/app-config';
import { theme } from '@/constants/theme';

interface Props {
  downloadUrl: string;
}

const QR_SIZE = 180;

export function AndroidDownloadCard({ downloadUrl }: Props) {
  const { t } = useLocale();

  if (!downloadUrl) return null;

  const qrUri = getDownloadQrImageUrl(downloadUrl, QR_SIZE);

  const handleDownload = () => {
    if (Platform.OS !== 'web') {
      Linking.openURL(downloadUrl);
      return;
    }
    openDownloadUrl(downloadUrl);
  };

  return (
    <View style={styles.card}>
      <View style={styles.platformBadge}>
        <Ionicons name="logo-android" size={16} color={theme.colors.teal} />
        <Text style={styles.platformBadgeText}>{t('landing.downloadBadge')}</Text>
      </View>
      <View style={styles.qrWrap}>
        <Image
          source={{ uri: qrUri }}
          style={styles.qr}
          accessibilityLabel={t('landing.qrLabel')}
        />
      </View>
      <Text style={styles.qrHint}>{t('landing.qrHint')}</Text>
      <Text style={styles.qrDesc}>{t('landing.qrDesc')}</Text>
      <Pressable style={styles.downloadBtn} onPress={handleDownload}>
        <Ionicons name="logo-android" size={20} color={theme.colors.onPrimary} />
        <Text style={styles.downloadBtnText}>{t('landing.downloadAndroid')}</Text>
      </Pressable>
      <View style={styles.installGuide}>
        <View style={styles.guideHeader}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.teal} />
          <Text style={styles.guideTitle}>{t('landing.installGuideTitle')}</Text>
        </View>
        <Text style={styles.guideStep}>{t('landing.installStep1')}</Text>
        <Text style={styles.guideStep}>{t('landing.installStep2')}</Text>
        <Text style={styles.guideStep}>{t('landing.installStep3')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.tealSoft,
  },
  platformBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.teal,
  },
  qrWrap: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qr: {
    width: QR_SIZE,
    height: QR_SIZE,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  qrHint: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  qrDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  downloadBtnText: {
    color: theme.colors.onPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  installGuide: {
    width: '100%',
    marginTop: 8,
    backgroundColor: theme.colors.tealSoft,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.teal,
  },
  guideStep: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    paddingLeft: 4,
  },
});
