'use client';

import dynamic from 'next/dynamic';

const RiskMap = dynamic(() => import('./RiskMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-500 text-sm">
      Cargando mapa…
    </div>
  ),
});

export default function RiskMapClient() {
  return <RiskMap />;
}
