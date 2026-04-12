'use client';

import { useLocale } from '@/hooks/useLocale';

interface SinIncidentePlaceholderProps {
  wsConnected: boolean;
}

export default function SinIncidentePlaceholder({ wsConnected }: SinIncidentePlaceholderProps) {
  const { t } = useLocale();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
      <div
        className={`w-2 h-2 rounded-full mb-3 ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`}
        title={wsConnected ? t.helper.connected : t.helper.disconnected}
      />
      <p className="text-zinc-500 text-sm font-semibold">
        {wsConnected ? t.helper.noAlertsAssigned : t.helper.noConnection}
      </p>
      <p className="text-zinc-400 text-xs mt-1">
        {wsConnected ? t.helper.waitingAlerts : t.helper.checkNetwork}
      </p>
    </div>
  );
}
