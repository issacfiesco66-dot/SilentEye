'use client';

import { useState } from 'react';
import { stateRisk } from '@/lib/risk-zones';

const WHATSAPP_NUMBER = '525610669353';

const REGION_OPTIONS = [
  { value: '', label: 'Selecciona un estado o región' },
  { value: 'nacional', label: 'Cobertura nacional' },
  ...stateRisk.map((s) => ({ value: s.name, label: s.name })),
];

export default function SociosForm() {
  const [contactName, setContactName] = useState('');
  const [chamberName, setChamberName] = useState('');
  const [region, setRegion] = useState('');
  const [members, setMembers] = useState<string>('');
  const [vehicles, setVehicles] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isValid = contactName.trim().length >= 2 && chamberName.trim().length >= 2;

  function buildWhatsAppMessage() {
    const lines = [
      `Hola, soy ${contactName.trim()} de ${chamberName.trim()}.`,
      '',
      'Nos interesa el programa de socios SilentEye.',
      '',
      'Detalles:',
    ];
    if (region) lines.push(`• Cobertura: ${region}`);
    if (members) lines.push(`• Socios estimados: ${members}`);
    if (vehicles) lines.push(`• Unidades estimadas: ${vehicles}`);
    if (notes.trim()) {
      lines.push('');
      lines.push(`Notas: ${notes.trim()}`);
    }
    lines.push('');
    lines.push('Quedo atento(a) para agendar una demo o llamada.');
    return lines.join('\n');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    const msg = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener,noreferrer');
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-zinc-200 p-6 md:p-8 space-y-6">
      <div>
        <label htmlFor="contactName" className="block text-[13px] font-bold text-zinc-900 mb-2">
          Tu nombre y cargo <span className="text-red-500">*</span>
        </label>
        <input
          id="contactName"
          type="text"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Lic. Juan Pérez, Director General"
          className="w-full px-4 py-3 text-[15px] bg-zinc-50 border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="chamberName" className="block text-[13px] font-bold text-zinc-900 mb-2">
          Nombre de la cámara o asociación <span className="text-red-500">*</span>
        </label>
        <input
          id="chamberName"
          type="text"
          required
          value={chamberName}
          onChange={(e) => setChamberName(e.target.value)}
          placeholder="CANACAR Capítulo Puebla / AMOTAC / Cámara de Comercio..."
          className="w-full px-4 py-3 text-[15px] bg-zinc-50 border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="region" className="block text-[13px] font-bold text-zinc-900 mb-2">
          Cobertura
        </label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full px-4 py-3 text-[15px] bg-zinc-50 border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
        >
          {REGION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="members" className="block text-[13px] font-bold text-zinc-900 mb-2">
            Socios estimados
          </label>
          <input
            id="members"
            type="number"
            min={0}
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            placeholder="Ej. 80"
            className="w-full px-4 py-3 text-[15px] bg-zinc-50 border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="vehicles" className="block text-[13px] font-bold text-zinc-900 mb-2">
            Unidades totales estimadas
          </label>
          <input
            id="vehicles"
            type="number"
            min={0}
            value={vehicles}
            onChange={(e) => setVehicles(e.target.value)}
            placeholder="Ej. 250"
            className="w-full px-4 py-3 text-[15px] bg-zinc-50 border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-[13px] font-bold text-zinc-900 mb-2">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Algo específico que debamos saber: tipo de carga, rutas críticas, sistemas actuales, etc."
          className="w-full px-4 py-3 text-[15px] bg-zinc-50 border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={!isValid}
          className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-lg transition-colors ${
            isValid
              ? 'text-white bg-[#25D366] hover:bg-[#20bd5a]'
              : 'text-zinc-400 bg-zinc-100 cursor-not-allowed'
          }`}
        >
          <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor"><path d="M16.004 2.002c-7.732 0-14.002 6.27-14.002 14.002 0 2.468.654 4.876 1.896 6.992L2 30l7.193-1.864A13.94 13.94 0 0 0 16.004 30c7.732 0 14.002-6.27 14.002-14.002-.004-7.728-6.274-13.996-14.002-13.996Zm0 25.6a11.6 11.6 0 0 1-5.918-1.624l-.424-.252-4.4 1.154 1.174-4.293-.277-.44a11.562 11.562 0 0 1-1.775-6.145c0-6.408 5.216-11.62 11.624-11.62 6.404 0 11.616 5.212 11.616 11.62-.004 6.408-5.216 11.6-11.62 11.6Zm6.372-8.7c-.348-.176-2.068-1.02-2.388-1.136-.32-.12-.552-.176-.784.176-.232.348-.9 1.136-1.104 1.368-.204.232-.408.26-.756.088-.348-.176-1.472-.544-2.804-1.732-1.036-.924-1.736-2.064-1.94-2.412-.204-.348-.02-.536.152-.712.156-.156.348-.408.524-.612.176-.204.232-.348.348-.58.116-.232.06-.436-.028-.612-.088-.176-.784-1.892-1.076-2.588-.284-.68-.572-.588-.784-.6-.204-.008-.436-.012-.668-.012s-.612.088-.932.436c-.32.348-1.22 1.192-1.22 2.908s1.248 3.372 1.424 3.604c.176.232 2.46 3.752 5.96 5.264.832.36 1.484.576 1.992.736.836.268 1.6.232 2.2.14.672-.1 2.068-.844 2.36-1.66.292-.82.292-1.52.204-1.664-.088-.148-.32-.232-.668-.408Z"/></svg>
          Enviar solicitud por WhatsApp
        </button>
        <p className="text-[12px] text-zinc-400 text-center leading-relaxed">
          Tu mensaje se abrirá pre-llenado en WhatsApp. No guardamos tus datos en nuestros servidores hasta que envíes el mensaje.
        </p>
        {submitted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-[13px] text-emerald-800">
            Solicitud abierta en WhatsApp. Si no se abrió automáticamente, agrega <span className="font-mono font-bold">+52 56 1066 9353</span> a tus contactos y escríbenos directo.
          </div>
        )}
      </div>
    </form>
  );
}
