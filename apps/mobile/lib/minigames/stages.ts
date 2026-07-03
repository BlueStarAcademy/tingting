import { MINIGAME_MAX_STAGE } from '@tingting/shared';

export type MinigameId = 'match' | 'quiz' | 'slime' | 'memory' | 'guess' | 'code';

export interface MatchStageConfig {
  timeSeconds: number;
  targetScore: number;
  tileTypeCount: number;
}

export interface QuizStageConfig {
  questionCount: number;
  requiredCorrect: number;
}

export interface SlimeStageConfig {
  playerTarget: number;
  aiTarget: number;
}

export interface MemoryStageConfig {
  pairCount: number;
  maxMoves: number;
  columns: number;
}

export interface GuessStageConfig {
  maxAttempts: number;
}

export interface CodeStageConfig {
  maxAttempts: number;
  digitCount: number;
}

export type MinigameStageConfig =
  | { gameId: 'match'; config: MatchStageConfig }
  | { gameId: 'quiz'; config: QuizStageConfig }
  | { gameId: 'slime'; config: SlimeStageConfig }
  | { gameId: 'memory'; config: MemoryStageConfig }
  | { gameId: 'guess'; config: GuessStageConfig }
  | { gameId: 'code'; config: CodeStageConfig };

export interface MatchStageResult {
  score: number;
}

export interface QuizStageResult {
  correctCount: number;
}

export interface SlimeStageResult {
  won: boolean;
  playerCaptures: number;
}

export interface MemoryStageResult {
  moves: number;
  allMatched: boolean;
}

export interface GuessStageResult {
  won: boolean;
  attemptsUsed: number;
}

export interface CodeStageResult {
  won: boolean;
  attemptsUsed: number;
}

export type MinigameStageResult =
  | { gameId: 'match'; result: MatchStageResult }
  | { gameId: 'quiz'; result: QuizStageResult }
  | { gameId: 'slime'; result: SlimeStageResult }
  | { gameId: 'memory'; result: MemoryStageResult }
  | { gameId: 'guess'; result: GuessStageResult }
  | { gameId: 'code'; result: CodeStageResult };

const MATCH_STAGES: MatchStageConfig[] = [
  { timeSeconds: 60, targetScore: 200, tileTypeCount: 4 },
  { timeSeconds: 60, targetScore: 300, tileTypeCount: 4 },
  { timeSeconds: 60, targetScore: 500, tileTypeCount: 5 },
  { timeSeconds: 60, targetScore: 600, tileTypeCount: 5 },
  { timeSeconds: 60, targetScore: 750, tileTypeCount: 5 },
  { timeSeconds: 60, targetScore: 900, tileTypeCount: 5 },
  { timeSeconds: 60, targetScore: 1050, tileTypeCount: 5 },
  { timeSeconds: 60, targetScore: 1200, tileTypeCount: 5 },
  { timeSeconds: 60, targetScore: 1300, tileTypeCount: 5 },
  { timeSeconds: 60, targetScore: 1400, tileTypeCount: 5 },
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

const SLIME_STAGES: SlimeStageConfig[] = Array.from({ length: MINIGAME_MAX_STAGE }, (_, index) => ({
  playerTarget: index + 1,
  aiTarget: 5,
}));

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

/** 스테이지 1 = 15회, 스테이지 10 = 6회 */
export function getMinigameAttemptLimit(stage: number): number {
  return 16 - clampStage(stage);
}

const GUESS_STAGES: GuessStageConfig[] = Array.from({ length: MINIGAME_MAX_STAGE }, (_, index) => ({
  maxAttempts: 16 - (index + 1),
}));

const CODE_STAGES: CodeStageConfig[] = Array.from({ length: MINIGAME_MAX_STAGE }, (_, index) => ({
  maxAttempts: 16 - (index + 1),
  digitCount: 8,
}));

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

export function getSlimeStageConfig(stage: number): SlimeStageConfig {
  return SLIME_STAGES[clampStage(stage) - 1];
}

export function getMemoryStageConfig(stage: number): MemoryStageConfig {
  return MEMORY_STAGES[clampStage(stage) - 1];
}

export function getGuessStageConfig(stage: number): GuessStageConfig {
  return GUESS_STAGES[clampStage(stage) - 1];
}

export function getCodeStageConfig(stage: number): CodeStageConfig {
  return CODE_STAGES[clampStage(stage) - 1];
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
    case 'slime': {
      const { won } = payload as SlimeStageResult;
      return won;
    }
    case 'memory': {
      const config = getMemoryStageConfig(stage);
      const { moves, allMatched } = payload as MemoryStageResult;
      return allMatched && moves <= config.maxMoves;
    }
    case 'guess': {
      const { won } = payload as GuessStageResult;
      return won;
    }
    case 'code': {
      const { won } = payload as CodeStageResult;
      return won;
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
    case 'slime':
      return 'minigames.targetSlimeCaptures';
    case 'memory':
      return 'minigames.targetMoves';
    case 'guess':
    case 'code':
      return 'minigames.targetAttempts';
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
    case 'slime': {
      const config = getSlimeStageConfig(stage);
      return {
        key: 'minigames.targetSlimeCaptures',
        params: { captures: config.playerTarget, ai: config.aiTarget },
      };
    }
    case 'memory': {
      const config = getMemoryStageConfig(stage);
      return { key: 'minigames.targetMoves', params: { moves: config.maxMoves } };
    }
    case 'guess': {
      const config = getGuessStageConfig(stage);
      return { key: 'minigames.targetAttempts', params: { attempts: config.maxAttempts } };
    }
    case 'code': {
      const config = getCodeStageConfig(stage);
      return { key: 'minigames.targetAttempts', params: { attempts: config.maxAttempts } };
    }
    default:
      return { key: 'minigames.stageLabel', params: { current: stage, max: MINIGAME_MAX_STAGE } };
  }
}
