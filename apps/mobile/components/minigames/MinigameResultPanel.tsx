import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { GameResultOverlay } from '@/components/minigames/GameResultOverlay';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useAdFree, showRewardedAd } from '@/hooks/useAdFree';
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
  onProgressUpdated?: () => void;
  onNextStage?: () => void;
  nextStageLabel?: string;
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
  onProgressUpdated,
  onNextStage,
  nextStageLabel,
  nextOrExitOnly = false,
}: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const { refresh } = useAuth();
  const { adFree } = useAdFree();
  const cleared = finished ? evaluateStageClear(gameId, stage, stageResult) : false;
  const resultKey = finished ? JSON.stringify(stageResult) : '';
  const isFinalStage = stage === MINIGAME_MAX_STAGE;
  const [claimLoading, setClaimLoading] = useState(false);
  const [starReward, setStarReward] = useState(0);
  const [showFinalStarRoll, setShowFinalStarRoll] = useState(false);
  const [starsEarnedToday, setStarsEarnedToday] = useState(0);
  const [dailyCapReached, setDailyCapReached] = useState(false);
  const claimedRef = useRef<string | null>(null);

  const target = formatStageTarget(gameId, stage);
  const targetDetail = t(target.key, target.params);

  useEffect(() => {
    if (!finished || !cleared) return;

    const claimKey = `${gameId}:${stage}:${resultKey}`;
    if (claimedRef.current === claimKey) return;

    let cancelled = false;
    setClaimLoading(true);

    api
      .claimMinigameStageClear(gameId, stage)
      .then(async (result) => {
        if (cancelled) return;
        claimedRef.current = claimKey;
        setStarReward(result.reward);
        setStarsEarnedToday(result.starsEarnedToday);
        setDailyCapReached(result.reward === 0 && result.starsEarnedToday >= result.dailyCap);
        setShowFinalStarRoll(result.isFinalStageReward && result.reward > 0);
        if (result.reward > 0) {
          await refresh();
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
    onRestart(1);
  };

  const handleContinueWithAd = async () => {
    if (adFree) {
      claimedRef.current = null;
      setStarReward(0);
      setShowFinalStarRoll(false);
      onRestart(stage);
      return;
    }
    const watched = await showRewardedAd();
    if (watched) {
      claimedRef.current = null;
      setStarReward(0);
      setShowFinalStarRoll(false);
      onRestart(stage);
    }
  };

  return (
    <GameResultOverlay
      cleared={cleared}
      stage={stage}
      maxStage={MINIGAME_MAX_STAGE}
      isFinalStage={isFinalStage}
      scoreLabel={scoreLabel}
      scoreValue={scoreValue}
      detail={detail}
      targetDetail={targetDetail}
      starReward={starReward}
      showFinalStarRoll={showFinalStarRoll}
      starsEarnedToday={starsEarnedToday}
      dailyCapReached={dailyCapReached}
      loading={cleared && claimLoading}
      playAgainLabel={t('minigames.playAgain')}
      nextStageLabel={nextStageLabel}
      exitLabel={t('minigames.exit')}
      onPlayAgain={handleRestart}
      onContinueWithAd={!cleared ? handleContinueWithAd : undefined}
      continueAdLabel={adFree ? t('minigames.continueStage') : t('minigames.watchAdContinue')}
      onNextStage={
        cleared && onNextStage
          ? () => {
              claimedRef.current = null;
              setStarReward(0);
              setShowFinalStarRoll(false);
              onNextStage();
            }
          : undefined
      }
      onExit={() => router.back()}
      nextOrExitOnly={nextOrExitOnly}
    />
  );
}
