import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageHeader } from '@/components/PageHeader';
import { TabPage } from '@/components/TabPage';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const GAMES = [
  { id: 'match', icon: 'grid' as const, titleKey: 'minigames.match', descKey: 'minigames.matchDesc' },
  { id: 'quiz', icon: 'help-circle' as const, titleKey: 'minigames.quiz', descKey: 'minigames.quizDesc' },
  { id: 'tap', icon: 'finger-print' as const, titleKey: 'minigames.tap', descKey: 'minigames.tapDesc' },
  { id: 'memory', icon: 'albums' as const, titleKey: 'minigames.memory', descKey: 'minigames.memoryDesc' },
];

export default function MinigamesScreen() {
  const { t } = useLocale();

  return (
    <TabPage contentContainerStyle={styles.page}>
      <PageHeader title={t('minigames.title')} subtitle={t('minigames.sub')} />
      <View style={styles.grid}>
        {GAMES.map((g) => (
          <View key={g.id} style={styles.card}>
            <Ionicons name={g.icon} size={32} color={theme.colors.primaryLight} />
            <Text style={styles.name}>{t(g.titleKey)}</Text>
            <Text style={styles.desc}>{t(g.descKey)}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('minigames.comingSoon')}</Text>
            </View>
          </View>
        ))}
      </View>
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 148,
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 12, flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  badgeText: { color: theme.colors.star, fontSize: 11, fontWeight: '700' },
});
