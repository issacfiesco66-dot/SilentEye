'use client';
/**
 * SilentEye — Admin: Perfiles de búsqueda.
 *
 * Lista missing_persons_profiles con búsqueda por nombre, permite ver
 * detalle y cambiar status. No se usa para notificar — solo consulta
 * y coordinación. Los matches se crean desde la vista del field_report.
 */

import { useEffect, useState } from 'react';
import {
  missingPersonsApi,
  MISSING_STATUS_LABEL,
  type MissingPerson,
  type MissingPersonStatus,
} from '@/lib/field-registry-api';

export default function MissingPersonsSection() {
  const [profiles, setProfiles] = useState<MissingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<MissingPersonStatus | ''>('');
  const [selected, setSelected] = useState<MissingPerson | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await missingPersonsApi.list({
        q: q.trim() || undefined,
        status: status || undefined,
        limit: 200,
      });
      setProfiles(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-zinc-900 flex-1">Perfiles de búsqueda</h2>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Buscar por nombre…"
          className="px-3 py-1 border border-zinc-200 rounded text-[13px] w-56"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MissingPersonStatus | '')}
          className="px-2 py-1 border border-zinc-200 rounded text-[13px] bg-white"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(MISSING_STATUS_LABEL) as MissingPersonStatus[]).map((s) => (
            <option key={s} value={s}>{MISSING_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button onClick={load} className="px-3 py-1 text-[13px] border border-zinc-200 rounded hover:bg-zinc-50">Buscar</button>
      </header>

      {error && <div className="text-[13px] text-red-700 bg-red-50 p-2 rounded">{error}</div>}
      {loading && <p className="text-[13px] text-zinc-500">Cargando…</p>}
      {!loading && profiles.length === 0 && <p className="text-[13px] text-zinc-500">Sin perfiles.</p>}

      <ul className="space-y-2">
        {profiles.map((p) => (
          <li
            key={p.id}
            className="bg-white border border-zinc-200 rounded-lg p-3 hover:border-zinc-400 cursor-pointer"
            onClick={() => setSelected(p)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {p.photo_base64 ? (
                  <img
                    src={photoSrc(p.photo_base64)}
                    alt=""
                    className="w-12 h-12 rounded object-cover bg-zinc-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                    sin foto
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[14px] text-zinc-900 truncate">{p.full_name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusStyle(p.status)}`}>
                      {MISSING_STATUS_LABEL[p.status]}
                    </span>
                    {!p.is_public && <span className="text-[10px] text-zinc-500 border border-zinc-200 rounded px-1">privado</span>}
                  </div>
                  <p className="text-[12px] text-zinc-500 truncate">
                    {p.aliases && `alias: ${p.aliases} · `}
                    {p.disappearance_date && `desapareció ${p.disappearance_date.slice(0, 10)}`}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {selected && <ProfileDetail profile={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
}

function statusStyle(s: MissingPersonStatus): string {
  switch (s) {
    case 'searching': return 'bg-amber-50 text-amber-800';
    case 'found_deceased': return 'bg-zinc-200 text-zinc-700';
    case 'found_alive': return 'bg-green-50 text-green-800';
    case 'case_closed': return 'bg-zinc-100 text-zinc-600';
  }
}

function photoSrc(b64: string): string {
  return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
}

function ProfileDetail({ profile, onClose, onChanged }: { profile: MissingPerson; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function setStatus(next: MissingPersonStatus) {
    const notes = window.prompt(`Notas para cambio a "${MISSING_STATUS_LABEL[next]}" (opcional):`);
    setBusy(true);
    setErr(null);
    try {
      await missingPersonsApi.updateStatus(profile.id, { status: next, status_notes: notes || undefined });
      onChanged();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-[16px] font-bold text-zinc-900">{profile.full_name}</h3>
            {profile.aliases && <p className="text-[12px] text-zinc-500">alias: {profile.aliases}</p>}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-[20px] leading-none">×</button>
        </div>

        {profile.photo_base64 && (
          <img src={photoSrc(profile.photo_base64)} alt="" className="w-full max-h-64 object-contain rounded mb-3 bg-zinc-50" />
        )}

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <FD label="Estado" value={MISSING_STATUS_LABEL[profile.status]} />
          <FD label="Visibilidad" value={profile.is_public ? 'Pública' : 'Privada'} />
          {profile.date_of_birth && <FD label="Fecha nacimiento" value={profile.date_of_birth.slice(0, 10)} />}
          {profile.disappearance_date && <FD label="Desaparición" value={profile.disappearance_date.slice(0, 10)} />}
          {profile.last_known_latitude != null && profile.last_known_longitude != null && (
            <FD label="Última ubicación" value={`${profile.last_known_latitude.toFixed(5)}, ${profile.last_known_longitude.toFixed(5)}`} />
          )}
        </div>

        {profile.last_known_description && (
          <Block title="Última ubicación (detalle)">{profile.last_known_description}</Block>
        )}
        {profile.physical_description && (
          <Block title="Descripción física">{profile.physical_description}</Block>
        )}

        <div className="mt-3 border-t border-zinc-100 pt-3">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase mb-1">Contacto familiar</p>
          <p className="text-[13px]">
            {profile.contact_name || '—'}
            {profile.contact_relation && ` (${profile.contact_relation})`}
          </p>
          {profile.contact_phone && <p className="text-[12px] text-zinc-600">Tel: {profile.contact_phone}</p>}
          {profile.contact_email && <p className="text-[12px] text-zinc-600">Email: {profile.contact_email}</p>}
        </div>

        <div className="mt-4 border-t border-zinc-100 pt-3">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase mb-2">Cambiar estado</p>
          <div className="flex flex-wrap gap-2">
            {(['searching', 'found_alive', 'found_deceased', 'case_closed'] as MissingPersonStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy || profile.status === s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-[12px] rounded border ${profile.status === s ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 hover:bg-zinc-50'}`}
              >
                {MISSING_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {err && <p className="text-[12px] text-red-700 mt-2">{err}</p>}
        </div>
      </div>
    </div>
  );
}

function FD({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase">{label}</p>
      <p className="text-[13px]">{value}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase mb-1">{title}</p>
      <p className="text-[13px] whitespace-pre-wrap">{children}</p>
    </div>
  );
}
