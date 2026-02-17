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
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        Cargando tus vehículos...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-bold text-zinc-900">Mis vehículos</h2>
        <span className="text-[11px] text-zinc-400">
          Tiempo real{liveLocations.length === 0 && ' · Sin posiciones'}
        </span>
      </div>
      {error && (
        <div className="px-3 py-1.5 rounded-md bg-amber-50 border border-amber-100 text-amber-600 text-xs">
          {error}
        </div>
      )}
      <div className="w-full rounded-lg overflow-hidden border border-zinc-200/80 bg-zinc-50" style={{ height: 'calc(100vh - 140px)' }}>
        <MapView
          incidents={[]}
          liveLocations={liveLocations}
          selectedId={null}
          onSelectIncident={() => {}}
        />
      </div>
    </div>
  );
}
