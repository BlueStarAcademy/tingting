import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { TabPage } from '@/components/TabPage';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameListProgress } from '@/hooks/useMinigameProgress';
import { getCurrentStage } from '@/lib/minigames/stages';
import type { MinigameId } from '@/lib/minigames/stages';
import { MINIGAME_DAILY_STAR_CAP, MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

const GAMES: Array<{ id: MinigameId; icon: 'grid' | 'help-circle' | 'finger-print' | 'albums'; titleKey: string; descKey: string }> = [
  { id: 'match', icon: 'grid', titleKey: 'minigames.match', descKey: 'minigames.matchDesc' },
  { id: 'quiz', icon: 'help-circle', titleKey: 'minigames.quiz', descKey: 'minigames.quizDesc' },
  { id: 'tap', icon: 'finger-print', titleKey: 'minigames.tap', descKey: 'minigames.tapDesc' },
  { id: 'memory', icon: 'albums', titleKey: 'minigames.memory', descKey: 'minigames.memoryDesc' },
];

export default function MinigamesScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const { progress, daily, loading } = useMinigameListProgress();

  return (
    <TabPage contentContainerStyle={styles.page}>
      {!loading && daily ? (
        <View style={styles.dailyBanner}>
          <Ionicons name="star" size={16} color={theme.colors.star} />
          <Text style={styles.dailyText}>
            {t('minigames.dailyStars', { earned: daily.starsEarnedToday, cap: MINIGAME_DAILY_STAR_CAP })}
          </Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        {GAMES.map((g) => {
          const clearedStage = progress?.[g.id].clearedStage ?? 0;
          const currentStage = getCurrentStage(clearedStage);
          return (
            <Pressable
              key={g.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/minigames/${g.id}` as Href)}
            >
              <Ionicons name={g.icon} size={32} color={theme.colors.primaryLight} />
              <Text style={styles.name}>{t(g.titleKey)}</Text>
              <Text style={styles.desc}>{t(g.descKey)}</Text>
              <View style={styles.metaRow}>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>
                    {t('minigames.stageLabel', { current: currentStage, max: MINIGAME_MAX_STAGE })}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('minigames.play')}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.md },
  dailyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  dailyText: {
    color: theme.colors.star,
    fontSize: 13,
    fontWeight: '700',
  },
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
    minHeight: 160,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 12, flex: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  stageBadge: {
    backgroundColor: theme.colors.tint.soft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stageBadgeText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  badgeText: { color: theme.colors.star, fontSize: 11, fontWeight: '700' },
});
