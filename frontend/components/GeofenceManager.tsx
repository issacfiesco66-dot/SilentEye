'use client';

import { useState, useEffect, useCallback } from 'react';

const API = '';

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  alert_on_exit: boolean;
  alert_on_enter: boolean;
  is_active: boolean;
  created_at: string;
}

interface Props {
  onClose: () => void;
  onUpdate: () => void;
}

export default function GeofenceManager({ onClose, onUpdate }: Props) {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('500');
  const [alertExit, setAlertExit] = useState(true);
  const [alertEnter, setAlertEnter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchGeofences = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/geofences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setGeofences(await res.json());
    } catch {
      setError('Error al cargar geocercas');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchGeofences(); }, [fetchGeofences]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Geolocalización no disponible'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGettingLocation(false);
      },
      () => { setError('No se pudo obtener ubicación'); setGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAdd = async () => {
    if (!token || !name.trim() || !lat || !lng) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/geofences`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          radius_m: parseInt(radius) || 500,
          alert_on_exit: alertExit,
          alert_on_enter: alertEnter,
        }),
      });
      if (res.ok) {
        setName(''); setLat(''); setLng(''); setRadius('500'); setShowAdd(false);
        fetchGeofences();
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al crear geocerca');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/geofences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { fetchGeofences(); onUpdate(); }
    } catch {
      setError('Error al eliminar');
    }
  };

  const handleToggle = async (g: Geofence) => {
    if (!token) return;
    try {
      await fetch(`${API}/api/geofences/${g.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !g.is_active }),
      });
      fetchGeofences();
      onUpdate();
    } catch {
      setError('Error al actualizar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Geocercas</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Recibe alertas cuando un vehículo entre o salga de una zona</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="p-4 border-b border-zinc-100 space-y-3">
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej: Casa, Oficina, Zona permitida)"
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={lat} onChange={(e) => setLat(e.target.value)}
                placeholder="Latitud" type="number" step="any"
                className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
              />
              <input
                value={lng} onChange={(e) => setLng(e.target.value)}
                placeholder="Longitud" type="number" step="any"
                className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={useCurrentLocation}
                disabled={gettingLocation}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
              >
                {gettingLocation ? 'Obteniendo...' : '📍 Usar mi ubicación'}
              </button>
              <div className="flex-1" />
              <label className="text-xs text-zinc-500">Radio:</label>
              <select
                value={radius} onChange={(e) => setRadius(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-zinc-200 text-sm"
              >
                <option value="100">100m</option>
                <option value="250">250m</option>
                <option value="500">500m</option>
                <option value="1000">1 km</option>
                <option value="2000">2 km</option>
                <option value="5000">5 km</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" checked={alertExit} onChange={() => setAlertExit(!alertExit)} className="rounded" />
                Alerta al salir
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" checked={alertEnter} onChange={() => setAlertEnter(!alertEnter)} className="rounded" />
                Alerta al entrar
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !name.trim() || !lat || !lng}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 active:scale-95 transition-all disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Crear geocerca'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-zinc-500 text-xs font-semibold hover:bg-zinc-100 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">{error}</div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <div className="text-center py-8 text-zinc-400 text-sm">Cargando...</div>}
          {!loading && geofences.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm font-semibold">Sin geocercas</p>
              <p className="text-zinc-400 text-xs mt-1">Crea una zona para recibir alertas.</p>
            </div>
          )}
          {geofences.map((g) => (
            <div key={g.id} className={`p-3 rounded-xl border transition-all ${g.is_active ? 'border-amber-200 bg-amber-50/50' : 'border-zinc-200 bg-zinc-50 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-zinc-900 truncate">{g.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {g.radius_m >= 1000 ? `${g.radius_m / 1000} km` : `${g.radius_m}m`}
                    {g.alert_on_exit && ' · Alerta al salir'}
                    {g.alert_on_enter && ' · Alerta al entrar'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggle(g)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${g.is_active ? 'bg-amber-200 text-amber-800' : 'bg-zinc-200 text-zinc-500'}`}
                  >
                    {g.is_active ? 'Activa' : 'Inactiva'}
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
