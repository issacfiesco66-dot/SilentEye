'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSession } from '@/lib/session';

interface Prospect {
  id: string;
  folio: string;
  razon_social: string;
  telefono_whatsapp: string | null;
  ubicacion_patio: string | null;
  tipo_transporte: string;
  vistas_demo: number;
  status_seguridad: string;
  slug: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  detectado: { label: 'Detectado', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  demo_enviada: { label: 'Demo Enviada', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  interesado: { label: 'Interesado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  contactado: { label: 'Contactado', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  cliente: { label: 'Cliente', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  descartado: { label: 'Descartado', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

const STATUS_ORDER = ['detectado', 'demo_enviada', 'interesado', 'contactado', 'cliente', 'descartado'];

export default function ComandanciaSection() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchProspects = useCallback(async () => {
    const session = getSession();
    if (!session?.token) return;
    try {
      const r = await fetch(`${API}/api/prospects`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setProspects(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [API]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const updateStatus = async (id: string, statusSeguridad: string) => {
    const session = getSession();
    if (!session?.token) return;
    try {
      const r = await fetch(`${API}/api/prospects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ statusSeguridad }),
      });
      if (r.ok) fetchProspects();
    } catch { /* ignore */ }
  };

  const saveNotes = async (id: string) => {
    const session = getSession();
    if (!session?.token) return;
    try {
      await fetch(`${API}/api/prospects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ notas: notesValue }),
      });
      setEditingNotes(null);
      fetchProspects();
    } catch { /* ignore */ }
  };

  const deleteProspect = async (id: string) => {
    if (!confirm('¿Eliminar este prospecto?')) return;
    const session = getSession();
    if (!session?.token) return;
    try {
      await fetch(`${API}/api/prospects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      fetchProspects();
    } catch { /* ignore */ }
  };

  const filtered = filter === 'all' ? prospects : prospects.filter(p => p.status_seguridad === filter);

  const stats = {
    total: prospects.length,
    detectados: prospects.filter(p => p.status_seguridad === 'detectado').length,
    interesados: prospects.filter(p => p.status_seguridad === 'interesado').length,
    clientes: prospects.filter(p => p.status_seguridad === 'cliente').length,
    totalVistas: prospects.reduce((sum, p) => sum + p.vistas_demo, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">Comandancia de Prospectos</h2>
          <p className="text-zinc-500 text-[13px]">Sistema de detección de flotas y prospección automatizada</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-zinc-900' },
          { label: 'Detectados', value: stats.detectados, color: 'text-amber-500' },
          { label: 'Interesados', value: stats.interesados, color: 'text-purple-500' },
          { label: 'Clientes', value: stats.clientes, color: 'text-emerald-500' },
          { label: 'Vistas Demo', value: stats.totalVistas, color: 'text-blue-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-zinc-200 text-center">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${filter === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
        >
          Todos ({prospects.length})
        </button>
        {STATUS_ORDER.map(s => {
          const count = prospects.filter(p => p.status_seguridad === s).length;
          if (count === 0 && s !== 'detectado') return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${filter === s ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
            >
              {STATUS_LABELS[s]?.label || s} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-sm">No hay prospectos {filter !== 'all' ? `con status "${STATUS_LABELS[filter]?.label}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const st = STATUS_LABELS[p.status_seguridad] || STATUS_LABELS.detectado;
            const demoUrl = `https://silenteye.mx/monitoreo-demo/${p.slug}`;
            const whatsappUrl = p.telefono_whatsapp
              ? `https://wa.me/${p.telefono_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy del equipo de seguridad Silent Eye. Le contacto por el folio ${p.folio}. Generamos un demo de monitoreo para su flota: ${demoUrl}`)}`
              : null;

            return (
              <div key={p.id} className="bg-white rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-zinc-900 text-[15px]">{p.razon_social}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.color}`}>
                        {st.label}
                      </span>
                      {p.vistas_demo > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                          {p.vistas_demo} vista{p.vistas_demo !== 1 ? 's' : ''} demo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-zinc-500">
                      <span>Folio: {p.folio}</span>
                      <span>{p.tipo_transporte}</span>
                      {p.ubicacion_patio && <span>{p.ubicacion_patio}</span>}
                    </div>
                    {p.telefono_whatsapp && (
                      <p className="text-[12px] text-zinc-500 mt-0.5">Tel: {p.telefono_whatsapp}</p>
                    )}
                    {p.notas && editingNotes !== p.id && (
                      <p className="text-[12px] text-zinc-400 mt-1 italic">Notas: {p.notas}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* WhatsApp / Call button */}
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-lg transition-colors"
                        title="Contactar por WhatsApp"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.475A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                        Llamar
                      </a>
                    )}

                    {/* Copy demo URL */}
                    <button
                      onClick={() => navigator.clipboard.writeText(demoUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[12px] font-bold rounded-lg transition-colors"
                      title="Copiar URL demo"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      Demo
                    </button>

                    {/* Notes */}
                    <button
                      onClick={() => {
                        if (editingNotes === p.id) { saveNotes(p.id); }
                        else { setEditingNotes(p.id); setNotesValue(p.notas || ''); }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[12px] font-bold rounded-lg transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      {editingNotes === p.id ? 'Guardar' : 'Notas'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteProspect(p.id)}
                      className="inline-flex items-center px-2 py-2 bg-zinc-100 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>

                {/* Notes editor */}
                {editingNotes === p.id && (
                  <div className="mt-3">
                    <textarea
                      value={notesValue}
                      onChange={e => setNotesValue(e.target.value)}
                      placeholder="Agregar notas sobre el prospecto..."
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                      rows={2}
                    />
                  </div>
                )}

                {/* Status changer */}
                <div className="flex gap-1 mt-3 flex-wrap">
                  {STATUS_ORDER.map(s => {
                    const sInfo = STATUS_LABELS[s];
                    const isActive = p.status_seguridad === s;
                    return (
                      <button
                        key={s}
                        onClick={() => !isActive && updateStatus(p.id, s)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${isActive ? sInfo.color : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-zinc-100'}`}
                      >
                        {sInfo.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
