'use client';

import dynamic from 'next/dynamic';

interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  plate?: string;
  status?: string;
}

interface Location {
  imei?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  plate?: string;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const MapboxMap = dynamic(() => import('./MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-300">
      Cargando mapa…
    </div>
  ),
});

export default function MapView({
  incidents,
  liveLocations,
  selectedId,
  onSelectIncident,
}: {
  incidents: Incident[];
  liveLocations: Location[];
  selectedId: string | null;
  onSelectIncident: (id: string | null) => void;
}) {
  const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'attending');

  if (!TOKEN) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-700 text-slate-300 p-4">
        <p className="mb-4">Vista de mapa</p>
        <p className="text-sm mb-4">Añade NEXT_PUBLIC_MAPBOX_TOKEN en .env.local para habilitar Mapbox</p>
        {activeIncidents.length > 0 && (
          <div className="text-left w-full">
            <p className="font-medium text-white mb-2">Incidentes activos:</p>
            {activeIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className="p-2 rounded bg-slate-600 mb-2 cursor-pointer hover:bg-slate-500"
              >
                {inc.plate || 'Sin placa'} - {inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <MapboxMap
        token={TOKEN}
        incidents={incidents}
        liveLocations={liveLocations}
        selectedId={selectedId}
        onSelectIncident={onSelectIncident}
      />
    </div>
  );
}
