'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface GpsRecord {
  imei: string;
  vehicleId?: string;
  plate?: string;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  satellites: number;
  timestampAt: string;
  din1: number | null;
  priority: number;
}

export default function GpsActivitySection() {
  const router = useRouter();
  const [records, setRecords] = useState<GpsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${API}/api/gps/activity?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.replace('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        setError('Error al cargar actividad GPS');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time: refresh on new location data
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  useWebSocket({
    token,
    enabled: !!token,
    onMessage: useCallback((msg: { type: string }) => {
      if (msg.type === 'location') {
        fetchActivity();
      }
    }, []),
  });

  if (loading) {
    return <div className="p-6 text-zinc-400">Cargando actividad GPS...</div>;
  }

  const priorityLabel = (p: number) => {
    if (p === 2) return { text: 'PANIC', cls: 'bg-red-50 text-red-600 border-red-100' };
    if (p === 1) return { text: 'HIGH', cls: 'bg-amber-50 text-amber-600 border-amber-100' };
    return { text: 'LOW', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
  };

  const timeAgo = (ts: string) => {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-bold text-zinc-900">Actividad GPS en vivo</h2>
        <button
          onClick={fetchActivity}
          className="px-3 py-1.5 text-[13px] font-medium bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="p-6 text-zinc-400 text-center border border-zinc-200 rounded-xl">
          No hay registros GPS recientes
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-zinc-200 p-3">
              <p className="text-xs text-zinc-400 font-medium">Dispositivos</p>
              <p className="text-xl font-bold text-zinc-900">
                {new Set(records.map((r) => r.imei)).size}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-3">
              <p className="text-xs text-zinc-400 font-medium">Último dato</p>
              <p className="text-xl font-bold text-zinc-900">
                {records[0] ? timeAgo(records[0].timestampAt) : '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-3">
              <p className="text-xs text-zinc-400 font-medium">Satélites</p>
              <p className="text-xl font-bold text-zinc-900">
                {records[0]?.satellites ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-zinc-200 p-3">
              <p className="text-xs text-zinc-400 font-medium">DIN1 (Pánico)</p>
              <p className={`text-xl font-bold ${records[0]?.din1 === 1 ? 'text-red-600' : 'text-emerald-600'}`}>
                {records[0]?.din1 === 1 ? 'ACTIVO' : records[0]?.din1 === 0 ? 'Normal' : '-'}
              </p>
            </div>
          </div>

          {/* Records table */}
          <div className="overflow-x-auto border border-zinc-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Placa / IMEI</th>
                  <th className="text-left px-3 py-2 font-medium">Ubicación</th>
                  <th className="text-left px-3 py-2 font-medium">Vel.</th>
                  <th className="text-left px-3 py-2 font-medium">Sat</th>
                  <th className="text-left px-3 py-2 font-medium">DIN1</th>
                  <th className="text-left px-3 py-2 font-medium">Prioridad</th>
                  <th className="text-left px-3 py-2 font-medium">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.map((r, idx) => {
                  const pri = priorityLabel(r.priority);
                  return (
                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-zinc-900">
                        {r.plate || r.imei}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">
                        {r.latitude !== 0 || r.longitude !== 0
                          ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`
                          : <span className="text-amber-500">Sin fix GPS</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{r.speed} km/h</td>
                      <td className="px-3 py-2">
                        <span className={`font-medium ${r.satellites > 3 ? 'text-emerald-600' : r.satellites > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                          {r.satellites}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.din1 === 1 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-100">ACTIVO</span>
                        ) : r.din1 === 0 ? (
                          <span className="text-zinc-400">0</span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${pri.cls}`}>
                          {pri.text}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(r.timestampAt).toLocaleString('es-MX', {
                          timeZone: 'America/Mexico_City',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                        <br />
                        <span className="text-zinc-300">{timeAgo(r.timestampAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
