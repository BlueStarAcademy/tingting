export const QUIZ_BASE_SCORE = 100;

export function scoreQuizCorrect(combo: number): number {
  return QUIZ_BASE_SCORE * Math.max(1, combo);
}
