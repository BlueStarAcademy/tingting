import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GameResultOverlay } from '@/components/minigames/GameResultOverlay';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useAdFree } from '@/hooks/useAdFree';
import { api } from '@/lib/api';
import {
  evaluateStageClear,
  formatStageTarget,
  type MinigameId,
  type MinigameStageResult,
} from '@/lib/minigames/stages';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';

interface Props {
  gameId: MinigameId;
  stage: number;
  finished: boolean;
  scoreLabel: string;
  scoreValue: string;
  detail?: string;
  stageResult: MinigameStageResult['result'];
  onRestart: (stage?: number) => void;
  onContinueStage?: () => void;
  onProgressUpdated?: () => void;
  nextOrExitOnly?: boolean;
}

export function MinigameResultPanel({
  gameId,
  stage,
  finished,
  scoreLabel,
  scoreValue,
  detail,
  stageResult,
  onRestart,
  onContinueStage,
  onProgressUpdated,
  nextOrExitOnly = false,
}: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const { refresh } = useAuth();
  const { adFree, watchAd } = useAdFree();
  const cleared = finished ? evaluateStageClear(gameId, stage, stageResult) : false;
  const resultKey = finished ? JSON.stringify(stageResult) : '';
  const isFinalStage = stage === MINIGAME_MAX_STAGE;
  const [claimLoading, setClaimLoading] = useState(false);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [starReward, setStarReward] = useState(0);
  const [showFinalStarRoll, setShowFinalStarRoll] = useState(false);
  const [starsEarnedToday, setStarsEarnedToday] = useState(0);
  const [effectiveDailyCap, setEffectiveDailyCap] = useState(30);
  const [dailyCapReached, setDailyCapReached] = useState(false);
  const [canReroll, setCanReroll] = useState(false);
  const [canDouble, setCanDouble] = useState(false);
  const [alreadyCleared, setAlreadyCleared] = useState(false);
  const claimedRef = useRef<string | null>(null);

  const target = formatStageTarget(gameId, stage);
  const targetDetail = t(target.key, target.params);

  const syncBonusFlags = async () => {
    const bonus = await api.getMinigameRewardBonus();
    if (!bonus || bonus.gameId !== gameId || bonus.stage !== stage) {
      setCanReroll(false);
      setCanDouble(false);
      return;
    }
    setCanReroll(!bonus.rerolled);
    setCanDouble(!bonus.doubled);
  };

  useEffect(() => {
    if (!finished || !cleared) return;

    const claimKey = `${gameId}:${stage}:${resultKey}`;
    if (claimedRef.current === claimKey) return;

    let cancelled = false;
    setClaimLoading(true);

    api
      .claimMinigameStageClear(gameId, stage)
      .then((result) => {
        if (cancelled) return;
        claimedRef.current = claimKey;
        setStarReward(result.reward);
        setStarsEarnedToday(result.starsEarnedToday);
        setEffectiveDailyCap(result.dailyCap);
        setDailyCapReached(result.reward === 0 && result.starsEarnedToday >= result.dailyCap);
        setAlreadyCleared(Boolean(result.alreadyCleared));
        setShowFinalStarRoll(result.isFinalStageReward && result.reward > 0);
        if (result.reward > 0 && result.isFinalStageReward) {
          setCanReroll(true);
          setCanDouble(true);
        } else {
          setCanReroll(false);
          setCanDouble(false);
        }
        if (result.reward > 0) {
          void refresh();
        }
        onProgressUpdated?.();
      })
      .finally(() => {
        if (!cancelled) setClaimLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cleared, finished, gameId, onProgressUpdated, refresh, resultKey, stage]);

  if (!finished) return null;

  const handleRestart = () => {
    claimedRef.current = null;
    setStarReward(0);
    setShowFinalStarRoll(false);
    setCanReroll(false);
    setCanDouble(false);
    setAlreadyCleared(false);
    onRestart(1);
  };

  const handleContinueWithAd = async () => {
    const watched = await watchAd('minigame_continue');
    if (!watched) return;
    claimedRef.current = null;
    setStarReward(0);
    setShowFinalStarRoll(false);
    if (onContinueStage) {
      onContinueStage();
    } else {
      onRestart(stage);
    }
  };

  const handleReroll = async () => {
    setBonusLoading(true);
    try {
      const watched = await watchAd('minigame_reroll');
      if (!watched) return;
      const result = await api.rerollMinigameReward(gameId, stage);
      setStarReward(result.reward);
      setStarsEarnedToday(result.starsEarnedToday);
      setEffectiveDailyCap(result.dailyCap);
      setShowFinalStarRoll(true);
      void refresh();
      void syncBonusFlags();
      onProgressUpdated?.();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBonusLoading(false);
    }
  };

  const handleReplayReward = async () => {
    setBonusLoading(true);
    try {
      const watched = await watchAd('minigame_replay_reward');
      if (!watched) return;
      const result = await api.claimMinigameReplayReward(gameId, stage);
      setStarReward(result.reward);
      setStarsEarnedToday(result.starsEarnedToday);
      setEffectiveDailyCap(result.dailyCap);
      setDailyCapReached(result.starsEarnedToday >= result.dailyCap);
      setAlreadyCleared(false);
      setShowFinalStarRoll(true);
      setCanReroll(true);
      setCanDouble(true);
      void refresh();
      void syncBonusFlags();
      onProgressUpdated?.();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBonusLoading(false);
    }
  };

  const handleDouble = async () => {
    setBonusLoading(true);
    try {
      const watched = await watchAd('minigame_double');
      if (!watched) return;
      const result = await api.doubleMinigameReward(gameId, stage);
      setStarReward((prev) => prev + result.bonus);
      setStarsEarnedToday(result.starsEarnedToday);
      setEffectiveDailyCap(result.dailyCap);
      void refresh();
      void syncBonusFlags();
      onProgressUpdated?.();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBonusLoading(false);
    }
  };

  return (
    <GameResultOverlay
      cleared={cleared}
      isFinalStage={isFinalStage}
      scoreLabel={scoreLabel}
      scoreValue={scoreValue}
      detail={detail}
      targetDetail={targetDetail}
      starReward={starReward}
      showFinalStarRoll={showFinalStarRoll}
      starsEarnedToday={starsEarnedToday}
      effectiveDailyCap={effectiveDailyCap}
      dailyCapReached={dailyCapReached}
      loading={cleared && claimLoading}
      bonusLoading={bonusLoading}
      canReroll={canReroll && starReward > 0}
      canDouble={canDouble && starReward > 0}
      alreadyCleared={alreadyCleared}
      canReplayReward={alreadyCleared && !dailyCapReached && starsEarnedToday < effectiveDailyCap}
      playAgainLabel={t('minigames.playAgain')}
      exitLabel={t('minigames.exit')}
      onPlayAgain={handleRestart}
      onContinueWithAd={!cleared ? handleContinueWithAd : undefined}
      continueAdLabel={adFree ? t('minigames.continueStage') : t('minigames.watchAdContinue')}
      onRerollReward={handleReroll}
      onDoubleReward={handleDouble}
      onReplayReward={handleReplayReward}
      rerollAdLabel={adFree ? t('minigames.rerollFree') : t('minigames.watchAdReroll')}
      doubleAdLabel={adFree ? t('minigames.doubleFree') : t('minigames.watchAdDouble')}
      replayRewardAdLabel={adFree ? t('minigames.replayRewardFree') : t('minigames.watchAdReplayReward')}
      onExit={() => router.back()}
      nextOrExitOnly={nextOrExitOnly}
    />
  );
}
