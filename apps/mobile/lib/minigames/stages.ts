import { MINIGAME_MAX_STAGE } from '@tingting/shared';

export type MinigameId = 'match' | 'quiz' | 'tap' | 'memory';

export interface MatchStageConfig {
  timeSeconds: number;
  targetScore: number;
  tileTypeCount: number;
}

export interface QuizStageConfig {
  questionCount: number;
  requiredCorrect: number;
}

export interface TapStageConfig {
  durationSeconds: number;
  targetTaps: number;
}

export interface MemoryStageConfig {
  pairCount: number;
  maxMoves: number;
  columns: number;
}

export type MinigameStageConfig =
  | { gameId: 'match'; config: MatchStageConfig }
  | { gameId: 'quiz'; config: QuizStageConfig }
  | { gameId: 'tap'; config: TapStageConfig }
  | { gameId: 'memory'; config: MemoryStageConfig };

export interface MatchStageResult {
  score: number;
}

export interface QuizStageResult {
  correctCount: number;
}

export interface TapStageResult {
  taps: number;
}

export interface MemoryStageResult {
  moves: number;
  allMatched: boolean;
}

export type MinigameStageResult =
  | { gameId: 'match'; result: MatchStageResult }
  | { gameId: 'quiz'; result: QuizStageResult }
  | { gameId: 'tap'; result: TapStageResult }
  | { gameId: 'memory'; result: MemoryStageResult };

const MATCH_STAGES: MatchStageConfig[] = [
  { timeSeconds: 60, targetScore: 200, tileTypeCount: 4 },
  { timeSeconds: 58, targetScore: 300, tileTypeCount: 4 },
  { timeSeconds: 50, targetScore: 500, tileTypeCount: 5 },
  { timeSeconds: 48, targetScore: 600, tileTypeCount: 5 },
  { timeSeconds: 45, targetScore: 750, tileTypeCount: 5 },
  { timeSeconds: 42, targetScore: 900, tileTypeCount: 5 },
  { timeSeconds: 40, targetScore: 1050, tileTypeCount: 5 },
  { timeSeconds: 38, targetScore: 1200, tileTypeCount: 5 },
  { timeSeconds: 36, targetScore: 1300, tileTypeCount: 5 },
  { timeSeconds: 35, targetScore: 1400, tileTypeCount: 5 },
];

const QUIZ_STAGES: QuizStageConfig[] = [
  { questionCount: 5, requiredCorrect: 3 },
  { questionCount: 5, requiredCorrect: 4 },
  { questionCount: 6, requiredCorrect: 4 },
  { questionCount: 6, requiredCorrect: 5 },
  { questionCount: 7, requiredCorrect: 6 },
  { questionCount: 7, requiredCorrect: 6 },
  { questionCount: 8, requiredCorrect: 7 },
  { questionCount: 9, requiredCorrect: 8 },
  { questionCount: 9, requiredCorrect: 8 },
  { questionCount: 10, requiredCorrect: 9 },
];

const TAP_STAGES: TapStageConfig[] = [
  { durationSeconds: 10, targetTaps: 35 },
  { durationSeconds: 10, targetTaps: 42 },
  { durationSeconds: 9, targetTaps: 48 },
  { durationSeconds: 9, targetTaps: 50 },
  { durationSeconds: 9, targetTaps: 55 },
  { durationSeconds: 9, targetTaps: 62 },
  { durationSeconds: 8, targetTaps: 70 },
  { durationSeconds: 8, targetTaps: 75 },
  { durationSeconds: 8, targetTaps: 80 },
  { durationSeconds: 8, targetTaps: 85 },
];

const MEMORY_STAGES: MemoryStageConfig[] = [
  { pairCount: 6, maxMoves: 28, columns: 4 },
  { pairCount: 6, maxMoves: 26, columns: 4 },
  { pairCount: 7, maxMoves: 26, columns: 4 },
  { pairCount: 7, maxMoves: 25, columns: 4 },
  { pairCount: 8, maxMoves: 24, columns: 4 },
  { pairCount: 8, maxMoves: 23, columns: 4 },
  { pairCount: 9, maxMoves: 22, columns: 5 },
  { pairCount: 9, maxMoves: 21, columns: 5 },
  { pairCount: 10, maxMoves: 21, columns: 5 },
  { pairCount: 10, maxMoves: 20, columns: 5 },
];

export const MEMORY_PAIR_EMOJIS = ['🏔️', '🌊', '🏯', '🍜', '🚂', '🌸', '⛱️', '🎎', '🗼', '🎡'] as const;

function clampStage(stage: number): number {
  return Math.min(Math.max(1, stage), MINIGAME_MAX_STAGE);
}

export function getCurrentStage(clearedStage: number): number {
  if (clearedStage >= MINIGAME_MAX_STAGE) return MINIGAME_MAX_STAGE;
  return clearedStage + 1;
}

export function getMatchStageConfig(stage: number): MatchStageConfig {
  return MATCH_STAGES[clampStage(stage) - 1];
}

export function getQuizStageConfig(stage: number): QuizStageConfig {
  return QUIZ_STAGES[clampStage(stage) - 1];
}

export function getTapStageConfig(stage: number): TapStageConfig {
  return TAP_STAGES[clampStage(stage) - 1];
}

export function getMemoryStageConfig(stage: number): MemoryStageConfig {
  return MEMORY_STAGES[clampStage(stage) - 1];
}

export function evaluateStageClear(
  gameId: MinigameId,
  stage: number,
  payload: MinigameStageResult['result'],
): boolean {
  switch (gameId) {
    case 'match': {
      const config = getMatchStageConfig(stage);
      const { score } = payload as MatchStageResult;
      return score >= config.targetScore;
    }
    case 'quiz': {
      const config = getQuizStageConfig(stage);
      const { correctCount } = payload as QuizStageResult;
      return correctCount >= config.requiredCorrect;
    }
    case 'tap': {
      const config = getTapStageConfig(stage);
      const { taps } = payload as TapStageResult;
      return taps >= config.targetTaps;
    }
    case 'memory': {
      const config = getMemoryStageConfig(stage);
      const { moves, allMatched } = payload as MemoryStageResult;
      return allMatched && moves <= config.maxMoves;
    }
    default:
      return false;
  }
}

export function getStageTargetLabelKey(gameId: MinigameId): string {
  switch (gameId) {
    case 'match':
      return 'minigames.targetScore';
    case 'quiz':
      return 'minigames.targetCorrect';
    case 'tap':
      return 'minigames.targetTaps';
    case 'memory':
      return 'minigames.targetMoves';
    default:
      return 'minigames.stageLabel';
  }
}

export function formatStageTarget(
  gameId: MinigameId,
  stage: number,
): { key: string; params: Record<string, string | number> } {
  switch (gameId) {
    case 'match': {
      const config = getMatchStageConfig(stage);
      return { key: 'minigames.targetScore', params: { score: config.targetScore } };
    }
    case 'quiz': {
      const config = getQuizStageConfig(stage);
      return {
        key: 'minigames.targetCorrect',
        params: { correct: config.requiredCorrect, total: config.questionCount },
      };
    }
    case 'tap': {
      const config = getTapStageConfig(stage);
      return { key: 'minigames.targetTaps', params: { taps: config.targetTaps } };
    }
    case 'memory': {
      const config = getMemoryStageConfig(stage);
      return { key: 'minigames.targetMoves', params: { moves: config.maxMoves } };
    }
    default:
      return { key: 'minigames.stageLabel', params: { current: stage, max: MINIGAME_MAX_STAGE } };
  }
}
