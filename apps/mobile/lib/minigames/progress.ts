import type { MinigameId } from '@/lib/minigames/stages';

export interface MinigameGameProgress {
  clearedStage: number;
}

export interface MinigameProgress {
  match: MinigameGameProgress;
  quiz: MinigameGameProgress;
  tap: MinigameGameProgress;
  memory: MinigameGameProgress;
}

export interface MinigameDailyState {
  dayKey: string;
  starsEarnedToday: number;
}

export const EMPTY_MINIGAME_PROGRESS: MinigameProgress = {
  match: { clearedStage: 0 },
  quiz: { clearedStage: 0 },
  tap: { clearedStage: 0 },
  memory: { clearedStage: 0 },
};

export function getClearedStage(progress: MinigameProgress, gameId: MinigameId): number {
  return progress[gameId].clearedStage;
}
