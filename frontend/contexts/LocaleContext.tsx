'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import es from '@/i18n/es';
import en from '@/i18n/en';
import type { Translations } from '@/i18n/es';
import { installFetchCredentials } from '@/lib/fetch-credentials';

export type Locale = 'es' | 'en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const translations: Record<Locale, Translations> = { es, en };

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'es',
  setLocale: () => {},
  t: es,
});

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'es';
  const saved = localStorage.getItem('locale') as Locale | null;
  if (saved === 'en' || saved === 'es') return saved;
  const lang = navigator.language?.slice(0, 2);
  return lang === 'en' ? 'en' : 'es';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Patch the global fetch so every /api/* call sends credentials.
    // Idempotent, safe under React strict mode + HMR.
    installFetchCredentials();
    setLocaleState(detectLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  const setLocale = (l: Locale) => setLocaleState(l);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export default LocaleContext;
