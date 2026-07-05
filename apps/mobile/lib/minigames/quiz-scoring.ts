export const QUIZ_BASE_SCORE = 100;
export const QUIZ_LIVES = 3;
export const QUIZ_TARGET_CORRECT = 10;

export function scoreQuizCorrect(combo: number): number {
  return QUIZ_BASE_SCORE * Math.max(1, combo);
}
