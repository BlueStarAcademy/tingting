import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ScreenBackground } from '@/components/ScreenBackground';
import { StarIcon } from '@/components/StarAmount';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useMinigameListProgress } from '@/hooks/useMinigameProgress';
import { api } from '@/lib/api';
import { buildDailyBetQuestions } from '@/lib/minigame-bets';
import type { MinigameBetQuestion, MinigameBetTicket } from '@/lib/minigame-bets';
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

type MinigameTab = 'games' | 'bets';

function buildTicketQuestion(questionId: string): MinigameBetQuestion | undefined {
  return buildDailyBetQuestions(questionId.slice(0, 10)).find((question) => question.id === questionId);
}

export default function MinigamesScreen() {
  const { t, locale } = useLocale();
  const { refresh } = useAuth();
  const router = useRouter();
  const contentWidth = useContentWidth();
  const { progress, daily, loading } = useMinigameListProgress();
  const [tab, setTab] = useState<MinigameTab>('games');
  const [betLoading, setBetLoading] = useState(false);
  const [questions, setQuestions] = useState<MinigameBetQuestion[]>([]);
  const [tickets, setTickets] = useState<MinigameBetTicket[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [stakes, setStakes] = useState<Record<string, string>>({});

  const ticketsByQuestion = useMemo(() => {
    const map: Record<string, MinigameBetTicket> = {};
    tickets.forEach((ticket) => {
      if (!map[ticket.questionId]) map[ticket.questionId] = ticket;
    });
    return map;
  }, [tickets]);

  const resultTickets = useMemo(
    () =>
      tickets
        .filter((ticket) => ticket.status !== 'pending')
        .sort((a, b) => (b.settledAt ?? b.placedAt).localeCompare(a.settledAt ?? a.placedAt)),
    [tickets],
  );

  const loadBets = async () => {
    setBetLoading(true);
    try {
      const state = await api.getMinigameBetState();
      setQuestions(state.questions);
      setTickets(state.tickets);
      await refresh();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBetLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'bets') void loadBets();
  }, [tab]);

  const placeBet = async (question: MinigameBetQuestion) => {
    const choiceId = selectedChoices[question.id] ?? question.choices[0]?.id;
    const stake = Number(stakes[question.id] ?? '1');
    if (!choiceId) return;
    try {
      await api.placeMinigameBet(question.id, choiceId, stake);
      setStakes((prev) => ({ ...prev, [question.id]: '1' }));
      await loadBets();
      Alert.alert(t('common.alert'), t('minigames.betPlaced'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    }
  };

  const getTicketQuestion = (ticket: MinigameBetTicket) => {
    return buildTicketQuestion(ticket.questionId);
  };

  const getTicketChoiceLabel = (ticket: MinigameBetTicket) => {
    const question = getTicketQuestion(ticket);
    const choice = question?.choices.find((item) => item.id === ticket.choiceId);
    if (!choice) return ticket.choiceId;
    return locale === 'en' ? choice.labelEn : choice.labelKo;
  };

  const claimBetReward = async (ticket: MinigameBetTicket) => {
    try {
      await api.claimMinigameBetReward(ticket.id);
      await loadBets();
      Alert.alert(t('common.alert'), t('minigames.betClaimed', { amount: ticket.payout ?? ticket.stake * 2 }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  return (
    <View style={[styles.container, { width: contentWidth, maxWidth: contentWidth }]}>
      <ScreenBackground />
      {!loading && daily ? (
        <View style={styles.stickyHeader}>
          <View style={styles.dailyBanner}>
            <StarIcon />
            <Text style={styles.dailyText}>
              {t('minigames.dailyStars', { earned: daily.starsEarnedToday, cap: MINIGAME_DAILY_STAR_CAP })}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.tabRow}>
        {(['games', 'bets'] as const).map((item) => (
          <Pressable
            key={item}
            style={[styles.tabButton, tab === item && styles.tabButtonActive]}
            onPress={() => setTab(item)}
          >
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item === 'games' ? t('minigames.tabGames') : t('minigames.tabBets')}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {tab === 'games' ? (
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
        ) : (
          <View style={styles.list}>
            <View style={styles.betHeader}>
              <View>
                <Text style={styles.betHeaderTitle}>{t('minigames.betTitle')}</Text>
                <Text style={styles.betHeaderDesc}>{t('minigames.betDesc')}</Text>
              </View>
            </View>
            {betLoading ? <Text style={styles.desc}>{t('common.loading')}</Text> : null}
            {resultTickets.length > 0 ? (
              <View style={styles.resultPanel}>
                <Text style={styles.resultPanelTitle}>{t('minigames.betResultsTitle')}</Text>
                {resultTickets.slice(0, 3).map((ticket) => {
                  const question = getTicketQuestion(ticket);
                  const title = question ? (locale === 'en' ? question.titleEn : question.titleKo) : ticket.questionId;
                  const claimable = ticket.status === 'won' && !ticket.claimedAt;
                  return (
                    <View key={ticket.id} style={styles.resultRow}>
                      <View style={styles.resultMain}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.resultMeta} numberOfLines={1}>
                          {getTicketChoiceLabel(ticket)} · {ticket.stake}
                        </Text>
                      </View>
                      <View style={[styles.betStatusPill, ticket.status === 'won' && styles.betStatusWon, ticket.status === 'lost' && styles.betStatusLost]}>
                        <Text style={[styles.betStatusPillText, ticket.status === 'won' && styles.betStatusWonText, ticket.status === 'lost' && styles.betStatusLostText]}>
                          {t(`minigames.betStatusShort.${ticket.status}`)}
                        </Text>
                      </View>
                      {claimable ? (
                        <Pressable style={styles.claimBtn} onPress={() => claimBetReward(ticket)}>
                          <Text style={styles.claimBtnText}>{t('minigames.betClaim')}</Text>
                        </Pressable>
                      ) : ticket.status === 'won' ? (
                        <Text style={styles.claimedText}>{t('minigames.betClaimedShort')}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
            {questions.map((question) => {
              const ticket = ticketsByQuestion[question.id];
              const title = locale === 'en' ? question.titleEn : question.titleKo;
              return (
                <View key={question.id} style={styles.betCard}>
                  <View style={styles.betTopRow}>
                    <View style={styles.betTitleCol}>
                      <Text style={styles.betQuestionTitle} numberOfLines={1}>{title}</Text>
                      <Text style={styles.betResolveText}>{question.resolveDate}</Text>
                    </View>
                    {ticket ? (
                      <View style={[styles.betStatusPill, ticket.status === 'won' && styles.betStatusWon, ticket.status === 'lost' && styles.betStatusLost]}>
                        <Text style={[styles.betStatusPillText, ticket.status === 'won' && styles.betStatusWonText, ticket.status === 'lost' && styles.betStatusLostText]}>
                          {t(`minigames.betStatusShort.${ticket.status}`)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.betControlRow}>
                    <View style={styles.choiceRow}>
                      {question.choices.map((choice) => {
                        const choiceLabel = locale === 'en' ? choice.labelEn : choice.labelKo;
                        const active = (selectedChoices[question.id] ?? question.choices[0]?.id) === choice.id;
                        return (
                          <Pressable
                            key={choice.id}
                            style={[styles.choiceBtn, active && styles.choiceBtnActive, Boolean(ticket) && styles.choiceBtnDisabled]}
                            disabled={Boolean(ticket)}
                            onPress={() => setSelectedChoices((prev) => ({ ...prev, [question.id]: choice.id }))}
                          >
                            <Text style={[styles.choiceText, active && styles.choiceTextActive]} numberOfLines={1}>{choiceLabel}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {ticket ? (
                      <Text style={styles.betTicket} numberOfLines={1}>
                        {t(`minigames.betStatus.${ticket.status}`, {
                          stake: ticket.stake,
                          payout: ticket.payout ?? 0,
                        })}
                      </Text>
                    ) : (
                      <View style={styles.betActionRow}>
                      <TextInput
                        value={stakes[question.id] ?? '1'}
                        onChangeText={(value) => setStakes((prev) => ({ ...prev, [question.id]: value.replace(/\D/g, '').slice(0, 2) }))}
                        keyboardType="number-pad"
                        style={styles.stakeInput}
                        placeholder="1"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                      <Pressable style={styles.betSubmit} onPress={() => placeBet(question)}>
                        <Text style={styles.betSubmitText}>{t('minigames.betSubmit')}</Text>
                      </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  tabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: theme.colors.primaryDark, fontWeight: '900' },
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
  betHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
  },
  betHeaderTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  betHeaderDesc: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  betCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    shadowColor: '#334D6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultPanel: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    padding: 12,
    gap: 8,
  },
  resultPanelTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
  },
  resultMain: { flex: 1, minWidth: 0 },
  resultTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  resultMeta: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  claimBtn: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  claimedText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  betTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  betTitleCol: { flex: 1, minWidth: 0 },
  betQuestionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  betResolveText: {
    color: theme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  betStatusPill: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  betStatusWon: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
  },
  betStatusLost: {
    backgroundColor: 'rgba(217,112,112,0.12)',
    borderColor: 'rgba(217,112,112,0.35)',
  },
  betStatusPillText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },
  betStatusWonText: { color: theme.colors.success },
  betStatusLostText: { color: theme.colors.error },
  betControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceRow: { flex: 1, flexDirection: 'row', gap: 6, minWidth: 0 },
  choiceBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: theme.colors.surface,
  },
  choiceBtnActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  choiceBtnDisabled: { opacity: 0.75 },
  choiceText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '900' },
  choiceTextActive: { color: theme.colors.primaryDark },
  betActionRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stakeInput: {
    width: 46,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
  },
  betSubmit: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  betSubmitText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  betTicket: {
    maxWidth: 96,
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.full,
    paddingVertical: 7,
    paddingHorizontal: 9,
    overflow: 'hidden',
  },
});
