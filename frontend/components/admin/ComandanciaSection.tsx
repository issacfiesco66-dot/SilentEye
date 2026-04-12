'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale } from '@/hooks/useLocale';
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

interface MapResult {
  name: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews: number | null;
  type: string | null;
  website: string | null;
  placeId: string | null;
}

interface IngestResult {
  folio: string;
  slug: string;
  demoUrl: string;
  razonSocial: string;
  telefono: string | null;
  whatsappMessage: string;
  whatsappLink: string;
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
  const { t } = useLocale();
  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MapResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ingesting, setIngesting] = useState(false);
  const [ingestResults, setIngestResults] = useState<IngestResult[]>([]);
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);

  // ── Prospects state ──
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [activeView, setActiveView] = useState<'search' | 'prospects'>('search');

  const API = process.env.NEXT_PUBLIC_API_URL || '';

  // ── Fetch existing prospects ──
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

  // ── Search Google Maps ──
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSelected(new Set());
    setIngestResults([]);

    const session = getSession();
    if (!session?.token) { setSearching(false); return; }

    try {
      const r = await fetch(`${API}/api/prospects/search-maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSearchError(data.error || 'Error al buscar');
      } else {
        setSearchResults(data.results || []);
        if (data.results?.length === 0) setSearchError('No se encontraron resultados para esta búsqueda');
      }
    } catch {
      setSearchError('Error de conexión');
    }
    setSearching(false);
  };

  // ── Toggle selection ──
  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === searchResults.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(searchResults.map((_, i) => i)));
    }
  };

  // ── Bulk ingest selected ──
  const handleBulkIngest = async () => {
    if (selected.size === 0) return;
    setIngesting(true);
    setIngestResults([]);

    const session = getSession();
    if (!session?.token) { setIngesting(false); return; }

    const selectedProspects = Array.from(selected).map(i => searchResults[i]);

    try {
      const r = await fetch(`${API}/api/prospects/bulk-ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ prospects: selectedProspects }),
      });
      const data = await r.json();
      if (r.ok && data.results) {
        setIngestResults(data.results);
        fetchProspects();
      }
    } catch { /* ignore */ }
    setIngesting(false);
  };

  // ── Send individual WhatsApp (open link + mark as sent) ──
  const handleSendWhatsApp = (idx: number, link: string) => {
    if (!link) return;
    setSendingIndex(idx);
    window.open(link, '_blank');
    setTimeout(() => setSendingIndex(null), 2000);
  };

  // ── Prospect management ──
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{t.admin.tabs.comandancia}</h2>
          <p className="text-zinc-500 text-[13px]">Busca flotas en Google Maps y envía alertas de seguridad</p>
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

      {/* View Toggle */}
      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
        <button
          onClick={() => setActiveView('search')}
          className={`flex-1 px-4 py-2 rounded-md text-[13px] font-bold transition-all ${activeView === 'search' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {t.common.search}
          </span>
        </button>
        <button
          onClick={() => setActiveView('prospects')}
          className={`flex-1 px-4 py-2 rounded-md text-[13px] font-bold transition-all ${activeView === 'prospects' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Prospectos ({prospects.length})
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── SEARCH VIEW ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeView === 'search' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold mb-3">Buscar empresas de transporte</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: transportes en Puebla México, mudanzas en Bogotá Colombia..."
                className="flex-1 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
              />
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.trim().length < 3}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-bold text-sm rounded-lg transition-all flex items-center gap-2"
              >
                {searching ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                )}
                {searching ? t.common.loading : t.common.search}
              </button>
            </div>
            {searchError && (
              <p className="mt-2 text-sm text-red-500">{searchError}</p>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              {/* Results header */}
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.size === searchResults.length}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[12px] font-bold text-zinc-500">Seleccionar todos</span>
                  </label>
                  <span className="text-[12px] text-zinc-400">{searchResults.length} resultados — {selected.size} seleccionados</span>
                </div>
                <button
                  onClick={handleBulkIngest}
                  disabled={selected.size === 0 || ingesting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white font-bold text-[12px] rounded-lg transition-all flex items-center gap-2"
                >
                  {ingesting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.475A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                  )}
                  {ingesting ? 'Generando...' : `Enviar Alerta (${selected.size})`}
                </button>
              </div>

              {/* Results list */}
              <div className="divide-y divide-zinc-100 max-h-[500px] overflow-y-auto">
                {searchResults.map((r, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors ${selected.has(idx) ? 'bg-blue-50/50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(idx)}
                      onChange={() => toggleSelect(idx)}
                      className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-zinc-900 text-[13px] truncate">{r.name}</p>
                        {r.rating && (
                          <span className="text-[11px] text-amber-500 font-bold flex items-center gap-0.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            {r.rating} ({r.reviews})
                          </span>
                        )}
                        {r.type && <span className="text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{r.type}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {r.phone && (
                          <span className="text-[12px] text-emerald-600 font-bold flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                            {r.phone}
                          </span>
                        )}
                        {!r.phone && <span className="text-[11px] text-zinc-400 italic">Sin teléfono</span>}
                        {r.address && <span className="text-[11px] text-zinc-400 truncate">{r.address}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingest Results — Ready to send */}
          {ingestResults.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-emerald-200 overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                  <p className="text-emerald-700 font-bold text-sm">{ingestResults.length} prospectos registrados — Listos para enviar alerta</p>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 max-h-[400px] overflow-y-auto">
                {ingestResults.map((r, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 text-[13px]">{r.razonSocial}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-zinc-400 font-mono">{r.folio}</span>
                        {r.telefono && <span className="text-[11px] text-emerald-600 font-bold">{r.telefono}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Copy demo URL */}
                      <button
                        onClick={() => navigator.clipboard.writeText(r.demoUrl)}
                        className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[11px] font-bold rounded-lg transition-colors"
                        title="Copiar URL del demo"
                      >
                        Copiar Demo
                      </button>
                      {/* Send WhatsApp */}
                      {r.whatsappLink ? (
                        <button
                          onClick={() => handleSendWhatsApp(idx, r.whatsappLink)}
                          className={`px-4 py-2 font-bold text-[12px] rounded-lg transition-all flex items-center gap-1.5 ${
                            sendingIndex === idx
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.475A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                          {sendingIndex === idx ? 'Abierto ✓' : 'Enviar Alerta'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-400 italic">Sin teléfono</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── PROSPECTS VIEW ── */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeView === 'prospects' && (
        <div className="space-y-4">
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

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm">No hay prospectos {filter !== 'all' ? `con status "${STATUS_LABELS[filter]?.label}"` : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => {
                const st = STATUS_LABELS[p.status_seguridad] || STATUS_LABELS.detectado;
                const demoUrl = `https://silenteye.mx/monitoreo-demo/${p.slug}`;
                const whatsappMsg = `🚨 *ALERTA DE SEGURIDAD PATRIMONIAL - SILENT EYE*\n\nHemos detectado actividad logística de la empresa *${p.razon_social}* en la zona de *${p.ubicacion_patio || 'su zona'}*. Según nuestros registros de zona, sus unidades podrían estar operando sin Blindaje Digital Activo.\n\nHemos generado un Protocolo de Monitoreo Virtual para su flota aquí:\n🔗 ${demoUrl}\n\n*Acciones disponibles en el panel:*\n• Simulación de Paro de Motor Remoto\n• Reporte de Extracción de Combustible (Huachicoleo)\n• Geocerca de Seguridad Activa\n\nEvite pérdidas hoy mismo. Un asesor de seguridad está pendiente de su conexión.\n\n📋 Folio: ${p.folio}`;
                const whatsappUrl = p.telefono_whatsapp
                  ? `https://wa.me/${p.telefono_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`
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
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-lg transition-colors"
                            title="Enviar alerta por WhatsApp"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.475A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                            Enviar Alerta
                          </a>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(demoUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[12px] font-bold rounded-lg transition-colors"
                          title="Copiar URL demo"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          Demo
                        </button>
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
                        <button
                          onClick={() => deleteProspect(p.id)}
                          className="inline-flex items-center px-2 py-2 bg-zinc-100 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </div>

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
      )}
    </div>
  );
}
