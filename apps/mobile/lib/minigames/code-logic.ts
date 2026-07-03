export const CODE_DIGIT_COUNT = 8;
export const CODE_DIGIT_MIN = 0;
export const CODE_DIGIT_MAX = 9;

export type CodeFeedback = 'exact' | 'present' | 'absent';

export interface CodeGuessEntry {
  digits: number[];
  feedback: CodeFeedback[];
}

export function rollSecretCode(length = CODE_DIGIT_COUNT): number[] {
  return Array.from({ length }, () => CODE_DIGIT_MIN + Math.floor(Math.random() * (CODE_DIGIT_MAX - CODE_DIGIT_MIN + 1)));
}

export function parseCodeInput(raw: string): number[] | null {
  const trimmed = raw.replace(/\s/g, '');
  if (!/^\d+$/.test(trimmed) || trimmed.length !== CODE_DIGIT_COUNT) return null;
  return trimmed.split('').map((char) => Number(char));
}

export function evaluateCodeGuess(secret: number[], guess: number[]): CodeFeedback[] {
  const size = secret.length;
  const feedback: CodeFeedback[] = Array(size).fill('absent');
  const secretPool: number[] = [];
  const guessPool: number[] = [];

  for (let i = 0; i < size; i += 1) {
    if (guess[i] === secret[i]) {
      feedback[i] = 'exact';
    } else {
      secretPool.push(secret[i]);
      guessPool.push(guess[i]);
    }
  }

  for (let i = 0; i < size; i += 1) {
    if (feedback[i] === 'exact') continue;
    const matchIndex = secretPool.indexOf(guess[i]);
    if (matchIndex !== -1) {
      feedback[i] = 'present';
      secretPool.splice(matchIndex, 1);
    }
  }

  return feedback;
}

export function isCodeCorrect(feedback: CodeFeedback[]): boolean {
  return feedback.every((item) => item === 'exact');
}
