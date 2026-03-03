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
  driver_name?: string;
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

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export default function FleetDashboard() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add vehicle form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPlate, setAddPlate] = useState('');
  const [addImei, setAddImei] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit vehicle
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlate, setEditPlate] = useState('');
  const [editName, setEditName] = useState('');
  const [editImei, setEditImei] = useState('');
  const [saving, setSaving] = useState(false);

  // Assign driver
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignPhone, setAssignPhone] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assigningDriver, setAssigningDriver] = useState(false);

  const [historyVehicle, setHistoryVehicle] = useState<{ id: string; plate: string } | null>(null);
  const [showGeofences, setShowGeofences] = useState(false);
  const [geofences, setGeofences] = useState<{ latitude: number; longitude: number; radius_m: number; name: string }[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchVehicles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.replace('/login');
        return;
      }
      if (res.ok) {
        setVehicles(await res.json());
      }
    } catch {
      setError('Error al cargar vehículos');
    }
  }, [token, router]);

  const fetchPositions = useCallback(async () => {
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
      // silent — positions are supplementary
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchGeofences = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/geofences`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setGeofences(await res.json());
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    fetchVehicles();
    fetchPositions();
    fetchGeofences();
  }, [fetchVehicles, fetchPositions, fetchGeofences]);

  useEffect(() => {
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const handleAddVehicle = async () => {
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
        fetchPositions();
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

  const handleEditVehicle = async (id: string) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate: editPlate.trim(), name: editName.trim() || null, imei: editImei.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchVehicles();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al editar vehículo');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!token || !confirm('¿Eliminar este vehículo? Esta acción no se puede deshacer.')) return;
    setError(null);
    try {
      const res = await fetch(`${API}/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchVehicles();
        fetchPositions();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al eliminar');
      }
    } catch {
      setError('Error de conexión');
    }
  };

  const handleAssignDriver = async (vehicleId: string) => {
    if (!token || !assignPhone.trim() || !assignName.trim()) return;
    setAssigningDriver(true);
    setError(null);
    try {
      // Create or find the driver via fleet endpoint
      const driverRes = await fetch(`${API}/api/fleet/drivers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: assignPhone.trim(), name: assignName.trim() }),
      });
      if (!driverRes.ok) {
        const data = await driverRes.json().catch(() => ({}));
        setError(data.error || 'Error al crear conductor');
        setAssigningDriver(false);
        return;
      }
      const driver = await driverRes.json();

      // Assign driver to vehicle via fleet endpoint
      const assignRes = await fetch(`${API}/api/fleet/vehicles/${vehicleId}/driver`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driver.id }),
      });
      if (assignRes.ok) {
        setAssigningId(null);
        setAssignPhone('');
        setAssignName('');
        fetchVehicles();
      } else {
        const data = await assignRes.json().catch(() => ({}));
        setError(data.error || 'Error al asignar conductor');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setAssigningDriver(false);
    }
  };

  const handleUnassignDriver = async (vehicleId: string) => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${API}/api/fleet/vehicles/${vehicleId}/driver`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: null }),
      });
      if (res.ok) fetchVehicles();
    } catch {
      setError('Error de conexión');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  };

  const activeCount = positions.filter(p => !p.parkedAt).length;
  const parkedCount = positions.filter(p => !!p.parkedAt).length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-zinc-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <span className="text-sm font-bold tracking-tight">SilentEye</span>
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">FLOTILLA</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Floating SOS */}
      <a href="/sos" className="fixed bottom-4 right-4 z-50 w-11 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center justify-center shadow-md shadow-red-600/20 hover:scale-105 active:scale-95 transition-all">SOS</a>

      <main className="flex-1 flex flex-col p-4 gap-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">Cargando flotilla...</div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">Mi flotilla</h1>
                <p className="text-[11px] text-zinc-400">
                  {vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''}
                  {positions.length > 0 && ` · ${activeCount} activo${activeCount !== 1 ? 's' : ''} · ${parkedCount} estacionado${parkedCount !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGeofences(true)}
                  className="px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-[12px] font-semibold hover:bg-amber-200 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                  Geocercas
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-[12px] font-semibold hover:bg-zinc-700 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  Agregar GPS
                </button>
              </div>
            </div>

            {/* Add form */}
            {showAddForm && (
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-zinc-900">Nuevo vehículo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={addPlate} onChange={e => setAddPlate(e.target.value)} placeholder="Placa *" maxLength={20} className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
                  <input value={addImei} onChange={e => setAddImei(e.target.value.replace(/\D/g, ''))} placeholder="IMEI GPS (15 dígitos) *" maxLength={15} className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
                  <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Nombre (opcional)" maxLength={100} className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddVehicle} disabled={adding || !addPlate.trim() || addImei.trim().length !== 15} className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-[12px] font-semibold hover:bg-zinc-700 active:scale-95 transition-all disabled:opacity-40">
                    {adding ? 'Agregando...' : 'Agregar'}
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-zinc-500 text-[12px] font-semibold hover:bg-zinc-100 transition-all">Cancelar</button>
                </div>
              </div>
            )}

            {error && (
              <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-xs flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                {error}
                <button onClick={() => setError(null)} className="ml-auto text-amber-500 hover:text-amber-700 font-bold">×</button>
              </div>
            )}

            {/* Map */}
            {positions.length > 0 && (
              <div className="h-[45vh] min-h-[280px] rounded-xl overflow-hidden border border-zinc-200/80 shadow-sm">
                <MapView
                  incidents={[]}
                  liveLocations={positions}
                  selectedId={null}
                  onSelectIncident={() => {}}
                  geofences={geofences}
                />
              </div>
            )}

            {/* Vehicle list */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {vehicles.map(v => {
                const pos = positions.find(p => p.vehicleId === v.id || p.imei === v.imei);
                const isParked = !!v.parked_at;
                const isEditing = editingId === v.id;
                const isAssigning = assigningId === v.id;

                return (
                  <div key={v.id} className={`p-4 rounded-xl border transition-all ${isParked ? 'bg-blue-50/60 border-blue-200/80' : 'bg-white border-zinc-200 shadow-sm'}`}>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input value={editPlate} onChange={e => setEditPlate(e.target.value)} placeholder="Placa" className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
                        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre" className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
                        <input value={editImei} onChange={e => setEditImei(e.target.value.replace(/\D/g, ''))} placeholder="IMEI" maxLength={15} className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400" />
                        <div className="flex gap-2">
                          <button onClick={() => handleEditVehicle(v.id)} disabled={saving} className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold hover:bg-zinc-700 disabled:opacity-40">{saving ? '...' : 'Guardar'}</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-zinc-500 text-[11px] font-semibold hover:bg-zinc-100">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 text-sm truncate">{v.plate}</div>
                            {v.name && <div className="text-[11px] text-zinc-400 truncate">{v.name}</div>}
                            <div className="text-[10px] text-zinc-300 mt-0.5 font-mono">{v.imei}</div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => setHistoryVehicle({ id: v.id, plate: v.plate })}
                              className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                              title="Historial"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </button>
                            <button
                              onClick={() => { setEditingId(v.id); setEditPlate(v.plate); setEditName(v.name || ''); setEditImei(v.imei); }}
                              className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                              title="Editar"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                              title="Eliminar"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                          {pos ? (
                            <>
                              <div className={`w-1.5 h-1.5 rounded-full ${isParked ? 'bg-blue-500' : 'bg-emerald-500 animate-pulse'}`} />
                              <span className={isParked ? 'text-blue-600 font-medium' : 'text-zinc-500'}>
                                {isParked ? 'Estacionado' : `${pos.speed ?? 0} km/h`}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                              <span className="text-zinc-400">Sin señal GPS</span>
                            </>
                          )}
                        </div>

                        {/* Driver */}
                        <div className="mt-2 pt-2 border-t border-zinc-100">
                          {v.driver_name ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                                <span className="text-[11px] text-zinc-600 font-medium">{v.driver_name}</span>
                              </div>
                              <button
                                onClick={() => handleUnassignDriver(v.id)}
                                className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : isAssigning ? (
                            <div className="space-y-2">
                              <input value={assignName} onChange={e => setAssignName(e.target.value)} placeholder="Nombre del conductor" className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-[12px] focus:outline-none focus:border-zinc-400" />
                              <input value={assignPhone} onChange={e => setAssignPhone(e.target.value)} placeholder="Teléfono (ej: +52...)" className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-[12px] focus:outline-none focus:border-zinc-400" />
                              <div className="flex gap-1.5">
                                <button onClick={() => handleAssignDriver(v.id)} disabled={assigningDriver || !assignPhone.trim() || !assignName.trim()} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-500 disabled:opacity-40">
                                  {assigningDriver ? '...' : 'Asignar'}
                                </button>
                                <button onClick={() => { setAssigningId(null); setAssignPhone(''); setAssignName(''); }} className="px-3 py-1 rounded-lg text-zinc-500 text-[10px] font-semibold hover:bg-zinc-100">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssigningId(v.id)}
                              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                              Asignar conductor
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {vehicles.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                </div>
                <p className="text-zinc-500 text-sm font-semibold">Tu flotilla está vacía</p>
                <p className="text-zinc-400 text-xs mt-1 max-w-[240px]">Presiona &quot;Agregar GPS&quot; para registrar tu primer vehículo.</p>
              </div>
            )}
          </>
        )}
      </main>

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
