export const GUESS_NUMBER_MIN = 1;
export const GUESS_NUMBER_MAX = 100;

export type GuessHint = 'up' | 'down' | 'correct';

export interface GuessEntry {
  value: number;
  hint: GuessHint;
}

export function rollSecretNumber(): number {
  return GUESS_NUMBER_MIN + Math.floor(Math.random() * (GUESS_NUMBER_MAX - GUESS_NUMBER_MIN + 1));
}

export function evaluateGuess(secret: number, guess: number): GuessHint {
  if (guess === secret) return 'correct';
  return guess < secret ? 'up' : 'down';
}

export function parseGuessInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (value < GUESS_NUMBER_MIN || value > GUESS_NUMBER_MAX) return null;
  return value;
}
