'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface IncidentDetailData {
  id: string;
  status: string;
  plate?: string;
  driver_name?: string;
  started_at: string;
  latitude: number;
  longitude: number;
  imei?: string;
  followers?: { name: string; status: string }[];
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'attending', label: 'Atendiendo' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'cancelled', label: 'Cancelado' },
] as const;

export default function IncidentDetail({
  incidentId,
  onClose,
  onStatusChange,
}: {
  incidentId: string;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const router = useRouter();
  const [incident, setIncident] = useState<IncidentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    fetch(`${API}/api/incidents/${incidentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace('/login');
          throw new Error('No autorizado');
        }
        if (!res.ok) throw new Error('Error al cargar');
        return res.json();
      })
      .then(setIncident)
      .catch((e) => e.message !== 'No autorizado' && setError('Error al cargar detalle'))
      .finally(() => setLoading(false));
  }, [incidentId, router]);

  const updateStatus = async (status: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/incidents/${incidentId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401 || res.status === 403) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al actualizar');
        return;
      }
      onStatusChange();
    } catch {
      setError('Error de conexión');
    } finally {
      setUpdating(false);
    }
  };

  const googleMapsUrl = incident
    ? `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`
    : '';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Detalle del incidente</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-slate-400 text-center">Cargando...</div>
        ) : incident ? (
          <div className="space-y-4">
            {error && (
              <div className="p-2 rounded bg-red-500/10 text-red-400 text-sm">{error}</div>
            )}

            <div>
              <p className="text-slate-400 text-sm">Estado actual</p>
              <p className="font-medium capitalize">{incident.status}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Placa</p>
              <p className="font-medium">{incident.plate || 'Sin placa'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Conductor</p>
              <p className="font-medium">{incident.driver_name || 'Sin asignar'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Fecha de inicio</p>
              <p>{new Date(incident.started_at).toLocaleString('es')}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Coordenadas (lat / lng)</p>
              <p>
                {incident.latitude?.toFixed(6)}, {incident.longitude?.toFixed(6)}
              </p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm"
              >
                Abrir en Google Maps →
              </a>
            </div>

            {incident.followers && incident.followers.length > 0 && (
              <div>
                <p className="text-slate-400 text-sm">Helpers asignados</p>
                <ul className="space-y-1">
                  {incident.followers.map((f, i) => (
                    <li key={i} className="text-sm">
                      {f.name} ({f.status})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-slate-400 text-sm mb-2">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus(opt.value)}
                    disabled={updating || incident.status === opt.value}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      incident.status === opt.value
                        ? 'bg-slate-600 text-slate-300'
                        : 'bg-slate-700 hover:bg-slate-600'
                    } disabled:opacity-50`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-slate-400 text-center">No se encontró el incidente</div>
        )}
      </div>
    </div>
  );
}
