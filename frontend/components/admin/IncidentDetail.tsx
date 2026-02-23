'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = '';

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

interface Responder {
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  status: string;
  joined_at: string;
  witness_volunteer: boolean | null;
  witness_requested_at: string | null;
  witness_responded_at: string | null;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'attending', label: 'En camino' },
  { value: 'localizado', label: 'Localizado' },
  { value: 'recuperado', label: 'Recuperado' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'falsa_alarma', label: 'Falsa alarma' },
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
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingWitness, setSendingWitness] = useState(false);
  const [witnessResult, setWitnessResult] = useState('');
  const [error, setError] = useState('');

  const getToken = () => {
    const t = localStorage.getItem('token');
    if (!t) router.replace('/login');
    return t;
  };

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Fetch incident + responders in parallel
    Promise.all([
      fetch(`${API}/api/incidents/${incidentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => {
        if (r.status === 401 || r.status === 403) { router.replace('/login'); throw new Error('No autorizado'); }
        if (!r.ok) throw new Error('Error al cargar');
        return r.json();
      }),
      fetch(`${API}/api/incidents/${incidentId}/responders`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : []),
    ])
      .then(([inc, resp]) => {
        setIncident(inc);
        setResponders(resp);
      })
      .catch((e) => e.message !== 'No autorizado' && setError('Error al cargar detalle'))
      .finally(() => setLoading(false));
  }, [incidentId, router]);

  const deleteIncident = async () => {
    if (!confirm('¿Eliminar este incidente? Esta acción no se puede deshacer.')) return;
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.replace('/login'); return; }
      if (res.ok) { onStatusChange(); onClose(); }
      else { const data = await res.json().catch(() => ({})); setError(data.error || 'Error al eliminar'); }
    } catch { setError('Error de conexión'); }
    finally { setDeleting(false); }
  };

  const updateStatus = async (status: string) => {
    const token = getToken();
    if (!token) return;
    setUpdating(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/incidents/${incidentId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401 || res.status === 403) { router.replace('/login'); return; }
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.error || 'Error al actualizar'); return; }
      onStatusChange();
    } catch { setError('Error de conexión'); }
    finally { setUpdating(false); }
  };

  const downloadPdf = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/incidents/${incidentId}/report.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al generar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-incidente-${incidentId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Error al descargar el reporte PDF'); }
  };

  const sendWitnessRequest = async () => {
    const token = getToken();
    if (!token) return;
    setSendingWitness(true);
    setWitnessResult('');
    try {
      const res = await fetch(`${API}/api/incidents/${incidentId}/witness-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');
      setWitnessResult(`Solicitudes enviadas: ${data.sent} de ${data.total}`);
      // Refresh responders
      const respRes = await fetch(`${API}/api/incidents/${incidentId}/responders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (respRes.ok) setResponders(await respRes.json());
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSendingWitness(false); }
  };

  const googleMapsUrl = incident
    ? `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`
    : '';

  const witnessStatusLabel = (r: Responder) => {
    if (r.witness_volunteer === true) return { text: 'Aceptó', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    if (r.witness_volunteer === false) return { text: 'Declinó', color: 'text-zinc-500 bg-zinc-50 border-zinc-200' };
    if (r.witness_requested_at) return { text: 'Pendiente', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { text: 'No solicitado', color: 'text-zinc-400 bg-zinc-50 border-zinc-100' };
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-xl w-full border border-zinc-200 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-zinc-900">Detalle del incidente</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">✕</button>
        </div>

        {loading ? (
          <div className="py-8 text-zinc-400 text-center">Cargando...</div>
        ) : incident ? (
          <div className="space-y-4">
            {error && (
              <div className="p-2 rounded bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-zinc-400 text-[13px] font-medium">Estado</p>
                <p className="font-semibold text-zinc-900 capitalize">{incident.status}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-[13px] font-medium">Placa</p>
                <p className="font-semibold text-zinc-900">{incident.plate || 'Sin placa'}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-[13px] font-medium">Conductor / Reportero</p>
                <p className="font-semibold text-zinc-900">{incident.driver_name || 'Sin asignar'}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-[13px] font-medium">Fecha de inicio</p>
                <p className="text-sm">{new Date(incident.started_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div>
              <p className="text-zinc-400 text-[13px] font-medium">Coordenadas</p>
              <p className="font-mono text-sm text-zinc-900">{incident.latitude?.toFixed(6)}, {incident.longitude?.toFixed(6)}</p>
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[13px] font-medium">
                Abrir en Google Maps →
              </a>
            </div>

            {/* Responders section */}
            <div className="pt-3 border-t border-zinc-100">
              <p className="text-zinc-700 text-sm font-semibold mb-2">
                Personas que respondieron ({responders.length})
              </p>
              {responders.length === 0 ? (
                <p className="text-zinc-400 text-[13px]">No hay responders registrados</p>
              ) : (
                <div className="space-y-2">
                  {responders.map((r) => {
                    const ws = witnessStatusLabel(r);
                    return (
                      <div key={r.user_id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{r.name}</p>
                          <p className="text-[12px] text-zinc-400">
                            {r.role} · {r.status} · {new Date(r.joined_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${ws.color}`}>
                          {ws.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions: status change */}
            <div>
              <p className="text-zinc-400 text-[13px] font-medium mb-2">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus(opt.value)}
                    disabled={updating || incident.status === opt.value}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                      incident.status === opt.value
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    } disabled:opacity-50`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: PDF + Witness + Delete */}
            <div className="pt-3 border-t border-zinc-100 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadPdf}
                  className="px-4 py-2 text-[13px] font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Descargar PDF
                </button>
                {responders.length > 0 && (
                  <button
                    onClick={sendWitnessRequest}
                    disabled={sendingWitness}
                    className="px-4 py-2 text-[13px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    {sendingWitness ? 'Enviando...' : 'Solicitar testigos'}
                  </button>
                )}
              </div>
              {witnessResult && (
                <p className="text-[13px] text-emerald-600 font-medium">{witnessResult}</p>
              )}
              <button
                onClick={deleteIncident}
                disabled={deleting}
                className="px-4 py-2 text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Eliminar incidente'}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-zinc-400 text-center">No se encontró el incidente</div>
        )}
      </div>
    </div>
  );
}
