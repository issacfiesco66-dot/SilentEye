'use client';

export type HelperStatus = 'disponible' | 'asignado' | 'en_ruta' | 'offline';

const STATUS_LABELS: Record<HelperStatus, string> = {
  disponible: 'Disponible',
  asignado: 'Asignado',
  en_ruta: 'En ruta',
  offline: 'Offline',
};

const STATUS_COLORS: Record<HelperStatus, string> = {
  disponible: 'bg-emerald-500/20 text-emerald-400',
  asignado: 'bg-amber-500/20 text-amber-400',
  en_ruta: 'bg-blue-500/20 text-blue-400',
  offline: 'bg-slate-500/20 text-slate-400',
};

interface HelperHeaderProps {
  status: HelperStatus;
  onLogout: () => void;
}

export default function HelperHeader({ status, onLogout }: HelperHeaderProps) {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-lg">SilentEye</h1>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}
          title={`Estado: ${STATUS_LABELS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>
      <button
        onClick={onLogout}
        className="text-slate-400 hover:text-white text-sm py-1 px-2"
        aria-label="Cerrar sesión"
      >
        Salir
      </button>
    </header>
  );
}
