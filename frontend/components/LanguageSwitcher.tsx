'use client';

import { useLocale } from '@/hooks/useLocale';
import type { Locale } from '@/hooks/useLocale';

const flags: Record<Locale, string> = { es: '🇲🇽', en: '🇺🇸' };
const labels: Record<Locale, string> = { es: 'ES', en: 'EN' };

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const next: Locale = locale === 'es' ? 'en' : 'es';

  return (
    <button
      onClick={() => setLocale(next)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors ${className}`}
      aria-label={`Switch to ${labels[next]}`}
      title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
    >
      <span className="text-base leading-none">{flags[locale]}</span>
      <span>{labels[locale]}</span>
    </button>
  );
}
