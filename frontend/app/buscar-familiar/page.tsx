'use client';
/**
 * SilentEye — Registro de perfil de persona desaparecida.
 *
 * Formulario accesible desde cualquier sesión autenticada (familias).
 * Deja claro al usuario que:
 *   • no habrá notificación automática si hay un match
 *   • un coordinador humano se pondrá en contacto si surge información
 *   • sus datos de contacto son privados por defecto
 */

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';
import { missingPersonsApi, type MissingPerson } from '@/lib/field-registry-api';

export default function BuscarFamiliarPage() {
  const { user, ready } = useSession({ fallbackPath: '/login' });
  const [submitted, setSubmitted] = useState<MissingPerson | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    aliases: '',
    date_of_birth: '',
    disappearance_date: '',
    last_known_description: '',
    physical_description: '',
    contact_name: '',
    contact_relation: '',
    contact_phone: '',
    contact_email: '',
  });
  const [photo, setPhoto] = useState<string>('');  // base64 (sin data: prefix)
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_200_000) { setError('Foto > 1.2MB'); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const comma = dataUrl.indexOf(',');
    setPhoto(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    setPhotoMime(file.type || 'image/jpeg');
  }

  async function submit() {
    setError(null);
    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      setError('Nombre completo es requerido'); return;
    }
    setBusy(true);
    try {
      const created = await missingPersonsApi.create({
        full_name: form.full_name.trim(),
        aliases: form.aliases.trim() || undefined,
        date_of_birth: form.date_of_birth || undefined,
        disappearance_date: form.disappearance_date ? new Date(form.disappearance_date).toISOString() : undefined,
        last_known_description: form.last_known_description.trim() || undefined,
        physical_description: form.physical_description.trim() || undefined,
        photo_base64: photo || undefined,
        contact_name: form.contact_name.trim() || undefined,
        contact_relation: form.contact_relation.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        is_public: true,
      });
      setSubmitted(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-zinc-400">Cargando…</span></div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white p-6 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold text-green-900">Tu búsqueda fue registrada.</h1>
          <p className="text-[14px] text-green-800 mt-3">
            Registramos el perfil de <strong>{submitted.full_name}</strong>.
          </p>
          <div className="mt-4 text-left bg-white border border-green-200 rounded p-3 text-[13px] text-zinc-700">
            <p className="font-semibold mb-1">Qué pasa ahora:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>No habrá notificación automática. Si surge información relevante, un coordinador de un colectivo de búsqueda se pondrá en contacto contigo por teléfono o en persona.</li>
              <li>Puedes volver a este portal para consultar o actualizar la información.</li>
              <li>Si la información que proporcionaste cambia (ej: nueva descripción, nueva foto), edítala aquí mismo.</li>
            </ul>
          </div>
          <Link href="/dashboard" className="inline-block mt-4 text-[13px] text-zinc-600 hover:text-zinc-900 underline">
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-zinc-100 h-14 flex items-center justify-between px-4">
        <Link href="/dashboard" className="text-[13px] text-zinc-500 hover:text-zinc-900">← Dashboard</Link>
        <span className="text-[14px] font-bold">Registrar persona desaparecida</span>
        <span className="text-[13px] text-zinc-400">{user?.name || user?.phone}</span>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[13px] text-amber-900 mb-4">
          <strong>Aviso importante:</strong> Este registro no es una notificación a autoridades ni un reemplazo del
          Registro Nacional de Personas Desaparecidas (RNPDNO). Es una herramienta privada que comparten
          colectivos de búsqueda para facilitar el cruce manual con hallazgos de campo.
          Si aún no presentas denuncia formal, te recomendamos hacerlo ante la Fiscalía correspondiente.
        </div>

        {error && <div className="text-[13px] text-red-700 bg-red-50 p-2 rounded mb-3">{error}</div>}

        <div className="space-y-3">
          <Field label="Nombre completo *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Alias o apodo" value={form.aliases} onChange={(v) => setForm({ ...form, aliases: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de nacimiento" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
            <Field label="Fecha de desaparición" type="date" value={form.disappearance_date} onChange={(v) => setForm({ ...form, disappearance_date: v })} />
          </div>
          <Area label="Última ubicación conocida (descripción)" rows={2} value={form.last_known_description} onChange={(v) => setForm({ ...form, last_known_description: v })} />
          <Area label="Descripción física" rows={3} value={form.physical_description} onChange={(v) => setForm({ ...form, physical_description: v })} placeholder="Estatura, complexión, señas particulares, ropa que usaba, etc." />

          <div>
            <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Fotografía (opcional)</label>
            <input type="file" accept="image/jpeg,image/png" onChange={onFile} className="text-[12px]" />
            {photo && (
              <img
                src={`data:${photoMime};base64,${photo}`}
                alt=""
                className="mt-2 w-32 h-32 object-cover rounded border border-zinc-200"
              />
            )}
          </div>

          <div className="border-t border-zinc-100 pt-3">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase mb-2">Tus datos de contacto (familiar/persona responsable)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tu nombre" value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} />
                <Field label="Relación" value={form.contact_relation} onChange={(v) => setForm({ ...form, contact_relation: v })} placeholder="madre, hermano, amigo..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
                <Field label="Email" type="email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="px-5 py-2 bg-zinc-900 text-white text-[13px] font-semibold rounded-md disabled:opacity-50"
            >
              {busy ? 'Guardando…' : 'Registrar búsqueda'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-zinc-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm"
      />
    </div>
  );
}

function Area({ label, value, onChange, rows = 3, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-zinc-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 4000))}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm resize-none"
      />
    </div>
  );
}
