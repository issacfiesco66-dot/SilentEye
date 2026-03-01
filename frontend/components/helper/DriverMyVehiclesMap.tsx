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

  const activeCount = liveLocations.filter((v) => !v.parkedAt).length;
  const parkedCount = liveLocations.filter((v) => !!v.parkedAt).length;

  return (
    <div className="flex-1 flex flex-col gap-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900">Mis vehículos</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {liveLocations.length === 0
              ? 'Sin vehículos asignados'
              : `${activeCount} activo${activeCount !== 1 ? 's' : ''} · ${parkedCount} estacionado${parkedCount !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-zinc-400 font-medium">Tiempo real</span>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-xs flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          {error}
        </div>
      )}

      {/* Vehicle cards */}
      {liveLocations.length > 0 && (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          {liveLocations.map((v) => {
            const isParked = !!v.parkedAt;
            const isToggling = toggling === v.vehicleId;
            return (
              <div
                key={v.vehicleId || v.imei}
                className={`relative p-3.5 rounded-xl border transition-all ${
                  isParked
                    ? 'bg-blue-50/60 border-blue-200/80'
                    : 'bg-white border-zinc-200 shadow-sm shadow-zinc-100'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isParked ? 'bg-blue-100' : 'bg-zinc-100'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isParked ? '#2563eb' : '#71717a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 text-sm truncate">{v.plate || v.imei}</div>
                      <div className="text-[11px] mt-0.5">
                        {isParked ? (
                          <span className="text-blue-600 font-medium">Estacionado</span>
                        ) : (
                          <span className="text-zinc-400">{v.speed ?? 0} km/h</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => v.vehicleId && togglePark(v.vehicleId, isParked)}
                    disabled={isToggling || !v.vehicleId}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      isToggling ? 'opacity-50 cursor-wait' :
                      isParked
                        ? 'bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95'
                        : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                    }`}
                  >
                    {isToggling ? '...' : isParked ? 'Desestacionar' : 'Estacionar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {liveLocations.length === 0 && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
          <p className="text-zinc-500 text-sm font-semibold">Sin vehículos asignados</p>
          <p className="text-zinc-400 text-xs mt-1 max-w-[220px]">Contacta al administrador para que te asigne un vehículo.</p>
        </div>
      )}

      {/* Map */}
      {liveLocations.length > 0 && (
        <div className="h-[50vh] min-h-[300px] rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm shadow-zinc-100">
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
