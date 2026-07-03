import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useMinigameListProgress } from '@/hooks/useMinigameProgress';
import { getCurrentStage } from '@/lib/minigames/stages';
import type { MinigameId } from '@/lib/minigames/stages';
import { MINIGAME_DAILY_STAR_CAP, MINIGAME_MAX_STAGE } from '@tingting/shared';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

const GAMES: Array<{ id: MinigameId; icon: 'grid' | 'help-circle' | 'water' | 'albums' | 'swap-vertical' | 'keypad'; color: string; bgColor: string; titleKey: string; descKey: string }> = [
  { id: 'match', icon: 'grid', color: '#5B8DEF', bgColor: 'rgba(91,141,239,0.12)', titleKey: 'minigames.match', descKey: 'minigames.matchDesc' },
  { id: 'quiz', icon: 'help-circle', color: '#E8A830', bgColor: 'rgba(232,168,48,0.12)', titleKey: 'minigames.quiz', descKey: 'minigames.quizDesc' },
  { id: 'slime', icon: 'water', color: '#5BA392', bgColor: 'rgba(91,163,146,0.12)', titleKey: 'minigames.slime', descKey: 'minigames.slimeDesc' },
  { id: 'memory', icon: 'albums', color: '#D4845A', bgColor: 'rgba(212,132,90,0.12)', titleKey: 'minigames.memory', descKey: 'minigames.memoryDesc' },
  { id: 'guess', icon: 'swap-vertical', color: '#7A6FDE', bgColor: 'rgba(122,111,222,0.12)', titleKey: 'minigames.guess', descKey: 'minigames.guessDesc' },
  { id: 'code', icon: 'keypad', color: '#D97070', bgColor: 'rgba(217,112,112,0.12)', titleKey: 'minigames.code', descKey: 'minigames.codeDesc' },
];

export default function MinigamesScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const contentWidth = useContentWidth();
  const { progress, daily, loading } = useMinigameListProgress();

  return (
    <View style={[styles.container, { width: contentWidth, maxWidth: contentWidth }]}>
      <ScreenBackground />
      {!loading && daily ? (
        <View style={styles.stickyHeader}>
          <View style={styles.dailyBanner}>
            <Ionicons name="star" size={16} color={theme.colors.star} />
            <Text style={styles.dailyText}>
              {t('minigames.dailyStars', { earned: daily.starsEarnedToday, cap: MINIGAME_DAILY_STAR_CAP })}
            </Text>
          </View>
        </View>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.list}>
          {GAMES.map((g) => {
            const clearedStage = progress?.[g.id].clearedStage ?? 0;
            const currentStage = getCurrentStage(clearedStage);
            const isMaxed = clearedStage >= MINIGAME_MAX_STAGE;
            return (
              <Pressable
                key={g.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/minigames/${g.id}` as Href)}
              >
                <View style={[styles.iconWrap, { backgroundColor: g.bgColor }]}>
                  <Ionicons name={g.icon} size={26} color={g.color} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={1}>{t(g.titleKey)}</Text>
                    <View style={[styles.stagePill, isMaxed && styles.stagePillMaxed]}>
                      <Text style={[styles.stagePillText, isMaxed && styles.stagePillTextMaxed]}>
                        {currentStage}/{MINIGAME_MAX_STAGE}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.desc} numberOfLines={1}>{t(g.descKey)}</Text>
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${(clearedStage / MINIGAME_MAX_STAGE) * 100}%`, backgroundColor: g.color }]} />
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.textSubtle} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, overflow: 'hidden' },
  stickyHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + MAIN_TAB_BAR_HEIGHT,
  },
  list: { gap: theme.spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#334D6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  stagePill: {
    backgroundColor: theme.colors.tint.soft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stagePillMaxed: {
    backgroundColor: theme.colors.starGlow,
    borderColor: theme.colors.borderGold,
  },
  stagePillText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  stagePillTextMaxed: {
    color: theme.colors.star,
  },
  desc: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
