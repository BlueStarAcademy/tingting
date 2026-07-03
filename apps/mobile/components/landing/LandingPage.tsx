import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DownloadBar, DOWNLOAD_BAR_HEIGHT } from '@/components/landing/DownloadBar';
import { AndroidDownloadCard } from '@/components/landing/AndroidDownloadCard';
import { PremiumButton } from '@/components/PremiumButton';
import { GradientBackground } from '@/components/GradientBackground';
import { useLocale } from '@/hooks/useLocale';
import { usePublicConfig } from '@/lib/app-config';
import { theme } from '@/constants/theme';

const FEATURES = [
  { icon: 'map-outline' as const, key: 'map' },
  { icon: 'camera-outline' as const, key: 'photos' },
  { icon: 'navigate-outline' as const, key: 'quest' },
  { icon: 'game-controller-outline' as const, key: 'games' },
  { icon: 'footsteps-outline' as const, key: 'steps' },
  { icon: 'people-outline' as const, key: 'groups' },
] satisfies { icon: keyof typeof Ionicons.glyphMap; key: string }[];

export function LandingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { apkDownloadUrl } = usePublicConfig();
  const hasApk = Boolean(apkDownloadUrl);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <View style={styles.root}>
      <DownloadBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GradientBackground>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>{t('landing.heroEyebrow')}</Text>
            <Text style={styles.heroTitle}>{t('appName')}</Text>
            <Text style={styles.heroSub}>{t('auth.tagline')}</Text>
            <Text style={styles.heroDesc}>{t('landing.heroDesc')}</Text>
            {hasApk ? (
              <View style={styles.downloadBlock}>
                <Text style={styles.downloadTitle}>{t('landing.downloadTitle')}</Text>
                <Text style={styles.downloadDesc}>{t('landing.downloadSectionDesc')}</Text>
                <AndroidDownloadCard downloadUrl={apkDownloadUrl} />
              </View>
            ) : null}
            <View style={styles.heroCtas}>
              <PremiumButton
                title={t('landing.tryWeb')}
                onPress={() => router.push('/app')}
                variant={hasApk ? 'outline' : 'primary'}
                style={styles.ctaBtn}
              />
            </View>
          </View>
        </GradientBackground>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('landing.featuresTitle')}</Text>
          <View style={styles.grid}>
            {FEATURES.map(({ icon, key }) => (
              <View key={key} style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name={icon} size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.cardTitle}>{t(`landing.features.${key}.title` as 'landing.features.map.title')}</Text>
                <Text style={styles.cardDesc}>{t(`landing.features.${key}.desc` as 'landing.features.map.desc')}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionAlt}>
          <Text style={styles.sectionTitle}>{t('landing.howTitle')}</Text>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step}</Text>
              </View>
              <Text style={styles.stepText}>{t(`landing.steps.${step}` as 'landing.steps.1')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('landing.footer')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingTop: DOWNLOAD_BAR_HEIGHT + 8,
    paddingBottom: 48,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 56,
    alignItems: 'center',
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.teal,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 8,
  },
  heroDesc: {
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  downloadBlock: {
    marginTop: 28,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 8,
  },
  downloadTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  downloadDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroCtas: {
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  ctaBtn: {
    maxWidth: 320,
    width: '100%',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  sectionAlt: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: theme.colors.surfaceElevated,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  card: {
    width: 280,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMuted,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: theme.colors.onPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    paddingTop: 4,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textSubtle,
  },
});
