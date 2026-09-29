import { createContext, useContext, type ReactNode } from 'react';
import { translate } from '@/lib/i18n/translations';

export type Locale = 'ko';

interface LocaleContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: string | Date) => string;
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR');
}

const value: LocaleContextValue = { locale: 'ko', t: translate, formatDate };

const LocaleContext = createContext<LocaleContextValue>(value);

export function LocaleProvider({ children }: { children: ReactNode }) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
