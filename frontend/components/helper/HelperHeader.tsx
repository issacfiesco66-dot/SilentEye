'use client';

export type HelperStatus = 'disponible' | 'asignado' | 'en_ruta' | 'offline';

const STATUS_LABELS: Record<HelperStatus, string> = {
  disponible: 'Disponible',
  asignado: 'Asignado',
  en_ruta: 'En ruta',
  offline: 'Offline',
};

const STATUS_COLORS: Record<HelperStatus, string> = {
  disponible: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  asignado: 'bg-amber-50 text-amber-600 border border-amber-100',
  en_ruta: 'bg-blue-50 text-blue-600 border border-blue-100',
  offline: 'bg-zinc-100 text-zinc-500',
};

interface HelperHeaderProps {
  status: HelperStatus;
  onLogout: () => void;
}

export default function HelperHeader({ status, onLogout }: HelperHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-zinc-100 px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-900">SilentEye</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}
          title={`Estado: ${STATUS_LABELS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <button
        onClick={onLogout}
        className="text-zinc-400 hover:text-zinc-600 text-[13px] font-medium py-1 px-2 transition-colors"
        aria-label="Cerrar sesión"
      >
        Salir
      </button>
    </header>
  );
}
