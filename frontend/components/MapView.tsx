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

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-slate-200 text-slate-600">
      Cargando mapa…
    </div>
  ),
});

export default function MapView({
  incidents,
  liveLocations,
  selectedId,
  onSelectIncident,
  polyline,
  geofences,
}: {
  incidents: Incident[];
  liveLocations: Location[];
  selectedId: string | null;
  onSelectIncident: (id: string | null) => void;
  polyline?: [number, number][];
  geofences?: { latitude: number; longitude: number; radius_m: number; name: string }[];
}) {
  return (
    <div className="w-full h-full">
      <LeafletMap
        incidents={incidents}
        liveLocations={liveLocations}
        selectedId={selectedId}
        onSelectIncident={onSelectIncident}
        polyline={polyline}
        geofences={geofences}
      />
    </div>
  );
}
