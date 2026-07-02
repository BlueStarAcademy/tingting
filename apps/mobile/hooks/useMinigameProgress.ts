import { useCallback, useEffect, useState } from 'react';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { api } from '@/lib/api';
import { getClearedStage, type MinigameDailyState, type MinigameProgress } from '@/lib/minigames/progress';
import { getCurrentStage, type MinigameId } from '@/lib/minigames/stages';

export function useMinigameProgress(gameId?: MinigameId) {
  const [progress, setProgress] = useState<MinigameProgress | null>(null);
  const [daily, setDaily] = useState<MinigameDailyState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProgress, nextDaily] = await Promise.all([
        api.getMinigameProgress(),
        api.getMinigameDailyState(),
      ]);
      setProgress(nextProgress);
      setDaily(nextDaily);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearedStage = gameId && progress ? getClearedStage(progress, gameId) : 0;
  const currentStage = getCurrentStage(clearedStage);

  return {
    progress,
    daily,
    loading,
    refresh,
    clearedStage,
    currentStage,
    maxStage: MINIGAME_MAX_STAGE,
  };
}

export function useMinigameListProgress() {
  return useMinigameProgress();
}
