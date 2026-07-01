import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale, LocalePreference } from './translations';

const STORAGE_KEY = '@tingting/locale-preference';

export function getDeviceLocale(): Locale {
  let tag = 'ko';

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    tag = navigator.language;
  } else if (Platform.OS === 'ios') {
    const settings = NativeModules.SettingsManager?.settings;
    tag = settings?.AppleLocale ?? settings?.AppleLanguages?.[0] ?? 'ko';
  } else if (Platform.OS === 'android') {
    tag = NativeModules.I18nManager?.localeIdentifier ?? 'ko';
  }

  return tag.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function resolveLocale(preference: LocalePreference): Locale {
  if (preference === 'system') return getDeviceLocale();
  return preference;
}

export async function loadLocalePreference(): Promise<LocalePreference> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'ko' || raw === 'en' || raw === 'system') return raw;
  return 'system';
}

export async function saveLocalePreference(preference: LocalePreference): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, preference);
}

export function formatDate(locale: Locale, date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
}
