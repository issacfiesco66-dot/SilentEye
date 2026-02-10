'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MapView from '../MapView';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Location {
  imei?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  plate?: string;
}

export default function DriverMyVehiclesMap() {
  const router = useRouter();
  const [liveLocations, setLiveLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/gps/my-positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLiveLocations(data);
        setError(null);
      } else {
        setError('No se pudieron cargar las posiciones');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  if (loading && liveLocations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Cargando tus vehículos...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Mis vehículos</h2>
        <p className="text-slate-500 text-sm mt-1">
          Ubicación en tiempo real de tus vehículos asignados
        </p>
      </div>
      {error && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          {error}
        </div>
      )}
      {liveLocations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-slate-400">No hay posiciones recientes de tus vehículos</p>
          <p className="text-slate-500 text-sm mt-2">
            Asegúrate de tener vehículos asignados y que el GPS esté enviando datos
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-slate-700">
          <MapView
            incidents={[]}
            liveLocations={liveLocations}
            selectedId={null}
            onSelectIncident={() => {}}
          />
        </div>
      )}
    </div>
  );
}
