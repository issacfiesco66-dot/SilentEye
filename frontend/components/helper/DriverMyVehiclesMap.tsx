'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MapView from '../MapView';

const API = '';

interface VehiclePosition {
  imei?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  plate?: string;
  parkedAt?: string | null;
}

export default function DriverMyVehiclesMap() {
  const router = useRouter();
  const [liveLocations, setLiveLocations] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null); // vehicleId being toggled

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

  const togglePark = async (vehicleId: string, isParked: boolean) => {
    const token = localStorage.getItem('token');
    if (!token || !vehicleId) return;
    setToggling(vehicleId);
    try {
      const endpoint = isParked ? 'unpark' : 'park';
      const res = await fetch(`${API}/api/vehicles/${vehicleId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        // Optimistic update
        setLiveLocations((prev) =>
          prev.map((v) =>
            v.vehicleId === vehicleId
              ? { ...v, parkedAt: isParked ? null : new Date().toISOString() }
              : v
          )
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al cambiar estado');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setToggling(null);
    }
  };

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

      {/* Vehicle cards with park toggle */}
      {liveLocations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {liveLocations.map((v) => {
            const isParked = !!v.parkedAt;
            const isToggling = toggling === v.vehicleId;
            return (
              <div
                key={v.vehicleId || v.imei}
                className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  isParked
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-zinc-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 truncate">{v.plate || v.imei}</div>
                  <div className="text-zinc-400 text-[10px]">
                    {isParked ? (
                      <span className="text-blue-600 font-medium">Estacionado</span>
                    ) : (
                      <span>{v.speed ?? 0} km/h</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => v.vehicleId && togglePark(v.vehicleId, isParked)}
                  disabled={isToggling || !v.vehicleId}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    isToggling ? 'opacity-50 cursor-wait' :
                    isParked
                      ? 'bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95'
                      : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                  }`}
                >
                  {isToggling ? '...' : isParked ? 'Desestacionar' : 'Estacionar'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="w-full rounded-lg overflow-hidden border border-zinc-200/80 bg-zinc-50" style={{ height: 'calc(100vh - 200px)' }}>
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
