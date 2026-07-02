/** 앱에서 선택 가능한 UI 언어 (18개) */
export const SUPPORTED_LOCALES = [
  { code: 'ko', label: '한국어', intlTag: 'ko-KR' },
  { code: 'en', label: 'English', intlTag: 'en-US' },
  { code: 'ja', label: '日本語', intlTag: 'ja-JP' },
  { code: 'zh-Hans', label: '中文(简体)', intlTag: 'zh-CN' },
  { code: 'zh-Hant', label: '中文(繁體)', intlTag: 'zh-TW' },
  { code: 'es', label: 'Español', intlTag: 'es-ES' },
  { code: 'fr', label: 'Français', intlTag: 'fr-FR' },
  { code: 'de', label: 'Deutsch', intlTag: 'de-DE' },
  { code: 'pt', label: 'Português', intlTag: 'pt-PT' },
  { code: 'it', label: 'Italiano', intlTag: 'it-IT' },
  { code: 'ru', label: 'Русский', intlTag: 'ru-RU' },
  { code: 'ar', label: 'العربية', intlTag: 'ar-SA' },
  { code: 'hi', label: 'हिन्दी', intlTag: 'hi-IN' },
  { code: 'id', label: 'Bahasa Indonesia', intlTag: 'id-ID' },
  { code: 'th', label: 'ไทย', intlTag: 'th-TH' },
  { code: 'vi', label: 'Tiếng Việt', intlTag: 'vi-VN' },
  { code: 'tr', label: 'Türkçe', intlTag: 'tr-TR' },
  { code: 'ms', label: 'Bahasa Melayu', intlTag: 'ms-MY' },
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number]['code'];

export const LOCALE_CODES: readonly Locale[] = SUPPORTED_LOCALES.map((l) => l.code);

const localeByCode = new Map(SUPPORTED_LOCALES.map((l) => [l.code, l]));

export function getLocaleMeta(locale: Locale) {
  return localeByCode.get(locale)!;
}

export function getIntlTag(locale: Locale): string {
  return getLocaleMeta(locale).intlTag;
}

export function getLocaleLabel(locale: Locale): string {
  return getLocaleMeta(locale).label;
}

export function isSupportedLocale(value: string): value is Locale {
  return LOCALE_CODES.includes(value as Locale);
}

/** 한국어 UI가 아니면 영문 지명/콘텐츠 우선 */
export function prefersEnglishContent(locale: Locale): boolean {
  return locale !== 'ko';
}

export function matchDeviceLocaleTag(tag: string): Locale {
  const normalized = tag.replace('_', '-').toLowerCase();

  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('zh')) {
    if (
      normalized.includes('tw') ||
      normalized.includes('hk') ||
      normalized.includes('mo') ||
      normalized.includes('hant')
    ) {
      return 'zh-Hant';
    }
    return 'zh-Hans';
  }
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('pt')) return 'pt';
  if (normalized.startsWith('it')) return 'it';
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('ar')) return 'ar';
  if (normalized.startsWith('hi')) return 'hi';
  if (normalized.startsWith('id')) return 'id';
  if (normalized.startsWith('th')) return 'th';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('tr')) return 'tr';
  if (normalized.startsWith('ms')) return 'ms';
  if (normalized.startsWith('en')) return 'en';

  const primary = normalized.split('-')[0];
  if (isSupportedLocale(primary)) return primary;

  return 'en';
}
