'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MapView from '../MapView';
import TripHistory from '../TripHistory';
import GeofenceManager from '../GeofenceManager';

const API = '';

interface Vehicle {
  id: string;
  plate: string;
  name?: string;
  imei: string;
  driver_id?: string;
  owner_id?: string;
  parked_at?: string | null;
}

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPlate, setAddPlate] = useState('');
  const [addImei, setAddImei] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<{ id: string; plate: string } | null>(null);
  const [geofences, setGeofences] = useState<{ latitude: number; longitude: number; radius_m: number; name: string }[]>([]);
  const [showGeofences, setShowGeofences] = useState(false);

  const fetchVehicles = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.replace('/login'); return; }
      if (res.ok) {
        setVehicles(await res.json());
      }
    } catch { /* silent */ }
  }, [router]);

  const fetchPositions = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/gps/my-positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPositions(await res.json());
        setError(null);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchPositions();
  }, [fetchVehicles, fetchPositions]);

  useEffect(() => {
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Fetch geofences for map display
  const fetchGeofences = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/geofences`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setGeofences(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchGeofences(); }, [fetchGeofences]);

  // Merge: all vehicles from /api/vehicles, enriched with GPS positions
  const liveLocations: VehiclePosition[] = vehicles.map((v) => {
    const pos = positions.find((p) => p.vehicleId === v.id || p.imei === v.imei);
    return {
      imei: v.imei,
      vehicleId: v.id,
      plate: v.plate || v.name || v.imei,
      latitude: pos?.latitude ?? 0,
      longitude: pos?.longitude ?? 0,
      speed: pos?.speed ?? 0,
      parkedAt: pos?.parkedAt ?? v.parked_at ?? null,
    };
  });

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
        // Optimistic update on the vehicles list (liveLocations is derived)
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicleId
              ? { ...v, parked_at: isParked ? null : new Date().toISOString() }
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

  const handleAddVehicle = async () => {
    const token = localStorage.getItem('token');
    if (!token || !addPlate.trim() || !addImei.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/vehicles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate: addPlate.trim(), imei: addImei.trim(), name: addName.trim() || null }),
      });
      if (res.ok) {
        setAddPlate(''); setAddImei(''); setAddName(''); setShowAddForm(false);
        fetchVehicles();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al agregar vehículo');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setAdding(false);
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-medium">Tiempo real</span>
          </div>
          <button
            onClick={() => setShowGeofences(true)}
            className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center hover:bg-amber-200 active:scale-95 transition-all"
            title="Geocercas"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all"
            title="Agregar vehículo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </button>
        </div>
      </div>

      {/* Add vehicle form */}
      {showAddForm && (
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-900">Agregar vehículo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={addPlate} onChange={(e) => setAddPlate(e.target.value)}
              placeholder="Placa *" maxLength={20}
              className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
            />
            <input
              value={addImei} onChange={(e) => setAddImei(e.target.value.replace(/\D/g, ''))}
              placeholder="IMEI del GPS (15 dígitos) *" maxLength={15}
              className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
            />
            <input
              value={addName} onChange={(e) => setAddName(e.target.value)}
              placeholder="Nombre (opcional)" maxLength={100}
              className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddVehicle}
              disabled={adding || !addPlate.trim() || addImei.trim().length !== 15}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-[12px] font-semibold hover:bg-zinc-700 active:scale-95 transition-all disabled:opacity-40"
            >
              {adding ? 'Agregando...' : 'Agregar'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-zinc-500 text-[12px] font-semibold hover:bg-zinc-100 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
                        {v.latitude === 0 && v.longitude === 0 ? (
                          <span className="text-amber-500 font-medium">Sin señal GPS</span>
                        ) : isParked ? (
                          <span className="text-blue-600 font-medium">Estacionado</span>
                        ) : (
                          <span className="text-zinc-400">{v.speed ?? 0} km/h</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => v.vehicleId && setHistoryVehicle({ id: v.vehicleId, plate: v.plate || v.imei || '' })}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:scale-95 transition-all"
                      title="Historial"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </button>
                    <button
                      onClick={() => v.vehicleId && togglePark(v.vehicleId, isParked)}
                      disabled={isToggling || !v.vehicleId}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
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

      {/* Map — only show if any vehicle has GPS data */}
      {liveLocations.some(v => v.latitude !== 0 || v.longitude !== 0) && (
        <div className="h-[50vh] min-h-[300px] rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm shadow-zinc-100">
          <MapView
            incidents={[]}
            liveLocations={liveLocations.filter(v => v.latitude !== 0 || v.longitude !== 0)}
            selectedId={null}
            onSelectIncident={() => {}}
            geofences={geofences}
          />
        </div>
      )}

      {/* Trip History Modal */}
      {historyVehicle && (
        <TripHistory
          vehicleId={historyVehicle.id}
          plate={historyVehicle.plate}
          onClose={() => setHistoryVehicle(null)}
          MapView={MapView}
        />
      )}

      {/* Geofence Manager Modal */}
      {showGeofences && (
        <GeofenceManager
          onClose={() => setShowGeofences(false)}
          onUpdate={fetchGeofences}
        />
      )}
    </div>
  );
}
