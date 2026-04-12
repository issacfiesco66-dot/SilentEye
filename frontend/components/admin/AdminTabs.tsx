'use client';

import { useLocale } from '@/hooks/useLocale';

export type Tab = 'incidents' | 'alerts' | 'gps_activity' | 'map' | 'vehicles' | 'drivers' | 'comandancia';

interface AdminTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const { t } = useLocale();

  const TABS: { id: Tab; label: string }[] = [
    { id: 'incidents', label: t.admin.tabs.incidents },
    { id: 'alerts', label: t.admin.tabs.alerts },
    { id: 'gps_activity', label: t.admin.gpsActivity.title },
    { id: 'map', label: t.common.realTime },
    { id: 'vehicles', label: t.common.vehicles },
    { id: 'drivers', label: t.admin.tabs.drivers },
    { id: 'comandancia', label: t.admin.tabs.comandancia },
  ];

  return (
    <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg overflow-x-auto scrollbar-hide max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-3 md:px-4 py-2 rounded-md text-[13px] font-semibold transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
