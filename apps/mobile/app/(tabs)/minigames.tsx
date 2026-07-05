import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { ScreenBackground } from '@/components/ScreenBackground';
import { StarIcon } from '@/components/StarAmount';
import { AppModal } from '@/components/AppModal';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useMinigameListProgress } from '@/hooks/useMinigameProgress';
import { useAdFree } from '@/hooks/useAdFree';
import { getMinigameEffectiveCap } from '@/lib/minigames/progress';
import { api } from '@/lib/api';
import {
  buildDailyBetQuestions,
  calculateMinigameBetPayout,
  canPlaceMinigameBet,
  canUnlockMinigameBetExtraSlot,
  formatMinigameBetResolveAt,
  getBetCardTitle,
  getDemoWinningChoiceId,
  getMinigameBetRemainingSlots,
  hasMinigameBetResultReady,
  isMinigameBetAwaitingResult,
  MINIGAME_BET_MAX_STAKE,
  MINIGAME_BET_MIN_STAKE,
  type MinigameBetDailyState,
  type MinigameBetPool,
} from '@/lib/minigame-bets';
import type { MinigameBetChoice, MinigameBetQuestion, MinigameBetTicket } from '@/lib/minigame-bets';
import type { MinigameId } from '@/lib/minigames/stages';
import { MINIGAME_CAP_AD_EXTENSION, MINIGAME_DAILY_STAR_CAP } from '@tingting/shared';
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

function clampBetStake(value: number, maxStars?: number): number {
  const available = maxStars == null ? undefined : Math.max(0, Math.floor(maxStars));
  let stake = Math.floor(value);
  if (!Number.isFinite(stake)) stake = MINIGAME_BET_MIN_STAKE;
  stake = Math.max(MINIGAME_BET_MIN_STAKE, Math.min(MINIGAME_BET_MAX_STAKE, stake));
  if (available != null) {
    if (available < MINIGAME_BET_MIN_STAKE) return 0;
    stake = Math.min(stake, available);
  }
  return stake;
}

function projectPoolWithStake(pool: MinigameBetPool, choiceId: string, stake: number): MinigameBetPool {
  return {
    ...pool,
    totalStars: pool.totalStars + stake,
    byChoice: {
      ...pool.byChoice,
      [choiceId]: (pool.byChoice[choiceId] ?? 0) + stake,
    },
  };
}

function getChoiceLabel(choice: MinigameBetChoice, locale: string): string {
  return locale === 'en' ? choice.labelEn : choice.labelKo;
}

function getChoicePercent(pool: MinigameBetPool | undefined, choiceId: string): number {
  if (!pool || pool.totalStars <= 0) return 50;
  return Math.round(((pool.byChoice[choiceId] ?? 0) / pool.totalStars) * 100);
}

