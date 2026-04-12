'use client';

import { useLocale } from '@/hooks/useLocale';

export type HelperStatus = 'disponible' | 'asignado' | 'en_ruta' | 'offline';

const STATUS_COLORS: Record<HelperStatus, string> = {
  disponible: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  asignado: 'bg-amber-50 text-amber-600 border border-amber-100',
  en_ruta: 'bg-blue-50 text-blue-600 border border-blue-100',
  offline: 'bg-zinc-100 text-zinc-500',
};

interface HelperHeaderProps {
  status: HelperStatus;
  onLogout: () => void;
  userName?: string;
  showVehicles?: boolean;
}

export default function HelperHeader({ status, onLogout, userName }: HelperHeaderProps) {
  const { t } = useLocale();

  const STATUS_LABELS: Record<HelperStatus, string> = {
    disponible: t.helper.statusAvailable,
    asignado: t.helper.statusAssigned,
    en_ruta: t.helper.statusEnRoute,
    offline: t.helper.statusOffline,
  };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-zinc-200/60 px-4 h-12 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-zinc-900 rounded flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <span className="text-xs font-bold tracking-tight text-zinc-800">SilentEye</span>
        </div>
        {userName && (
          <span className="hidden sm:inline text-[11px] text-zinc-400 font-medium truncate max-w-[120px]">
            {userName}
          </span>
        )}
        <span
          className={`px-1.5 py-px rounded text-[10px] font-semibold ${STATUS_COLORS[status]}`}
          title={`Estado: ${STATUS_LABELS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <button
        onClick={onLogout}
        className="text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors"
        aria-label={t.helper.closeSession}
      >
        {t.common.logout}
      </button>
    </header>
  );
}
