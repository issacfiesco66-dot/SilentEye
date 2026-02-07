'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IncidentDetail from './IncidentDetail';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export interface Incident {
  id: string;
  status: string;
  plate?: string;
  driver_name?: string;
  started_at: string;
  latitude: number;
  longitude: number;
  imei?: string;
  vehicle_id?: string;
  driver_id?: string;
}

export default function IncidentesSection() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${API}/api/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setError('No autorizado');
        router.replace('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      } else {
        setError('Error al cargar incidentes');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleStatusChange = () => {
    fetchIncidents();
    setSelectedIncidentId(null);
  };

  // Ordenar por fecha DESC (más recientes primero) - la API ya devuelve ordenado, pero garantizamos
  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  if (loading) {
    return (
      <div className="p-6 text-slate-400">Cargando incidentes...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Incidentes</h2>
        <button
          onClick={fetchIncidents}
          className="px-3 py-1.5 text-sm bg-slate-600 rounded-lg hover:bg-slate-500"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <ul className="divide-y divide-slate-700 border border-slate-700 rounded-xl overflow-hidden">
        {sortedIncidents.length === 0 ? (
          <li className="p-6 text-slate-500 text-center">No hay incidentes</li>
        ) : (
          sortedIncidents.map((inc) => (
            <li
              key={inc.id}
              onClick={() => setSelectedIncidentId(inc.id)}
              className={`p-4 flex justify-between items-center hover:bg-slate-800/50 cursor-pointer ${
                inc.status === 'active' ? 'bg-red-500/5 border-l-4 border-l-red-500' : ''
              }`}
            >
              <div>
                <span className="font-medium text-white">{inc.plate || 'Sin placa'}</span>
                <p className="text-slate-500 text-sm">{inc.driver_name || 'Sin conductor'}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(inc.started_at).toLocaleString('es')} · {inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  inc.status === 'active'
                    ? 'bg-red-500/20 text-red-400'
                    : inc.status === 'attending'
                    ? 'bg-amber-500/20 text-amber-400'
                    : inc.status === 'resolved'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {inc.status}
              </span>
            </li>
          ))
        )}
      </ul>

      {selectedIncidentId && (
        <IncidentDetail
          incidentId={selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
