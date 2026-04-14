'use client';

import { useEffect, useState, useCallback } from 'react';

const API = '';

interface Suspect {
  id: string;
  alias: string | null;
  primary_face_crop: string;
  status: 'active' | 'captured' | 'cleared' | 'archived';
  notes: string | null;
  incident_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  created_by_name: string | null;
}

interface Sighting {
  id: string;
  incident_id: string;
  similarity_score: number;
  latitude: number | null;
  longitude: number | null;
  inc_lat: number;
  inc_lng: number;
  inc_date: string;
  inc_status: string;
  inc_source: string | null;
  plate: string | null;
  face_crop: string | null;
  confidence: number | null;
  confirmed_by_name: string | null;
}

interface SuspectDetail extends Suspect {
  primary_encoding: number[];
  sightings: Sighting[];
  pattern: {
    total_incidents: number;
    locations: { lat: number; lng: number; date: string }[];
    date_range: { first: string; last: string } | null;
  };
}

interface SuspectGalleryProps {
  token: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'ACTIVO', color: 'text-red-700', bg: 'bg-red-100' },
  captured: { label: 'CAPTURADO', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cleared: { label: 'DESCARTADO', color: 'text-zinc-600', bg: 'bg-zinc-100' },
  archived: { label: 'ARCHIVADO', color: 'text-amber-700', bg: 'bg-amber-100' },
};

