'use client';

interface SinIncidentePlaceholderProps {
  wsConnected: boolean;
}

export default function SinIncidentePlaceholder({ wsConnected }: SinIncidentePlaceholderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div
        className={`w-3 h-3 rounded-full mb-4 ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`}
        title={wsConnected ? 'Conectado' : 'Desconectado'}
      />
      <p className="text-zinc-500 text-lg font-semibold">
        {wsConnected ? 'Sin alertas asignadas' : 'Sin conexión. Revisa tu red.'}
      </p>
      <p className="text-zinc-400 text-sm mt-2">
        {wsConnected ? 'Esperando próximas alertas de pánico.' : 'Conecta para recibir alertas.'}
      </p>
    </div>
  );
}
