/** 닉네임 길이 (한글 기준 글자 수) */
export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 8;

export type NicknameValidationError = 'empty' | 'too_short' | 'too_long';

export function getNicknameLength(name: string): number {
  return [...name.trim()].length;
}

export function clampNicknameInput(value: string): string {
  return [...value].slice(0, NICKNAME_MAX_LENGTH).join('');
}

export function validateNickname(name: string): NicknameValidationError | null {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  const len = [...trimmed].length;
  if (len < NICKNAME_MIN_LENGTH) return 'too_short';
  if (len > NICKNAME_MAX_LENGTH) return 'too_long';
  return null;
}
