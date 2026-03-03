'use client';

import { useState, useCallback } from 'react';

const API = '';

interface TripPoint {
  lat: number;
  lng: number;
  speed: number;
  altitude: number;
  time: string;
}

interface TripSummary {
  totalPoints: number;
  distanceKm: number;
  maxSpeed: number;
  startTime: string | null;
  endTime: string | null;
}

interface Props {
  vehicleId: string;
  plate: string;
  onClose: () => void;
  MapView: React.ComponentType<any>;
}

export default function TripHistory({ vehicleId, plate, onClose, MapView }: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [points, setPoints] = useState<TripPoint[]>([]);
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (d: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/vehicles/${vehicleId}/history?date=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al cargar historial');
        return;
      }
      const data = await res.json();
      setPoints(data.points || []);
      setSummary(data.summary || null);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const handleDateChange = (d: string) => {
    setDate(d);
    fetchHistory(d);
  };

  // Load on mount
  useState(() => { fetchHistory(date); });

  const fmtTime = (iso: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  // Convert points to liveLocations format for MapView (polyline)
  const mapLocations = points.length > 0 ? [
    { latitude: points[0].lat, longitude: points[0].lng, speed: 0, plate: `Inicio ${fmtTime(summary?.startTime ?? null)}` },
    { latitude: points[points.length - 1].lat, longitude: points[points.length - 1].lng, speed: 0, plate: `Fin ${fmtTime(summary?.endTime ?? null)}` },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Historial de recorridos</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{plate}</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-zinc-400"
            />
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && summary.totalPoints > 0 && (
          <div className="px-4 py-3 grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-zinc-50 text-center">
              <div className="text-lg font-bold text-zinc-900">{summary.distanceKm}</div>
              <div className="text-[10px] text-zinc-400 font-medium">km</div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 text-center">
              <div className="text-lg font-bold text-zinc-900">{summary.maxSpeed}</div>
              <div className="text-[10px] text-zinc-400 font-medium">km/h máx</div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 text-center">
              <div className="text-lg font-bold text-zinc-900">{fmtTime(summary.startTime)}</div>
              <div className="text-[10px] text-zinc-400 font-medium">Inicio</div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 text-center">
              <div className="text-lg font-bold text-zinc-900">{fmtTime(summary.endTime)}</div>
              <div className="text-[10px] text-zinc-400 font-medium">Fin</div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Cargando...</div>
          )}
          {error && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">{error}</div>
          )}
          {!loading && points.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <p className="text-zinc-500 text-sm font-semibold">Sin recorridos</p>
              <p className="text-zinc-400 text-xs mt-1">No hay datos GPS para esta fecha.</p>
            </div>
          )}
          {!loading && points.length > 0 && (
            <div className="h-full min-h-[350px]">
              <MapView
                incidents={[]}
                liveLocations={mapLocations}
                selectedId={null}
                onSelectIncident={() => {}}
                polyline={points.map(p => [p.lat, p.lng])}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