function getQuestionTickets(tickets: MinigameBetTicket[], questionId: string): MinigameBetTicket[] {
  return tickets
    .filter((ticket) => ticket.questionId === questionId)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

function formatResolveDateTime(resolveDate: string, locale: string): string {
  return formatMinigameBetResolveAt(resolveDate, locale === 'en' ? 'en' : 'ko');
}

function getBetActionLabel(
  ticket: MinigameBetTicket | undefined,
  now: Date,
  t: (key: string) => string,
): string {
  if (!ticket) return t('minigames.betPredict');
  if (isMinigameBetAwaitingResult(ticket, now)) return t('minigames.betViewPick');
  return t('minigames.betViewResult');
}

export default function MinigamesScreen() {
  const { t, locale } = useLocale();
  const { refresh, profile } = useAuth();
  const { watchAd } = useAdFree();
  const router = useRouter();
  const contentWidth = useContentWidth();
  const { daily, loading, refresh: refreshDaily } = useMinigameListProgress();

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshDaily({ silent: true });
    }, [refresh, refreshDaily]),
  );

  const [tab, setTab] = useState<MinigameTab>('games');
  const [betLoading, setBetLoading] = useState(false);
  const [betSubmitting, setBetSubmitting] = useState(false);
  const [betAdUnlocking, setBetAdUnlocking] = useState(false);
  const [betDaily, setBetDaily] = useState<MinigameBetDailyState | null>(null);
  const [betFeedback, setBetFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [questions, setQuestions] = useState<MinigameBetQuestion[]>([]);
  const [tickets, setTickets] = useState<MinigameBetTicket[]>([]);
  const [pools, setPools] = useState<Record<string, MinigameBetPool>>({});
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [stakes, setStakes] = useState<Record<string, string>>({});
  const [infoQuestion, setInfoQuestion] = useState<MinigameBetQuestion | null>(null);
  const [now, setNow] = useState(() => new Date());
  const predictionOpen = canPlaceMinigameBet(now);
  const availableStars = Math.max(0, Math.floor(Number(profile?.stars) || 0));
  const maxBetStake = Math.min(MINIGAME_BET_MAX_STAKE, availableStars);
  const canAffordBet = availableStars >= MINIGAME_BET_MIN_STAKE;
  const betSlots = betDaily ? getMinigameBetRemainingSlots(betDaily) : null;
  const showBetExtraAd = Boolean(
    predictionOpen && betDaily && canUnlockMinigameBetExtraSlot(betDaily),
  );

  const ticketsByQuestion = useMemo(() => {
    const map: Record<string, MinigameBetTicket> = {};
    tickets.forEach((ticket) => {
      if (!map[ticket.questionId]) map[ticket.questionId] = ticket;
    });
    return map;
  }, [tickets]);

  const loadBets = async (silent = false) => {
    if (!silent) setBetLoading(true);
    try {
      const state = await api.getMinigameBetState();
      const nextBetDaily = await api.getMinigameBetDailyState();
      setQuestions(state.questions);
      setTickets(state.tickets);
      setPools(state.pools);
      setBetDaily(nextBetDaily);
      await refresh();
    } catch (e: unknown) {
      if (!silent) Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      if (!silent) setBetLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'bets') void loadBets();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'bets') return;
    const timer = setInterval(() => {
      setNow(new Date());
      void loadBets(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [tab]);

  useEffect(() => {
    if (!infoQuestion) return;
    setStakes((prev) => ({
      ...prev,
      [infoQuestion.id]: String(
        clampBetStake(Number(prev[infoQuestion.id] ?? String(MINIGAME_BET_MIN_STAKE)), availableStars),
      ),
    }));
  }, [infoQuestion?.id, availableStars]);

  const placeBet = async (question: MinigameBetQuestion) => {
    if (!predictionOpen) {
      const message = t('minigames.betClosed');
      setBetFeedback({ type: 'error', message });
      Alert.alert(t('common.alert'), message);
      return;
    }
    const choiceId = selectedChoices[question.id] ?? question.choices[0]?.id;
    const stake = clampBetStake(Number(stakes[question.id] ?? String(MINIGAME_BET_MIN_STAKE)), availableStars);
    if (!choiceId) {
      const message = t('minigames.betPickChoice');
      setBetFeedback({ type: 'error', message });
      Alert.alert(t('common.alert'), message);
      return;
    }
    if (stake < MINIGAME_BET_MIN_STAKE) {
      const message = t('shop.insufficient');
      setBetFeedback({ type: 'error', message });
      Alert.alert(t('common.error'), message);
      return;
    }
    if (betSubmitting) return;
    setBetSubmitting(true);
    setBetFeedback(null);
    try {
      await api.placeMinigameBet(question.id, choiceId, stake);
      setStakes((prev) => ({ ...prev, [question.id]: '1' }));
      await loadBets();
      const message = t('minigames.betPlaced');
      setBetFeedback({ type: 'success', message });
      Alert.alert(t('common.alert'), message);
      setInfoQuestion(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('shop.insufficient');
      if (message.includes('광고를 시청')) {
        Alert.alert(t('common.alert'), message, [
          { text: t('header.cancel'), style: 'cancel' },
          {
            text: t('ads.watch'),
            onPress: async () => {
              const watched = await watchAd('bet_extra');
              if (!watched) return;
              try {
                await api.unlockExtraBetSlotViaAd();
                await loadBets();
                await placeBet(question);
              } catch (err: unknown) {
                Alert.alert(t('common.error'), err instanceof Error ? err.message : t('group.failed'));
              }
            },
          },
        ]);
      } else {
        setBetFeedback({ type: 'error', message });
        Alert.alert(t('common.error'), message);
      }
    } finally {
      setBetSubmitting(false);
    }
  };

  const adjustBetStake = (questionId: string, delta: number) => {
    setStakes((prev) => {
      const current = clampBetStake(Number(prev[questionId] ?? String(MINIGAME_BET_MIN_STAKE)), availableStars);
      const next = clampBetStake(current + delta, availableStars);
      return { ...prev, [questionId]: String(next) };
    });
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

  const claimBetReward = async (ticket: MinigameBetTicket, withAdBonus = false) => {
    try {
      const result = await api.claimMinigameBetReward(ticket.id, { withAdBonus });
      await loadBets();
      const payout = result.ticket.payout ?? ticket.payout ?? 0;
      const bonus = result.adBonus ?? 0;
      Alert.alert(
        t('common.alert'),
        bonus > 0
          ? t('minigames.betClaimedWithBonus', { amount: payout + bonus, bonus })
          : t('minigames.betClaimed', { amount: payout }),
      );
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const claimBetRewardWithAd = async (ticket: MinigameBetTicket) => {
    const watched = await watchAd('bet_claim_bonus');
    if (!watched) return;
    await claimBetReward(ticket, true);
  };

  const unlockExtraBetViaAd = async () => {
    if (!betDaily || betAdUnlocking) return;
    setBetAdUnlocking(true);
    try {
      const watched = await watchAd('bet_extra');
      if (!watched) return;
      await api.unlockExtraBetSlotViaAd();
      await loadBets();
      Alert.alert(t('common.alert'), t('minigames.betExtraUnlocked'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBetAdUnlocking(false);
    }
  };

  const extendDailyCap = async () => {
    const watched = await watchAd('minigame_cap_extend');
    if (!watched) return;
    try {
      await api.extendMinigameCapViaAd();
      await refreshDaily({ silent: true });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const effectiveCap = daily ? getMinigameEffectiveCap(daily) : MINIGAME_DAILY_STAR_CAP;
  const showCapExtend =
    daily &&
    !daily.capBonusApplied &&
    daily.starsEarnedToday >= MINIGAME_DAILY_STAR_CAP;

  const showBetLoading = betLoading && questions.length === 0;

  return (
    <View style={[styles.container, { width: contentWidth, maxWidth: contentWidth }]}>
      <ScreenBackground />
      {!loading && daily ? (
        <View style={styles.stickyHeader}>
          <View style={styles.dailyBanner}>
            <StarIcon />
            <Text style={styles.dailyText}>
              {t('minigames.dailyStars', { earned: daily.starsEarnedToday, cap: effectiveCap })}
            </Text>
            {showCapExtend ? (
              <Pressable style={styles.capExtendBtn} onPress={extendDailyCap}>
                <Ionicons name="play-circle" size={14} color={theme.colors.primary} />
                <Text style={styles.capExtendText}>
                  {t('minigames.capExtend', { amount: MINIGAME_CAP_AD_EXTENSION })}
                </Text>
              </Pressable>
            ) : null}
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
      {tab === 'bets' ? (
        <View style={[styles.betCommonNotice, !predictionOpen && styles.betCommonNoticeClosed]}>
          <Text
            style={[
              styles.betCommonNoticeText,
              showBetExtraAd && styles.betCommonNoticeTextWithAction,
              !predictionOpen && styles.betCommonNoticeTextClosed,
            ]}
          >
            {predictionOpen
              ? betSlots
                ? t('minigames.betDailyLimit', {
                    remaining: betSlots.remaining,
                    max: betSlots.max,
                  })
                : t('minigames.betPredictWindow')
              : t('minigames.betClosed')}
          </Text>
          {showBetExtraAd ? (
            <Pressable
              style={[styles.betExtraAdBtn, betAdUnlocking && styles.betExtraAdBtnDisabled]}
              disabled={betAdUnlocking}
              onPress={() => void unlockExtraBetViaAd()}
            >
              {betAdUnlocking ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="play-circle" size={14} color={theme.colors.primary} />
                  <Text style={styles.betExtraAdText}>{t('minigames.betWatchAd')}</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {tab === 'games' ? (
          <View style={styles.list}>
            {GAMES.map((g) => (
              <Pressable
                key={g.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/minigames/${g.id}` as Href)}
              >
                <View style={[styles.iconWrap, { backgroundColor: g.bgColor }]}>
                  <Ionicons name={g.icon} size={26} color={g.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name} numberOfLines={1}>{t(g.titleKey)}</Text>
                  <Text style={styles.desc} numberOfLines={1}>{t(g.descKey)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSubtle} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {showBetLoading ? <Text style={styles.desc}>{t('common.loading')}</Text> : null}
            {questions.map((question) => {
              const ticket = ticketsByQuestion[question.id];
              const title = getBetCardTitle(question, locale === 'en' ? 'en' : 'ko');
              const pool = pools[question.id];
              const choices = question.choices.slice(0, 2);
              const leftChoice = choices[0];
              const rightChoice = choices[1];
              const leftPercent = leftChoice ? getChoicePercent(pool, leftChoice.id) : 50;
              const rightPercent = rightChoice ? getChoicePercent(pool, rightChoice.id) : 50;
              const leftPool = leftChoice ? (pool?.byChoice[leftChoice.id] ?? 0) : 0;
              const rightPool = rightChoice ? (pool?.byChoice[rightChoice.id] ?? 0) : 0;
              const leftEstimate = pool && leftChoice
                ? calculateMinigameBetPayout(
                    MINIGAME_BET_MIN_STAKE,
                    leftChoice.id,
                    projectPoolWithStake(pool, leftChoice.id, MINIGAME_BET_MIN_STAKE),
                  )
                : null;
              const rightEstimate = pool && rightChoice
                ? calculateMinigameBetPayout(
                    MINIGAME_BET_MIN_STAKE,
                    rightChoice.id,
                    projectPoolWithStake(pool, rightChoice.id, MINIGAME_BET_MIN_STAKE),
                  )
                : null;
              const resolveDateTime = formatResolveDateTime(question.resolveDate, locale);
              return (
                <View key={question.id} style={styles.betMatchCard}>
                  <View style={styles.betMatchHeader}>
                    <Text style={styles.betQuestionTitle} numberOfLines={2}>{title}</Text>
                    {ticket ? (
                      <View style={[styles.betStatusPill, ticket.status === 'won' && styles.betStatusWon, ticket.status === 'lost' && styles.betStatusLost]}>
                        <Text style={[styles.betStatusPillText, ticket.status === 'won' && styles.betStatusWonText, ticket.status === 'lost' && styles.betStatusLostText]}>
                          {isMinigameBetAwaitingResult(ticket, now)
                            ? t('minigames.betStatusShort.pending')
                            : t(`minigames.betStatusShort.${ticket.status}`)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.betResolveText}>{t('minigames.betResolveAt', { datetime: resolveDateTime })}</Text>
                  {leftChoice && rightChoice ? (
                    <View style={styles.tugGraphCard}>
                      <View style={styles.tugGraphLabels}>
                        <View style={styles.tugGraphSideLabel}>
                          <Text style={styles.tugGraphName} numberOfLines={1}>{getChoiceLabel(leftChoice, locale)}</Text>
                          <View style={styles.betGraphStars}>
                            <StarIcon size={12} />
                            <Text style={styles.betGraphStarsText}>{leftPool}</Text>
                          </View>
                        </View>
                        <View style={[styles.tugGraphSideLabel, styles.tugGraphRightLabel]}>
                          <Text style={styles.tugGraphName} numberOfLines={1}>{getChoiceLabel(rightChoice, locale)}</Text>
                          <View style={[styles.betGraphStars, styles.tugGraphRightLabelStars]}>
                            <StarIcon size={12} />
                            <Text style={styles.betGraphStarsText}>{rightPool}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.tugTrack}>
                        <View style={[styles.tugFillLeft, { width: `${leftPercent}%` }]} />
                        <View style={[styles.tugFillRight, { width: `${rightPercent}%` }]} />
                        <View style={styles.tugCenterLine}>
                          <Text style={styles.tugVsText}>VS</Text>
                        </View>
                        <Text style={[styles.tugPercentText, styles.tugPercentLeft]}>{leftPercent}%</Text>
                        <Text style={[styles.tugPercentText, styles.tugPercentRight]}>{rightPercent}%</Text>
                        <View style={[styles.tugOddsPill, styles.tugOddsLeft]}>
                          <Text style={styles.tugOddsText}>{leftEstimate ? `${leftEstimate.odds.toFixed(2)}x` : '-'}</Text>
                        </View>
                        <View style={[styles.tugOddsPill, styles.tugOddsRight]}>
                          <Text style={styles.tugOddsText}>{rightEstimate ? `${rightEstimate.odds.toFixed(2)}x` : '-'}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  <View style={styles.betCardActions}>
                    <Pressable
                      style={styles.betActionButton}
                      onPress={() => {
                        setSelectedChoices((prev) => ({
                          ...prev,
                          [question.id]: prev[question.id] ?? question.choices[0]?.id ?? '',
                        }));
                        setBetFeedback(null);
                        setInfoQuestion(question);
                      }}
                    >
                      <Ionicons name="stats-chart" size={15} color={theme.colors.primaryDark} />
                      <Text style={styles.betActionButtonText}>{getBetActionLabel(ticket, now, t)}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <AppModal
        visible={Boolean(infoQuestion)}
        onRequestClose={() => setInfoQuestion(null)}
        variant="bottomSheet"
        animationType="slide"
      >
        {infoQuestion ? (() => {
          const pool = pools[infoQuestion.id];
          const questionTickets = getQuestionTickets(tickets, infoQuestion.id);
          const latestTicket = questionTickets[0];
          const claimable = latestTicket?.status === 'won' && !latestTicket.claimedAt;
          const selectedChoiceId = selectedChoices[infoQuestion.id] ?? infoQuestion.choices[0]?.id;
          const stake = clampBetStake(Number(stakes[infoQuestion.id] ?? String(MINIGAME_BET_MIN_STAKE)), availableStars);
          const canSubmitBet = predictionOpen && canAffordBet && stake >= MINIGAME_BET_MIN_STAKE;
          const projectedPool = pool && selectedChoiceId ? projectPoolWithStake(pool, selectedChoiceId, stake) : null;
          const estimate = projectedPool && selectedChoiceId
            ? calculateMinigameBetPayout(stake, selectedChoiceId, projectedPool)
            : null;
          const alreadyPlaced = Boolean(ticketsByQuestion[infoQuestion.id]);
          const resolveDateTime = formatResolveDateTime(infoQuestion.resolveDate, locale);
          const winningChoiceId = getDemoWinningChoiceId(infoQuestion);
          const winningChoice = infoQuestion.choices.find((choice) => choice.id === winningChoiceId);
          const showResult = latestTicket?.status === 'won' || latestTicket?.status === 'lost';
          const modalChoices = infoQuestion.choices.slice(0, 2);
          const leftChoice = modalChoices[0];
          const rightChoice = modalChoices[1];
          const leftPercent = leftChoice ? getChoicePercent(pool, leftChoice.id) : 50;
          const rightPercent = rightChoice ? getChoicePercent(pool, rightChoice.id) : 50;
          const leftPool = leftChoice ? (pool?.byChoice[leftChoice.id] ?? 0) : 0;
          const rightPool = rightChoice ? (pool?.byChoice[rightChoice.id] ?? 0) : 0;
          const leftEstimate = pool && leftChoice
            ? calculateMinigameBetPayout(
                stake,
                leftChoice.id,
                projectPoolWithStake(pool, leftChoice.id, stake),
              )
            : null;
          const rightEstimate = pool && rightChoice
            ? calculateMinigameBetPayout(
                stake,
                rightChoice.id,
                projectPoolWithStake(pool, rightChoice.id, stake),
              )
            : null;
          return (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{getBetCardTitle(infoQuestion, locale === 'en' ? 'en' : 'ko')}</Text>
                <Pressable onPress={() => setInfoQuestion(null)} style={styles.modalClose}>
                  <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={styles.modalScroll}
              >
                <Text style={styles.modalDesc}>
                  {locale === 'en' ? infoQuestion.descriptionEn : infoQuestion.descriptionKo}
                </Text>
                <View style={styles.betResolveBanner}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.primaryDark} />
                  <View style={styles.betResolveBannerBody}>
                    <Text style={styles.betResolveBannerTitle}>{t('minigames.betResolveAt', { datetime: resolveDateTime })}</Text>
                    <Text style={styles.betResolveBannerHint}>{t('minigames.betResolveNotice')}</Text>
                  </View>
                </View>
                {leftChoice && rightChoice ? (
                  <View style={styles.modalTugCard}>
                    <View style={styles.tugGraphLabels}>
                      <Pressable
                        style={[
                          styles.tugGraphSideLabel,
                          selectedChoiceId === leftChoice.id && styles.modalTugSideActive,
                        ]}
                        disabled={alreadyPlaced}
                        onPress={() => setSelectedChoices((prev) => ({ ...prev, [infoQuestion.id]: leftChoice.id }))}
                      >
                        <Text style={styles.tugGraphName} numberOfLines={1}>{getChoiceLabel(leftChoice, locale)}</Text>
                        <View style={styles.betGraphStars}>
                          <StarIcon size={12} />
                          <Text style={styles.betGraphStarsText}>{leftPool}</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.tugGraphSideLabel,
                          styles.tugGraphRightLabel,
                          selectedChoiceId === rightChoice.id && styles.modalTugSideActive,
                        ]}
                        disabled={alreadyPlaced}
                        onPress={() => setSelectedChoices((prev) => ({ ...prev, [infoQuestion.id]: rightChoice.id }))}
                      >
                        <Text style={styles.tugGraphName} numberOfLines={1}>{getChoiceLabel(rightChoice, locale)}</Text>
                        <View style={[styles.betGraphStars, styles.tugGraphRightLabelStars]}>
                          <StarIcon size={12} />
                          <Text style={styles.betGraphStarsText}>{rightPool}</Text>
                        </View>
                      </Pressable>
                    </View>
                    <View style={styles.tugTrack}>
                      <View style={[styles.tugFillLeft, { width: `${leftPercent}%` }]} />
                      <View style={[styles.tugFillRight, { width: `${rightPercent}%` }]} />
                      <View style={styles.tugCenterLine}>
                        <Text style={styles.tugVsText}>VS</Text>
                      </View>
                      <Text style={[styles.tugPercentText, styles.tugPercentLeft]}>{leftPercent}%</Text>
                      <Text style={[styles.tugPercentText, styles.tugPercentRight]}>{rightPercent}%</Text>
                      <View style={[styles.tugOddsPill, styles.tugOddsLeft]}>
                        <Text style={styles.tugOddsText}>{leftEstimate ? `${leftEstimate.odds.toFixed(2)}x` : '-'}</Text>
                      </View>
                      <View style={[styles.tugOddsPill, styles.tugOddsRight]}>
                        <Text style={styles.tugOddsText}>{rightEstimate ? `${rightEstimate.odds.toFixed(2)}x` : '-'}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}
                {!latestTicket ? (
                  <>
                    <View style={styles.stakeStepperPanel}>
                      <Text style={styles.predictInputLabel}>{t('minigames.betStakeLabel')}</Text>
                      <View style={styles.stakeValuePill}>
                        <StarIcon size={14} />
                        <Text style={styles.stakeValueText}>{stake}</Text>
                      </View>
                      <Text style={styles.stakeAvailableText}>
                        {t('minigames.betAvailableStars', { amount: availableStars, max: maxBetStake })}
                      </Text>
                      <View style={styles.stakeStepperRow}>
                        {[-10, -5, -1, 1, 5, 10].map((delta) => {
                          const nextStake = clampBetStake(stake + delta, availableStars);
                          const disabled = !canAffordBet || (delta > 0 && nextStake <= stake) || (delta < 0 && nextStake >= stake);
                          return (
                          <Pressable
                            key={delta}
                            style={[styles.stakeStepButton, disabled && styles.stakeStepButtonDisabled]}
                            disabled={disabled}
                            onPress={() => adjustBetStake(infoQuestion.id, delta)}
                          >
                            <Text selectable={false} style={[styles.stakeStepText, disabled && styles.stakeStepTextDisabled]}>
                              {delta > 0 ? `+${delta}` : delta}
                            </Text>
                          </Pressable>
                          );
                        })}
                      </View>
                    </View>
                    {estimate ? (
                      <View style={styles.betEstimate}>
                        <View style={styles.estimatePart}>
                          <Text style={styles.estimateLabel}>{locale === 'en' ? 'Expected odds' : '승리시 예상'}</Text>
                          <Text style={styles.estimateValue}>{locale === 'en' ? `${estimate.odds.toFixed(2)}x` : `${estimate.odds.toFixed(2)}배`}</Text>
                        </View>
                        <View style={styles.estimateDivider} />
                        <View style={styles.estimatePart}>
                          <Text style={styles.estimateLabel}>{locale === 'en' ? 'If win' : '승리시'}</Text>
                          <View style={styles.estimateStars}>
                            <StarIcon size={14} />
                            <Text style={styles.estimateValue}>{estimate.payout}</Text>
                          </View>
                        </View>
                      </View>
                    ) : null}
                    {!predictionOpen ? <Text style={styles.betClosedText}>{t('minigames.betClosed')}</Text> : null}
                    {!canAffordBet && predictionOpen ? (
                      <Text style={styles.betClosedText}>{t('shop.insufficient')}</Text>
                    ) : null}
                    {betFeedback ? (
                      <Text
                        style={[
                          styles.betFeedbackText,
                          betFeedback.type === 'success' ? styles.betFeedbackSuccess : styles.betFeedbackError,
                        ]}
                      >
                        {betFeedback.message}
                      </Text>
                    ) : null}
                    <Pressable
                      style={({ pressed }) => [
                        styles.betSubmitPrimary,
                        pressed && canSubmitBet && !betSubmitting && styles.betSubmitPrimaryPressed,
                        (!canSubmitBet || betSubmitting) && styles.betSubmitPrimaryDisabled,
                      ]}
                      disabled={!canSubmitBet || betSubmitting}
                      onPress={() => void placeBet(infoQuestion)}
                    >
                      {betSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.betSubmitPrimaryText}>{t('minigames.betSubmit')}</Text>
                      )}
                    </Pressable>
                  </>
                ) : null}
                {latestTicket ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>{locale === 'en' ? 'My pick' : '내 선택'}</Text>
                    {showResult && winningChoice ? (
                      <View style={styles.betResultWinnerBox}>
                        <Text style={styles.betResultWinnerLabel}>{t('minigames.betResultWinner')}</Text>
                        <Text style={styles.betResultWinnerValue}>{getChoiceLabel(winningChoice, locale)}</Text>
                      </View>
                    ) : null}
                    <View style={styles.historyTicketRow}>
                      <View style={styles.historyTicketMain}>
                        <Text style={styles.historyTicketTitle}>
                          {getTicketChoiceLabel(latestTicket)} · {latestTicket.stake}
                        </Text>
                        <Text style={styles.historyTicketMeta}>
                          {latestTicket.status === 'pending' && hasMinigameBetResultReady(latestTicket, now)
                            ? t('minigames.betSettling')
                            : isMinigameBetAwaitingResult(latestTicket, now)
                              ? t('minigames.betAwaitingResult', {
                                  stake: latestTicket.stake,
                                  datetime: resolveDateTime,
                                })
                              : t(`minigames.betStatus.${latestTicket.status}`, {
                                  stake: latestTicket.stake,
                                  payout: latestTicket.payout ?? 0,
                                  fee: latestTicket.fee ?? 0,
                                  datetime: resolveDateTime,
                                })}
                        </Text>
                      </View>
                      {claimable ? (
                        <View style={styles.claimBtnGroup}>
                          <Pressable style={styles.claimBtn} onPress={() => claimBetReward(latestTicket)}>
                            <Text style={styles.claimBtnText}>{t('minigames.betClaim')}</Text>
                          </Pressable>
                          {!latestTicket.adBonusClaimed ? (
                            <Pressable style={styles.claimBonusBtn} onPress={() => claimBetRewardWithAd(latestTicket)}>
                              <Text style={styles.claimBonusBtnText}>{t('minigames.betClaimAdBonus')}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : latestTicket.claimedAt ? (
                        <Text style={styles.claimedText}>{t('minigames.betClaimedShort')}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          );
        })() : null}
      </AppModal>
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
    flexWrap: 'wrap',
  },
  capExtendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(91,141,239,0.12)',
  },
  capExtendText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
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
  betCommonNotice: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    backgroundColor: theme.colors.starGlow,
    paddingVertical: 9,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  betCommonNoticeClosed: {
    backgroundColor: 'rgba(217,112,112,0.1)',
    borderColor: 'rgba(217,112,112,0.35)',
  },
  betCommonNoticeText: {
    color: theme.colors.star,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  betCommonNoticeTextWithAction: {
    flex: 1,
    textAlign: 'left',
  },
  betCommonNoticeTextClosed: {
    color: theme.colors.error,
  },
  betExtraAdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(91,141,239,0.12)',
    flexShrink: 0,
  },
  betExtraAdBtnDisabled: {
    opacity: 0.6,
  },
  betExtraAdText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
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
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  desc: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
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
  betMatchCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    shadowColor: '#334D6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  betMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  betResolveText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  betMatchBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  betGraphList: {
    gap: 8,
  },
  tugGraphCard: {
    gap: 6,
  },
  tugGraphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tugGraphSideLabel: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  tugGraphRightLabel: {
    alignItems: 'flex-end',
  },
  tugGraphName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    maxWidth: '100%',
  },
  tugTrack: {
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  tugFillLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.error,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  tugFillRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  tugCenterLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 38,
    marginLeft: -19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  tugVsText: {
    color: theme.colors.star,
    fontSize: 11,
    fontWeight: '900',
  },
  tugPercentText: {
    position: 'absolute',
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tugPercentLeft: {
    left: 10,
  },
  tugPercentRight: {
    right: 10,
  },
  tugOddsPill: {
    position: 'absolute',
    top: 9,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.86)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tugOddsLeft: {
    left: '28%',
  },
  tugOddsRight: {
    right: '28%',
  },
  tugOddsText: {
    color: theme.colors.primaryDark,
    fontSize: 9,
    fontWeight: '900',
  },
  betGraphRow: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  betGraphRowSelected: {
    borderColor: theme.colors.star,
    backgroundColor: theme.colors.starGlow,
  },
  betGraphHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  betGraphLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  betGraphStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
  },
  tugGraphRightLabelStars: {
    alignSelf: 'flex-end',
  },
  betGraphStarsText: {
    color: theme.colors.star,
    fontSize: 11,
    fontWeight: '900',
  },
  betGraphTrack: {
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: 'center',
  },
  betGraphFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  betGraphPercent: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  betGraphOdds: {
    position: 'absolute',
    right: 5,
    top: 4,
    bottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 7,
    justifyContent: 'center',
  },
  betGraphOddsText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },
  betVsSlot: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  betVsChoice: {
    minHeight: 94,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  betVsChoicePrimary: {
    backgroundColor: 'rgba(217,112,112,0.1)',
    borderColor: 'rgba(217,112,112,0.35)',
  },
  betVsChoiceSecondary: {
    backgroundColor: theme.colors.tint.soft,
    borderColor: theme.colors.tint.border,
  },
  betVsChoiceSelected: {
    borderColor: theme.colors.star,
    borderWidth: 2,
    shadowColor: theme.colors.star,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  betVsChoiceLabel: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    maxWidth: '100%',
  },
  betVsPercent: {
    color: theme.colors.primaryDark,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  betVsPool: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  betVsBadge: {
    position: 'absolute',
    right: -24,
    top: '50%',
    width: 38,
    height: 38,
    marginTop: -19,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 2,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#1A2B3D',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  betVsBadgeText: {
    color: theme.colors.star,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  betCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  betActionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.starGlow,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
  },
  betActionButtonDisabled: {
    opacity: 0.45,
  },
  betActionButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  betBars: {
    flex: 1,
    gap: 6,
  },
  betBarRow: {
    gap: 3,
  },
  betBarTrack: {
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    justifyContent: 'center',
  },
  betBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9,
  },
  betBarFillPrimary: {
    backgroundColor: theme.colors.error,
  },
  betBarFillSecondary: {
    backgroundColor: theme.colors.primary,
  },
  betBarPercent: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  betBarLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  betSideActions: {
    width: 88,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  betIconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.starGlow,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  betIconButtonDisabled: {
    opacity: 0.45,
  },
  betIconButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
  },
  betClosedText: {
    color: theme.colors.error,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
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
  claimBtnGroup: {
    alignItems: 'flex-end',
    gap: 6,
  },
  claimBonusBtn: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  claimBonusBtnText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
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
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
    maxWidth: '82%',
  },
  betStatusPill: {
    position: 'absolute',
    right: 0,
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
    gap: 3,
  },
  choiceBtnActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  choiceBtnDisabled: { opacity: 0.75 },
  choiceText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '900' },
  choiceTextActive: { color: theme.colors.primaryDark },
  choicePoolText: {
    color: theme.colors.star,
    fontSize: 10,
    fontWeight: '800',
  },
  betEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  estimatePart: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  estimateDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.tint.border,
  },
  estimateLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  estimateValue: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  estimateStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  betActionRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stakeInput: {
    width: 58,
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
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.full,
    paddingVertical: 7,
    paddingHorizontal: 9,
    overflow: 'hidden',
    textAlign: 'center',
  },
  modalContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  modalTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
    maxWidth: '82%',
  },
  modalTugCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: 8,
  },
  modalTugSideActive: {
    backgroundColor: theme.colors.starGlow,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  modalScrollView: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 520,
  },
  modalScroll: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  betSubmitPrimary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 48,
  },
  betSubmitPrimaryPressed: {
    opacity: 0.92,
  },
  betSubmitPrimaryDisabled: {
    opacity: 0.7,
  },
  betSubmitPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  betFeedbackText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  betFeedbackSuccess: {
    color: theme.colors.success,
  },
  betFeedbackError: {
    color: theme.colors.error,
  },
  modalDesc: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  betResolveBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    padding: theme.spacing.sm,
  },
  betResolveBannerBody: {
    flex: 1,
    gap: 4,
  },
  betResolveBannerTitle: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  betResolveBannerHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  betResultWinnerBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  betResultWinnerLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  betResultWinnerValue: {
    color: theme.colors.success,
    fontSize: 18,
    fontWeight: '900',
  },
  modalSection: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  modalSectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  modalEasyLine: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  modalPoolRow: {
    gap: 5,
  },
  modalPoolLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  modalPoolTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  modalPoolFill: {
    height: '100%',
    borderRadius: 5,
  },
  modalPoolValue: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  modalInfoLine: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  modalMuted: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
  historyTicketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  historyTicketMain: {
    flex: 1,
    minWidth: 0,
  },
  historyTicketTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  historyTicketMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  predictChoiceGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  predictChoice: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  predictChoiceActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  predictChoiceText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  predictChoiceTextActive: {
    color: theme.colors.primaryDark,
  },
  predictChoiceMeta: {
    color: theme.colors.star,
    fontSize: 11,
    fontWeight: '800',
  },
  predictInputLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  stakeStepperPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: 8,
    alignItems: 'center',
  },
  stakeValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.starGlow,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  stakeValueText: {
    color: theme.colors.star,
    fontSize: 17,
    fontWeight: '900',
  },
  stakeAvailableText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  stakeStepperRow: {
    flexDirection: 'row',
    gap: 5,
    width: '100%',
  },
  stakeStepButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    caretColor: 'transparent',
    // @ts-ignore web
    cursor: 'pointer',
  },
  stakeStepButtonDisabled: {
    opacity: 0.35,
    // @ts-ignore web
    cursor: 'default',
  },
  stakeStepText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    caretColor: 'transparent',
  },
  stakeStepTextDisabled: {
    color: theme.colors.textSubtle,
  },
});
