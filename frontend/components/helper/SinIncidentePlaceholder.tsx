'use client';

interface SinIncidentePlaceholderProps {
  wsConnected: boolean;
}

export default function SinIncidentePlaceholder({ wsConnected }: SinIncidentePlaceholderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div
        className={`w-4 h-4 rounded-full mb-4 ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}
        title={wsConnected ? 'Conectado' : 'Desconectado'}
      />
      <p className="text-slate-400 text-lg">
        {wsConnected ? 'Sin alertas asignadas' : 'Sin conexión. Revisa tu red.'}
      </p>
      <p className="text-slate-500 text-sm mt-2">
        {wsConnected ? 'Esperando próximas alertas de pánico.' : 'Conecta para recibir alertas.'}
      </p>
    </div>
  );
}
