'use client';
/**
 * SilentEye — Admin: Hallazgos de campo.
 *
 * Lista field_reports filtrable por status/category/team, con detalle
 * que incluye media (credenciales visibles solo para admin) y controles
 * para cambiar status y crear profile_match contra un perfil existente.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  fieldReportsApi,
  missingPersonsApi,
  profileMatchesApi,
  CATEGORY_LABEL,
  STATUS_LABEL,
  MATCH_TYPE_LABEL,
  CONFIDENCE_LABEL,
  CHANNEL_LABEL,
  type FieldReport,
  type FieldReportMedia,
  type FieldReportStatus,
  type FieldReportCategory,
  type MissingPerson,
  type ProfileMatch,
  type ProfileMatchType,
  type ProfileMatchConfidence,
  type NotificationChannel,
} from '@/lib/field-registry-api';

export default function FieldReportsSection() {
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status?: FieldReportStatus; category?: FieldReportCategory }>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await fieldReportsApi.list({
        status: filters.status,
        category: filters.category,
        limit: 200,
      });
      setReports(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.status, filters.category]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-zinc-900 flex-1">Hallazgos de campo</h2>
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as FieldReportStatus | undefined }))}
          className="px-2 py-1 border border-zinc-200 rounded text-[13px] bg-white"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABEL) as FieldReportStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select
          value={filters.category || ''}
          onChange={(e) => setFilters((f) => ({ ...f, category: (e.target.value || undefined) as FieldReportCategory | undefined }))}
          className="px-2 py-1 border border-zinc-200 rounded text-[13px] bg-white"
        >
          <option value="">Todas las categorías</option>
          {(Object.keys(CATEGORY_LABEL) as FieldReportCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
        <button onClick={load} className="px-3 py-1 text-[13px] border border-zinc-200 rounded hover:bg-zinc-50">
          Recargar
        </button>
      </header>

      {error && <div className="text-[13px] text-red-700 bg-red-50 p-2 rounded">{error}</div>}
      {loading && <p className="text-[13px] text-zinc-500">Cargando…</p>}

      {!loading && reports.length === 0 && (
        <p className="text-[13px] text-zinc-500">Sin reportes para los filtros seleccionados.</p>
      )}

      <ul className="space-y-2">
        {reports.map((r) => (
          <li
            key={r.id}
            className="bg-white border border-zinc-200 rounded-lg p-3 hover:border-zinc-400 cursor-pointer transition"
            onClick={() => setSelectedId(r.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[14px] text-zinc-900">
                    {CATEGORY_LABEL[r.category]}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusStyle(r.status)}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="text-[12px] text-zinc-500 mt-1 truncate">
                  {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                  {' · '}
                  {formatDate(r.report_date)}
                  {r.notes ? ` · ${r.notes}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="text-[12px] text-zinc-600 hover:text-zinc-900 font-medium"
                onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
              >
                Ver →
              </button>
            </div>
          </li>
        ))}
      </ul>

      {selectedId && (
        <FieldReportDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}

function statusStyle(s: FieldReportStatus): string {
  switch (s) {
    case 'pending': return 'bg-amber-50 text-amber-800';
    case 'notified_authority': return 'bg-blue-50 text-blue-800';
    case 'processed_by_authority': return 'bg-green-50 text-green-800';
    case 'closed': return 'bg-zinc-100 text-zinc-700';
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return iso; }
}

// ── Detail modal ────────────────────────────────────────────────────────────

function FieldReportDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [report, setReport] = useState<FieldReport | null>(null);
  const [media, setMedia] = useState<FieldReportMedia[]>([]);
  const [matches, setMatches] = useState<ProfileMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, m, ms] = await Promise.all([
        fieldReportsApi.get(id),
        fieldReportsApi.listMedia(id),
        profileMatchesApi.list({ field_report_id: id }),
      ]);
      setReport(r);
      setMedia(m);
      setMatches(ms);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function changeStatus(next: FieldReportStatus) {
    if (!report) return;
    setStatusBusy(true);
    try {
      let extra: { authority_reference?: string; processed_notes?: string } = {};
      if (next === 'notified_authority') {
        const ref = window.prompt('Referencia de la autoridad (NUC, oficio, etc.) — opcional:');
        if (ref) extra.authority_reference = ref;
      } else if (next === 'processed_by_authority') {
        const notes = window.prompt('Notas del procesamiento por autoridad (opcional):');
        if (notes) extra.processed_notes = notes;
      }
      await fieldReportsApi.updateStatus(id, { status: next, ...extra });
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado');
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading) {
    return (
      <ModalShell onClose={onClose}>
        <p className="text-[13px] text-zinc-500">Cargando detalle…</p>
      </ModalShell>
    );
  }

  if (!report) {
    return (
      <ModalShell onClose={onClose}>
        <p className="text-[13px] text-red-700">{error || 'No se pudo cargar el reporte.'}</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Detalle de hallazgo">
      {error && <div className="text-[12px] text-red-700 bg-red-50 p-2 rounded mb-2">{error}</div>}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <Field label="Categoría" value={CATEGORY_LABEL[report.category]} />
          <Field label="Estado" value={STATUS_LABEL[report.status]} />
          <Field label="Coordenadas" value={`${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`} />
          <Field label="Precisión GPS" value={report.accuracy_m ? `${report.accuracy_m} m` : '—'} />
          <Field label="Fecha" value={formatDate(report.report_date)} />
          <Field label="Creado" value={formatDate(report.created_at)} />
        </div>
        {report.notes && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Notas</p>
            <p className="text-[13px] text-zinc-800 whitespace-pre-wrap">{report.notes}</p>
          </div>
        )}

        {/* Media grid */}
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            Fotos ({media.length})
          </p>
          {media.length === 0 ? (
            <p className="text-[12px] text-zinc-400">Sin fotos</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {media.map((m) => (
                <MediaThumb key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>

        {/* Matches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Vínculos con perfiles ({matches.length})
            </p>
            <button
              type="button"
              onClick={() => setShowMatchForm((v) => !v)}
              className="text-[12px] text-zinc-700 hover:text-zinc-900 font-medium"
            >
              {showMatchForm ? 'Cancelar' : '+ Nuevo vínculo'}
            </button>
          </div>
          {showMatchForm && (
            <CreateMatchForm
              reportId={id}
              onCreated={() => { setShowMatchForm(false); load(); }}
            />
          )}
          {matches.map((m) => <MatchRow key={m.id} match={m} onChanged={load} />)}
        </div>

        {/* Status transitions */}
        <div className="border-t border-zinc-100 pt-3">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Cambiar estado</p>
          <div className="flex flex-wrap gap-2">
            {(['pending', 'notified_authority', 'processed_by_authority', 'closed'] as FieldReportStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={statusBusy || report.status === s}
                onClick={() => changeStatus(s)}
                className={`px-3 py-1.5 text-[12px] rounded border ${report.status === s ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 hover:bg-zinc-50'}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-[13px] text-zinc-800">{value}</p>
    </div>
  );
}

function MediaThumb({ m }: { m: FieldReportMedia }) {
  const [open, setOpen] = useState(false);
  if (m.redacted || !m.image_data) {
    return (
      <div className="aspect-square bg-amber-50 border border-amber-200 rounded flex flex-col items-center justify-center text-center p-2">
        <span className="text-[11px] font-semibold text-amber-800">Credencial</span>
        <span className="text-[10px] text-amber-700">(oculta por política)</span>
      </div>
    );
  }
  const src = m.image_data.startsWith('data:') ? m.image_data : `data:${m.mime_type || 'image/jpeg'};base64,${m.image_data}`;
  return (
    <>
      <button
        type="button"
        className="aspect-square overflow-hidden rounded border border-zinc-200 hover:border-zinc-400 relative"
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={m.description || 'foto'} className="w-full h-full object-cover" />
        {m.is_credential && (
          <span className="absolute top-1 left-1 text-[10px] bg-red-600 text-white px-1 rounded">CRED</span>
        )}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img src={src} alt="" className="max-h-[90vh] max-w-full rounded" />
        </div>
      )}
    </>
  );
}

function CreateMatchForm({ reportId, onCreated }: { reportId: string; onCreated: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MissingPerson[]>([]);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const [matchType, setMatchType] = useState<ProfileMatchType>('credential_name');
  const [confidence, setConfidence] = useState<ProfileMatchConfidence>('medium');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  async function search() {
    if (!canSearch) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await missingPersonsApi.list({ q: query.trim(), limit: 20 });
      setResults(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!selected) { setErr('Selecciona un perfil'); return; }
    setBusy(true);
    setErr(null);
    try {
      await profileMatchesApi.create({
        field_report_id: reportId,
        missing_person_id: selected.id,
        match_type: matchType,
        confidence,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al vincular');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2 mb-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Buscar perfil por nombre…"
          className="flex-1 px-2 py-1 border border-zinc-200 rounded text-[13px]"
        />
        <button type="button" onClick={search} disabled={!canSearch || busy} className="px-3 py-1 text-[12px] bg-zinc-900 text-white rounded disabled:opacity-50">
          Buscar
        </button>
      </div>
      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto bg-white rounded border border-zinc-200">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className={`w-full text-left px-2 py-1 text-[12px] hover:bg-zinc-50 ${selected?.id === p.id ? 'bg-blue-50' : ''}`}
              >
                {p.full_name}
                {p.disappearance_date && <span className="text-zinc-500 ml-2">· desapareció {p.disappearance_date.slice(0, 10)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="space-y-2 pt-2 border-t border-zinc-200">
          <p className="text-[12px] text-zinc-700">Vinculando con: <strong>{selected.full_name}</strong></p>
          <div className="grid grid-cols-2 gap-2">
            <select value={matchType} onChange={(e) => setMatchType(e.target.value as ProfileMatchType)} className="px-2 py-1 border border-zinc-200 rounded text-[12px] bg-white">
              {(Object.keys(MATCH_TYPE_LABEL) as ProfileMatchType[]).map((t) => (
                <option key={t} value={t}>{MATCH_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <select value={confidence} onChange={(e) => setConfidence(e.target.value as ProfileMatchConfidence)} className="px-2 py-1 border border-zinc-200 rounded text-[12px] bg-white">
              {(Object.keys(CONFIDENCE_LABEL) as ProfileMatchConfidence[]).map((c) => (
                <option key={c} value={c}>Confianza: {CONFIDENCE_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
            placeholder="Razonamiento del vínculo (ej: 'nombre en INE = Juan Pérez López, edad ~40 coincide con perfil')"
            rows={2}
            className="w-full px-2 py-1 border border-zinc-200 rounded text-[12px] resize-none"
          />
          <button type="button" onClick={submit} disabled={busy} className="px-3 py-1 text-[12px] bg-zinc-900 text-white rounded disabled:opacity-50">
            Crear vínculo
          </button>
        </div>
      )}
      {err && <p className="text-[12px] text-red-700">{err}</p>}
    </div>
  );
}

function MatchRow({ match, onChanged }: { match: ProfileMatch; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function notifyFamily() {
    const ch = window.prompt('Canal de notificación (phone | in_person | email_manual | via_authority):', 'phone');
    if (!ch) return;
    const validChannels: NotificationChannel[] = ['phone', 'in_person', 'email_manual', 'via_authority'];
    if (!validChannels.includes(ch as NotificationChannel)) {
      setErr('Canal inválido'); return;
    }
    const notes = window.prompt('Notas de la notificación (quién contactó, qué se dijo):');
    setBusy(true);
    try {
      await profileMatchesApi.notifyFamily(match.id, {
        channel: ch as NotificationChannel,
        notes: notes || undefined,
      });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded p-2 mb-2 text-[12px]">
      <div className="flex items-center justify-between">
        <div>
          <strong>{MATCH_TYPE_LABEL[match.match_type]}</strong>
          <span className="text-zinc-500 ml-2">· confianza {CONFIDENCE_LABEL[match.confidence]}</span>
        </div>
        <span className="text-zinc-400">{formatDate(match.created_at)}</span>
      </div>
      {match.notes && <p className="text-zinc-700 mt-1">{match.notes}</p>}
      <div className="mt-2 pt-2 border-t border-zinc-100">
        {match.family_notified_at ? (
          <p className="text-green-700">
            Familia notificada ({formatDate(match.family_notified_at)}) vía {CHANNEL_LABEL[match.family_notification_channel || 'phone']}
            {match.family_notification_notes && <span className="text-zinc-600"> — {match.family_notification_notes}</span>}
          </p>
        ) : (
          <button type="button" onClick={notifyFamily} disabled={busy} className="text-blue-700 hover:underline font-medium disabled:opacity-50">
            Registrar notificación a familia…
          </button>
        )}
        {err && <p className="text-red-700 mt-1">{err}</p>}
      </div>
    </div>
  );
}

function ModalShell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[16px] font-bold text-zinc-900">{title || ''}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-[20px] leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
