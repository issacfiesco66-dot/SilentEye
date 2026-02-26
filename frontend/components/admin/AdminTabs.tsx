'use client';

type Tab = 'incidents' | 'alerts' | 'gps_activity' | 'map' | 'vehicles' | 'drivers';

interface AdminTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'incidents', label: 'Incidentes' },
  { id: 'alerts', label: 'Alertas GPS' },
  { id: 'gps_activity', label: 'Actividad GPS' },
  { id: 'map', label: 'Mapa en vivo' },
  { id: 'vehicles', label: 'Vehículos' },
  { id: 'drivers', label: 'Conductores' },
];

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
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