export default function SuspectGallery({ token, onClose }: SuspectGalleryProps) {
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SuspectDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editAlias, setEditAlias] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Fetch all suspects
  const fetchSuspects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/suspects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuspects(data);
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSuspects(); }, [fetchSuspects]);

  // Fetch suspect detail
  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/suspects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        setEditAlias(data.alias || '');
        setEditNotes(data.notes || '');
      }
    } catch {}
    setLoadingDetail(false);
  }, [token]);

  // Update suspect
  const updateSuspect = useCallback(async (id: string, updates: { alias?: string; status?: string; notes?: string }) => {
    try {
      const res = await fetch(`${API}/api/suspects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchSuspects();
        if (selectedId === id) openDetail(id);
      }
    } catch {}
  }, [token, selectedId, fetchSuspects, openDetail]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedId && detail) {
    const st = STATUS_LABELS[detail.status] || STATUS_LABELS.active;
    return (
      <div className="fixed inset-0 z-[9998] bg-white flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-4 py-3 flex items-center gap-3 safe-area-top">
          <button onClick={() => { setSelectedId(null); setDetail(null); }} className="text-sm flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          </button>
          <span className="font-bold text-sm flex-1 truncate">
            {detail.alias || `Sospechoso #${detail.id.slice(0, 8)}`}
          </span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${st.bg} ${st.color}`}>
            {st.label}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Face + Stats */}
          <div className="p-4 flex gap-4 items-start border-b border-zinc-100">
            <img
              src={`data:image/jpeg;base64,${detail.primary_face_crop}`}
              alt="Sospechoso"
              className="w-24 h-24 rounded-xl object-cover border-2 border-zinc-200"
            />
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-zinc-400 text-[10px]">Incidentes</p>
                  <p className="font-bold text-red-600 text-lg">{detail.incident_count}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-[10px]">Avistamientos</p>
                  <p className="font-bold text-zinc-700 text-lg">{detail.sightings.length}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-[10px]">Primera vez</p>
                  <p className="text-zinc-700 font-medium">{formatDate(detail.first_seen_at)}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-[10px]">Última vez</p>
                  <p className="text-zinc-700 font-medium">{formatDate(detail.last_seen_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit alias/notes */}
          <div className="p-4 border-b border-zinc-100 space-y-2">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Alias / Nombre</label>
              <div className="flex gap-2 mt-0.5">
                <input
                  value={editAlias}
                  onChange={e => setEditAlias(e.target.value)}
                  placeholder="Nombre o apodo..."
                  className="flex-1 text-sm px-3 py-1.5 border border-zinc-200 rounded-lg"
                />
                <button
                  onClick={() => updateSuspect(detail.id, { alias: editAlias })}
                  className="px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-lg"
                >
                  Guardar
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider">Notas</label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Descripción, ropa, características..."
                rows={2}
                className="w-full text-sm px-3 py-1.5 border border-zinc-200 rounded-lg mt-0.5"
              />
              <button
                onClick={() => updateSuspect(detail.id, { notes: editNotes })}
                className="mt-1 px-3 py-1 bg-zinc-800 text-white text-xs rounded-lg"
              >
                Guardar notas
              </button>
            </div>

            {/* Status buttons */}
            <div className="flex gap-2 mt-2">
              {(['active', 'captured', 'cleared', 'archived'] as const).map(s => {
                const sl = STATUS_LABELS[s];
                return (
                  <button
                    key={s}
                    onClick={() => updateSuspect(detail.id, { status: s })}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
                      detail.status === s
                        ? `${sl.bg} ${sl.color} border-current`
                        : 'bg-white text-zinc-400 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {sl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incident timeline */}
          <div className="p-4">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">
              Historial de incidentes ({detail.sightings.length})
            </h3>
            {detail.sightings.length === 0 && (
              <p className="text-zinc-400 text-xs">Sin avistamientos registrados</p>
            )}
            <div className="space-y-3">
              {detail.sightings.map((s, i) => (
                <div key={s.id} className="flex gap-3 items-start">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      i === 0 ? 'bg-red-500 border-red-500' : 'bg-white border-zinc-300'
                    }`} />
                    {i < detail.sightings.length - 1 && <div className="w-0.5 h-8 bg-zinc-200" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {s.face_crop && (
                        <img
                          src={`data:image/jpeg;base64,${s.face_crop}`}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-zinc-200"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-700">
                          {s.plate ? `Vehículo: ${s.plate}` : 'Incidente móvil'}
                          {s.inc_source === 'theft' && <span className="text-orange-600 font-bold ml-1">ROBO</span>}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {formatDate(s.inc_date)}
                          {s.similarity_score < 1 && ` · Similitud: ${Math.round(s.similarity_score * 100)}%`}
                        </p>
                        {(s.inc_lat || s.latitude) && (
                          <p className="text-[9px] text-zinc-300 font-mono">
                            📍 {(s.latitude || s.inc_lat)?.toFixed(5)}, {(s.longitude || s.inc_lng)?.toFixed(5)}
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        s.inc_status === 'active' ? 'bg-red-100 text-red-700' :
                        s.inc_status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-zinc-100 text-zinc-600'
                      }`}>
                        {s.inc_status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pattern summary */}
          {detail.pattern.total_incidents > 1 && (
            <div className="px-4 pb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                  Patrón detectado
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Este sospechoso ha sido identificado en <strong>{detail.pattern.total_incidents} incidentes diferentes</strong>.
                  {detail.pattern.date_range && (
                    <> Activo desde {formatDate(detail.pattern.date_range.first)} hasta {formatDate(detail.pattern.date_range.last)}.</>
                  )}
                  {' '}Se recomienda compartir esta información con las autoridades.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {detail.pattern.locations.map((loc, i) => (
                    <span key={i} className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-mono">
                      📍 {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Loading detail ─────────────────────────────────────────────────────────
  if (selectedId && loadingDetail) {
    return (
      <div className="fixed inset-0 z-[9998] bg-white flex items-center justify-center">
        <div className="text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" className="animate-spin mx-auto text-zinc-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
          <p className="text-zinc-400 text-xs">Cargando expediente...</p>
        </div>
      </div>
    );
  }

  // ── Gallery view ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9998] bg-white flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 text-white px-4 py-3 flex items-center justify-between safe-area-top">
        <button onClick={onClose} className="text-sm flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Cerrar
        </button>
        <span className="font-bold text-sm">Sospechosos</span>
        <span className="text-zinc-400 text-xs">{suspects.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin text-zinc-300" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
          </div>
        )}

        {!loading && suspects.length === 0 && (
          <div className="text-center py-12 px-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" strokeWidth="1.5" className="mx-auto mb-3"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
            <p className="text-zinc-400 text-sm">No hay sospechosos registrados</p>
            <p className="text-zinc-300 text-xs mt-1">Los rostros marcados durante emergencias aparecerán aquí</p>
          </div>
        )}

        {/* Suspect cards */}
        <div className="p-4 space-y-3">
          {suspects.map(s => {
            const st = STATUS_LABELS[s.status] || STATUS_LABELS.active;
            return (
              <button
                key={s.id}
                onClick={() => openDetail(s.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-left"
              >
                <img
                  src={`data:image/jpeg;base64,${s.primary_face_crop}`}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover border border-zinc-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-700 truncate">
                      {s.alias || `Sospechoso #${s.id.slice(0, 8)}`}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {s.incident_count} incidente{s.incident_count !== 1 ? 's' : ''}
                    {' · '}Última vez: {formatDate(s.last_seen_at)}
                  </p>
                  {s.notes && (
                    <p className="text-[10px] text-zinc-300 truncate mt-0.5">{s.notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  {s.incident_count > 1 && (
                    <span className="text-[9px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      REINCIDENTE
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" className="mt-1"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
