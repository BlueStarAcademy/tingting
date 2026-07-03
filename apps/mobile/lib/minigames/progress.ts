import type { MinigameId } from '@/lib/minigames/stages';

export interface MinigameGameProgress {
  clearedStage: number;
}

export interface MinigameProgress {
  dayKey?: string;
  match: MinigameGameProgress;
  quiz: MinigameGameProgress;
  slime: MinigameGameProgress;
  memory: MinigameGameProgress;
  guess: MinigameGameProgress;
  code: MinigameGameProgress;
}

export interface MinigameDailyState {
  dayKey: string;
  starsEarnedToday: number;
}

export const EMPTY_MINIGAME_PROGRESS: MinigameProgress = {
  match: { clearedStage: 0 },
  quiz: { clearedStage: 0 },
  slime: { clearedStage: 0 },
  memory: { clearedStage: 0 },
  guess: { clearedStage: 0 },
  code: { clearedStage: 0 },
};

export function getClearedStage(progress: MinigameProgress, gameId: MinigameId): number {
  return progress[gameId].clearedStage;
}
