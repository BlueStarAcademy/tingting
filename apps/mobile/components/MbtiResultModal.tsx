import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMbtiTypeInfo } from '@/lib/mbti-types';
import { useLocale } from '@/hooks/useLocale';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { AppModal } from '@/components/AppModal';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  mbti: string;
  onClose: () => void;
  onRetake?: () => void;
}

export function MbtiResultModal({ visible, mbti, onClose, onRetake }: Props) {
  const { t, locale } = useLocale();
  const lang = locale === 'ko' ? 'ko' : 'en';
  const info = getMbtiTypeInfo(mbti);

  return (
    <AppModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      variant="fullscreen"
      transparent={false}
      dismissOnBackdrop={false}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.mbtiResult')}</Text>
          <PremiumIconButton
            icon="close"
            onPress={onClose}
            variant="soft"
            color={theme.colors.textMuted}
            accessibilityLabel={t('header.cancel')}
          />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeCode}>{mbti.toUpperCase()}</Text>
            <Text style={styles.typeTitle}>{info.title[lang]}</Text>
          </View>

          <Text style={styles.sectionLabel}>{t('profile.mbtiTraits')}</Text>
          <View style={styles.traitsRow}>
            {info.traits[lang].map((trait) => (
              <View key={trait} style={styles.traitChip}>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>{t('profile.mbtiDescription')}</Text>
          <Text style={styles.description}>{info.description[lang]}</Text>
        </ScrollView>

        <View style={styles.footer}>
          {onRetake ? (
            <PremiumButton title={t('profile.mbtiRetake')} onPress={onRetake} variant="outline" style={styles.footerBtn} />
          ) : null}
          <PremiumButton title={t('profile.mbtiConfirm')} onPress={onClose} style={styles.footerBtn} />
        </View>
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  body: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
  typeBadge: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  typeCode: { color: theme.colors.primaryLight, fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  typeTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  sectionLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traitChip: {
    backgroundColor: theme.colors.tint.medium,
    borderRadius: theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  traitText: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '700' },
  description: { color: theme.colors.text, fontSize: 16, lineHeight: 26 },
  footer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceLight,
    flexDirection: 'row',
  },
  footerBtn: { flex: 1 },
});
