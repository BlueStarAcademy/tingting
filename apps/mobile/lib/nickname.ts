import { validateNickname, type NicknameValidationError } from '@tingting/shared';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function nicknameErrorMessage(error: NicknameValidationError, t: Translate): string {
  switch (error) {
    case 'empty':
      return t('profile.nicknameRequired');
    case 'too_short':
      return t('profile.nicknameTooShort');
    case 'too_long':
      return t('profile.nicknameTooLong');
  }
}

export { clampNicknameInput, getNicknameLength, validateNickname } from '@tingting/shared';
