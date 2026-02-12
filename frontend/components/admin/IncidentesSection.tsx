'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import IncidentDetail from './IncidentDetail';
import { useWebSocket } from '@/hooks/useWebSocket';
import { playAlarmSound, initAudioOnInteraction } from '@/utils/alarm';

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setError(null);
    setRefreshing(true);
    try {
      const res = await fetch(`${API}/api/incidents`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    initAudioOnInteraction();
    fetchIncidents();
    // Polling every 10s as fallback
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time: listen for panic events via WebSocket
  const wsToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  useWebSocket({
    token: wsToken,
    enabled: !!wsToken,
    onMessage: useCallback((msg: { type: string; payload: unknown }) => {
      if (msg.type === 'panic' && msg.payload) {
        const p = msg.payload as { incidentId?: string; plate?: string; latitude?: number; longitude?: number; timestamp?: number; nearbyCount?: number };
        if (p.incidentId) {
          setIncidents((prev) => {
            if (prev.some((inc) => inc.id === p.incidentId)) return prev;
            const newInc: Incident = {
              id: p.incidentId!,
              status: 'active',
              plate: p.plate || 'SOS Móvil',
              driver_name: '',
              started_at: new Date().toISOString(),
              latitude: p.latitude ?? 0,
              longitude: p.longitude ?? 0,
            };
            return [newInc, ...prev];
          });
          playAlarmSound();
        }
      }
    }, []),
  });

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
          disabled={refreshing}
          className={`px-3 py-1.5 text-sm rounded-lg ${refreshing ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-slate-600 hover:bg-slate-500'}`}
        >
          {refreshing ? 'Cargando...' : 'Actualizar'}
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
                  {new Date(inc.started_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
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
