'use client';

interface SinIncidentePlaceholderProps {
  wsConnected: boolean;
}

export default function SinIncidentePlaceholder({ wsConnected }: SinIncidentePlaceholderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
      <div
        className={`w-2 h-2 rounded-full mb-3 ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`}
        title={wsConnected ? 'Conectado' : 'Desconectado'}
      />
      <p className="text-zinc-500 text-sm font-semibold">
        {wsConnected ? 'Sin alertas asignadas' : 'Sin conexión'}
      </p>
      <p className="text-zinc-400 text-xs mt-1">
        {wsConnected ? 'Esperando próximas alertas de pánico.' : 'Revisa tu red para recibir alertas.'}
      </p>
    </div>
  );
}
