'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export interface Alert {
  id: string;
  deviceImei: string;
  vehicleId?: string;
  plate?: string;
  alertType: string;
  latitude: number;
  longitude: number;
  speed: number;
  createdAt: string;
  priority?: number;
}

export default function AlertsSection() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAlerts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${API}/api/alerts?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.replace('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      } else {
        setError('Error al cargar alertas');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDelete = async (days?: number, all?: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleting(true);
    try {
      const params = all ? '?all=1' : `?days=${days ?? 7}`;
      const res = await fetch(`${API}/api/alerts${params}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAlerts();
        alert(`Se borraron ${data.deleted} alerta(s)`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al borrar');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-400">Cargando alertas...</div>;
  }

  const priorityLabel = (p?: number) => {
    if (p === 2) return 'PANIC';
    if (p === 1) return 'HIGH';
    return 'LOW';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-xl font-semibold">Alertas GPS</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchAlerts}
            disabled={deleting}
            className="px-3 py-1.5 text-sm bg-slate-600 rounded-lg hover:bg-slate-500 disabled:opacity-50"
          >
            Actualizar
          </button>
          <button
            onClick={() => handleDelete(7)}
            disabled={deleting}
            className="px-3 py-1.5 text-sm bg-amber-600/80 rounded-lg hover:bg-amber-600 disabled:opacity-50"
          >
            Borrar &gt; 7 días
          </button>
          <button
            onClick={() => handleDelete(undefined, true)}
            disabled={deleting || alerts.length === 0}
            className="px-3 py-1.5 text-sm bg-red-600/80 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            Borrar todas
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <ul className="divide-y divide-slate-700 border border-slate-700 rounded-xl overflow-hidden">
        {alerts.length === 0 ? (
          <li className="p-6 text-slate-500 text-center">No hay alertas</li>
        ) : (
          alerts.map((a) => (
            <li key={a.id} className="p-4 flex justify-between items-start gap-4">
              <div>
                <span className="font-medium text-white">
                  {a.plate || a.deviceImei}
                </span>
                <p className="text-slate-500 text-sm">
                  {a.alertType} · IMEI {a.deviceImei}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(a.createdAt).toLocaleString('es')} ·{' '}
                  {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)} ·{' '}
                  {a.speed} km/h
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                  a.priority === 2
                    ? 'bg-red-500/20 text-red-400'
                    : a.priority === 1
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {priorityLabel(a.priority)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
