import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Locale, LocalePreference } from '@/lib/i18n/translations';
import { translate, translateArray } from '@/lib/i18n/translations';
import {
  loadLocalePreference,
  resolveLocale,
  saveLocalePreference,
  formatDate as formatDateFn,
} from '@/lib/i18n/locale';

interface LocaleContextValue {
  locale: Locale;
  preference: LocalePreference;
  setPreference: (pref: LocalePreference) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  formatDate: (date: string | Date) => string;
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ko',
  preference: 'system',
  setPreference: async () => {},
  t: (key) => key,
  tArray: () => [],
  formatDate: (d) => String(d),
  ready: false,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>('system');
  // Stable default for SSR / first paint — updated after mount to avoid hydration mismatch.
  const [locale, setLocale] = useState<Locale>('ko');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLocalePreference().then((pref) => {
      setPreferenceState(pref);
      setLocale(resolveLocale(pref));
      setReady(true);
    });
  }, []);

  const setPreference = useCallback(async (pref: LocalePreference) => {
    await saveLocalePreference(pref);
    setPreferenceState(pref);
    setLocale(resolveLocale(pref));
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  );

  const tArray = useCallback(
    (key: string) => translateArray(locale, key),
    [locale]
  );

  const formatDate = useCallback((date: string | Date) => formatDateFn(locale, date), [locale]);

  return (
    <LocaleContext.Provider value={{ locale, preference, setPreference, t, tArray, formatDate, ready }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
