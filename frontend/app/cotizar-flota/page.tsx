'use client';

/**
 * /cotizar-flota — public B2B quote request for fleet operators.
 *
 * No login required. Submission opens a pre-filled WhatsApp thread to
 * the SilentEye sales line so the conversation continues in the channel
 * trucking customers already use. This is intentionally simpler than a
 * traditional CRM form: friction matters more than data capture at this
 * stage of the funnel — once the WhatsApp message is sent, the lead is
 * captured in the inbox and a human takes over.
 */

import { useState } from 'react';
import Link from 'next/link';
import JsonLd, {
  getBreadcrumbJsonLd,
  getWebPageJsonLd,
} from '@/components/JsonLd';

const WHATSAPP_NUMBER = '525610669353';

const TIPO_OPTIONS = [
  'Tractocamión / Trailer',
  'Camión de carga (3.5 ton+)',
  'Camionetas / Pickup comercial',
  'Mixta (varios tipos)',
] as const;

const GPS_OPTIONS = [
  'Ya tengo GPS instalados',
  'Tengo algunos, faltan otros',
  'No tengo GPS, necesito recomendación',
] as const;

export default function CotizarFlotaPage() {
  const [empresa, setEmpresa] = useState('');
  const [contacto, setContacto] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [unidades, setUnidades] = useState('');
  const [tipo, setTipo] = useState<string>(TIPO_OPTIONS[0]);
  const [gpsState, setGpsState] = useState<string>(GPS_OPTIONS[0]);
  const [estado, setEstado] = useState('');

  const isValid =
    empresa.trim().length >= 2 &&
    contacto.trim().length >= 2 &&
    whatsapp.replace(/\D/g, '').length >= 10 &&
    Number(unidades) >= 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    const message = [
      `Hola, quiero cotizar SilentEye para mi flota.`,
      ``,
      `Empresa: ${empresa.trim()}`,
      `Contacto: ${contacto.trim()}`,
      `WhatsApp: ${whatsapp.trim()}`,
      `Unidades: ${unidades}`,
      `Tipo: ${tipo}`,
      `GPS actuales: ${gpsState}`,
      estado.trim() ? `Estado / zona de operación: ${estado.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: 'Inicio', url: 'https://silenteye.mx' },
          { name: 'Cotizar flota', url: 'https://silenteye.mx/cotizar-flota' },
        ])}
      />
      <JsonLd
        data={getWebPageJsonLd({
          name: 'Cotizar Flota — Rastreo Satelital y GPS para Camiones | SilentEye',
          description:
            'Solicita cotización de rastreo satelital para tu flota de camiones, trailers o tractocamión. Sin login, sin compromiso. Respuesta por WhatsApp en menos de 2 horas hábiles.',
          url: 'https://silenteye.mx/cotizar-flota',
        })}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-zinc-100 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </Link>
          <Link
            href="/rastreo-satelital-camiones"
            className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            ← Volver
          </Link>
        </div>
      </nav>

      <header className="px-6 pt-12 pb-6 md:pt-20 md:pb-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-[12px] font-bold text-blue-600 tracking-wider uppercase mb-3">
            Cotización para flotas
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Cotiza rastreo satelital para tu flota en 2 minutos
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed max-w-2xl">
            Llena 5 campos. Te respondemos por WhatsApp con cotización exacta y
            opciones de implementación. Sin login. Sin tarjeta. Sin compromiso.
          </p>
        </div>
      </header>

      <section className="px-6 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border-2 border-zinc-200 bg-white p-6 md:p-10 space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <label className="block">
                <span className="block text-[12px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                  Empresa o nombre comercial *
                </span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Transportes del Bajío"
                  className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-[12px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                  Persona de contacto *
                </span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <label className="block">
                <span className="block text-[12px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                  WhatsApp *
                </span>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="55 1234 5678"
                  className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-[12px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                  Número de unidades *
                </span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={unidades}
                  onChange={(e) => setUnidades(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[12px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                Tipo de unidades
              </span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none bg-white"
              >
                {TIPO_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[12px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                ¿Tienes GPS instalados?
              </span>
              <select
                value={gpsState}
                onChange={(e) => setGpsState(e.target.value)}
                className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none bg-white"
              >
                {GPS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[12px] font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                Estado / zona de operación (opcional)
              </span>
              <input
                type="text"
                maxLength={120}
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                placeholder="CDMX, Edomex, Puebla, Veracruz..."
                className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-[15px] focus:border-blue-500 focus:outline-none"
              />
            </label>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!isValid}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor">
                  <path d="M16.004 2.002c-7.732 0-14.002 6.27-14.002 14.002 0 2.468.654 4.876 1.896 6.992L2 30l7.193-1.864A13.94 13.94 0 0 0 16.004 30c7.732 0 14.002-6.27 14.002-14.002Z" />
                </svg>
                Enviar cotización por WhatsApp
              </button>
              <p className="text-[12px] text-zinc-400 text-center mt-3">
                Al enviar, abrimos WhatsApp con todos tus datos pre-llenados.
                Puedes editar antes de mandar.
              </p>
            </div>
          </form>

          {/* Trust signals */}
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              {
                title: 'Sin permanencia',
                desc: 'Cancela cuando quieras. Mes a mes.',
              },
              {
                title: 'Compatible con tu GPS',
                desc: 'Teltonika, Queclink, Concox, Cobán, Sinotrack.',
              },
              {
                title: 'Desde $79 MXN',
                desc: 'Por unidad/mes. Descuentos por volumen.',
              },
            ].map((b) => (
              <div key={b.title} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5">
                <p className="text-[13px] font-bold text-zinc-900 mb-1">{b.title}</p>
                <p className="text-[12px] text-zinc-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-100 px-6 py-10 mt-10">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold">SilentEye</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-zinc-400">
            <Link href="/rastreo-satelital-camiones" className="hover:text-zinc-600">Rastreo camiones</Link>
            <Link href="/precios" className="hover:text-zinc-600">Precios</Link>
            <Link href="/privacidad" className="hover:text-zinc-600">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
