'use client';

type Tab = 'incidents' | 'alerts' | 'map' | 'vehicles' | 'drivers';

interface AdminTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'incidents', label: 'Incidentes' },
  { id: 'alerts', label: 'Alertas GPS' },
  { id: 'map', label: 'Mapa en vivo' },
  { id: 'vehicles', label: 'Vehículos' },
  { id: 'drivers', label: 'Conductores' },
];

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
