import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { GameResultOverlay } from '@/components/minigames/GameResultOverlay';
import { StarRewardModal } from '@/components/StarRewardModal';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
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
  onRestart: () => void;
  onProgressUpdated?: () => void;
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
}: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const { refresh } = useAuth();
  const cleared = finished ? evaluateStageClear(gameId, stage, stageResult) : false;
  const resultKey = finished ? JSON.stringify(stageResult) : '';
  const [claimLoading, setClaimLoading] = useState(false);
  const [starReward, setStarReward] = useState(0);
  const [starsEarnedToday, setStarsEarnedToday] = useState(0);
  const [dailyCapReached, setDailyCapReached] = useState(false);
  const [showStarModal, setShowStarModal] = useState(false);
  const [totalStars, setTotalStars] = useState<number | undefined>();
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
        setTotalStars(result.stars);
        if (result.reward > 0) {
          setShowStarModal(true);
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
    setShowStarModal(false);
    onRestart();
  };

  return (
    <>
      <GameResultOverlay
        cleared={cleared}
        stage={stage}
        maxStage={MINIGAME_MAX_STAGE}
        scoreLabel={scoreLabel}
        scoreValue={scoreValue}
        detail={detail}
        targetDetail={targetDetail}
        starReward={starReward}
        starsEarnedToday={starsEarnedToday}
        dailyCapReached={dailyCapReached}
        loading={cleared && claimLoading}
        playAgainLabel={t('minigames.playAgain')}
        exitLabel={t('minigames.exit')}
        onPlayAgain={handleRestart}
        onExit={() => router.back()}
      />
      <StarRewardModal
        visible={showStarModal}
        amount={starReward}
        totalStars={totalStars}
        title={t('minigames.stageClear', { stage })}
        subtitle={t('minigames.starEarned', { amount: starReward })}
        onClose={() => setShowStarModal(false)}
      />
    </>
  );
}
