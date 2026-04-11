/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 */

import Link from 'next/link';
import AuthRedirect from '@/components/AuthRedirect';
import SecretAdminTrigger from '@/components/SecretAdminTrigger';
import JsonLd, { organizationJsonLd, softwareJsonLd, faqJsonLd, howToJsonLd, serviceJsonLd, webSiteJsonLd, getBreadcrumbJsonLd } from '@/components/JsonLd';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden selection:bg-blue-600/10">
      <AuthRedirect />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={howToJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={webSiteJsonLd} />
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
      ])} />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-zinc-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-500">
            <a href="#como-funciona" className="hover:text-zinc-900 transition-colors">Cómo funciona</a>
            <a href="#para-quien" className="hover:text-zinc-900 transition-colors">Para quién</a>
            <a href="#dispositivos" className="hover:text-zinc-900 transition-colors">GPS compatibles</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
            <Link href="/blog" className="hover:text-zinc-900 transition-colors">Blog</Link>
            <Link href="/precios" className="hover:text-zinc-900 transition-colors">Precios</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/sos" className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              SOS
            </Link>
            <Link href="/login" className="hidden sm:inline-flex px-4 py-2 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Acceder
            </Link>
            {/* Mobile menu */}
            <div className="md:hidden relative group/menu">
              <input type="checkbox" id="mobile-menu" className="sr-only peer" aria-label="Abrir menú de navegación" />
              <label htmlFor="mobile-menu" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-100 cursor-pointer transition-colors">
                <svg className="peer-checked:group-[]/menu:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              </label>
              <div className="hidden peer-checked:block absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-zinc-200 py-3 z-50">
                <a href="#como-funciona" className="block px-5 py-2.5 text-[14px] text-zinc-600 hover:bg-zinc-50">Cómo funciona</a>
                <a href="#para-quien" className="block px-5 py-2.5 text-[14px] text-zinc-600 hover:bg-zinc-50">Para quién</a>
                <a href="#dispositivos" className="block px-5 py-2.5 text-[14px] text-zinc-600 hover:bg-zinc-50">GPS compatibles</a>
                <a href="#faq" className="block px-5 py-2.5 text-[14px] text-zinc-600 hover:bg-zinc-50">FAQ</a>
                <Link href="/blog" className="block px-5 py-2.5 text-[14px] text-zinc-600 hover:bg-zinc-50">Blog</Link>
                <Link href="/precios" className="block px-5 py-2.5 text-[14px] text-zinc-600 hover:bg-zinc-50">Precios</Link>
                <div className="border-t border-zinc-100 my-2" />
                <Link href="/sos" className="block px-5 py-2.5 text-[14px] font-semibold text-red-600 hover:bg-red-50">Emergencia SOS</Link>
                <Link href="/login" className="block px-5 py-2.5 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-50">Acceder</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative px-6 pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,white_60%,#f8fafc)]" />
        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-6">
              Plataforma GPS · Autos · Motos · Camiones · Trailers · Flotillas
            </p>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-zinc-900 mb-6">
              Te roban el auto.{' '}
              <span className="relative inline-block">
                En 3 segundos, todos a 2 km ya lo están buscando.
                <span className="absolute -bottom-1 left-0 w-full h-3 bg-blue-600/10 -skew-x-6 rounded-sm" />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-500 leading-relaxed max-w-xl mb-10">
              SilentEye convierte tu GPS en un sistema de alerta masiva.
              Oprimes un botón y tu ubicación en vivo llega a conductores,
              voluntarios y toda la red de apoyo cercana — sin llamar a una central,
              sin esperar respuesta. Automático.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Comenzar gratis
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <Link
                href="/sos"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                Emergencia SOS
              </Link>
            </div>
          </div>

          {/* Hero visual — CSS art dashboard mockup */}
          <div className="hidden lg:block absolute right-0 top-8 w-[480px]" aria-hidden="true">
            <div className="relative bg-zinc-900 rounded-xl p-4 shadow-2xl shadow-zinc-900/20 border border-zinc-800">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-3 text-[10px] text-zinc-500 font-mono">dashboard / mapa en vivo</span>
              </div>
              <div className="relative bg-zinc-800 rounded-lg h-52 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-[size:24px_24px]" />
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 208">
                  <path d="M40,160 C80,140 120,80 200,90 S320,40 420,60" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="6,4" opacity="0.6"/>
                  <circle cx="200" cy="90" r="5" fill="#3b82f6"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle>
                  <circle cx="200" cy="90" r="10" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3"><animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/></circle>
                  <circle cx="420" cy="60" r="4" fill="#22c55e"/>
                  <circle cx="80" cy="145" r="4" fill="#22c55e"/>
                  <circle cx="320" cy="130" r="7" fill="#ef4444"><animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/></circle>
                  <circle cx="320" cy="130" r="14" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4"><animate attributeName="r" values="14;24;14" dur="1.5s" repeatCount="indefinite"/></circle>
                  <text x="332" y="126" fill="#fca5a5" fontSize="8" fontFamily="monospace">SOS</text>
                </svg>
              </div>
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 3 en línea</span>
                  <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> 1 alerta</span>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono">Puebla, MX</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Metrics strip ── */}
      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { val: '24/7', label: 'Monitoreo continuo' },
            { val: '<3s', label: 'Tiempo de alerta' },
            { val: '2 km', label: 'Radio de respuesta' },
            { val: '0', label: 'Apps que instalar' },
          ].map((m, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight font-mono">{m.val}</div>
              <div className="text-sm text-zinc-400 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Proceso</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Cómo funciona la recuperación vehicular</h2>
            <p className="text-zinc-500 leading-relaxed">Un asalto vehicular en México dura entre 30 y 90 segundos. Los GPS tradicionales tardan 8–25 minutos en responder. SilentEye lo hace en 3.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>,
                title: 'Conecta tu GPS existente',
                desc: '¿Ya tienes GPS instalado? Apúntalo a SilentEye. Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack. Sin cambiar de equipo.',
                color: 'bg-blue-50 border-blue-200',
                accent: 'text-blue-600 bg-blue-100',
              },
              {
                n: '02',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
                title: 'SilentEye vigila 24/7',
                desc: 'La plataforma analiza cada señal GPS en tiempo real. Detecta robo, corte de corriente, movimiento no autorizado y botón de pánico — todo automático.',
                color: 'bg-emerald-50 border-emerald-200',
                accent: 'text-emerald-600 bg-emerald-100',
              },
              {
                n: '03',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                title: 'Alerta masiva en 3 segundos',
                desc: 'Ante emergencia, tu ubicación GPS en vivo llega a administradores, voluntarios y conductores en un radio de 2 km. Todos ven dónde está tu vehículo en tiempo real.',
                color: 'bg-red-50 border-red-200',
                accent: 'text-red-600 bg-red-100',
              },
            ].map((s) => (
              <div key={s.n} className={`rounded-xl border-2 ${s.color} p-8`}>
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${s.accent} mb-4 font-extrabold text-sm font-mono`}>{s.n}</div>
                <div className="flex justify-center mb-5">{s.icon}</div>
                <h3 className="font-extrabold text-zinc-900 text-lg mb-2">{s.title}</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Connection line */}
          <div className="hidden md:block mt-4">
            <svg className="w-full h-8" viewBox="0 0 900 24" fill="none">
              <line x1="150" y1="12" x2="750" y2="12" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8,4">
                <animate attributeName="stroke-dashoffset" values="12;0" dur="1s" repeatCount="indefinite"/>
              </line>
              <circle cx="150" cy="12" r="6" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2"/>
              <circle cx="450" cy="12" r="6" fill="#dcfce7" stroke="#059669" strokeWidth="2"/>
              <circle cx="750" cy="12" r="6" fill="#fef2f2" stroke="#ef4444" strokeWidth="2"/>
            </svg>
          </div>

          <div className="mt-8 bg-zinc-900 text-white rounded-xl px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            </div>
            <div>
              <p className="font-bold text-[15px] mb-1">¿No tienes GPS? El botón SOS es gratis</p>
              <p className="text-zinc-400 text-[14px] leading-relaxed">Cualquier persona puede usar el botón de emergencia ciudadano. Abre SilentEye en tu celular, presiona SOS y tu ubicación llega a toda la red de ayuda cercana. Sin app, sin costo, sin registro complicado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparativa ── */}
      <section id="comparativa" className="px-6 py-24 md:py-32 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Comparativa</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">GPS tradicional vs SilentEye</h2>
            <p className="text-zinc-500 leading-relaxed">La diferencia no es el dispositivo. Es lo que pasa después de oprimir el botón.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b-2 border-zinc-200">
                  <th className="py-4 pr-6 text-zinc-400 font-semibold text-[13px] uppercase tracking-wider w-1/3" />
                  <th className="py-4 px-4 text-zinc-400 font-semibold text-[13px] uppercase tracking-wider w-1/3">GPS Tradicional</th>
                  <th className="py-4 px-4 text-zinc-900 font-semibold text-[13px] uppercase tracking-wider w-1/3 bg-blue-50/50 rounded-t-lg">SilentEye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[
                  { label: 'Al oprimir el botón de pánico', trad: 'Se genera un evento en el servidor. Alguien lo revisa después.', se: 'Alerta instantánea a todas las personas cercanas con ubicación en vivo.' },
                  { label: 'Tiempo de reacción', trad: '8–25 min (depende de la central)', se: '<3 segundos (automático)' },
                  { label: 'Depende de una llamada', trad: 'Sí. Alguien debe llamar o contestar.', se: 'No. La distribución es automática.' },
                  { label: 'Quién recibe la alerta', trad: 'Solo la central de monitoreo.', se: 'Admins + conductores + helpers + ciudadanos cercanos.' },
                  { label: 'Ubicación en tiempo real', trad: 'Solo para quien accede al portal.', se: 'Todos los notificados ven la ubicación en vivo.' },
                  { label: 'Enfoque', trad: 'Pasivo: registrar y revisar.', se: 'Activo: distribuir y reaccionar.' },
                  { label: 'Funciona sin app', trad: 'No. Requiere app o portal.', se: 'Sí. SOS desde el navegador, sin instalar nada.' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-4 pr-6 font-semibold text-zinc-900">{row.label}</td>
                    <td className="py-4 px-4 text-zinc-400">{row.trad}</td>
                    <td className="py-4 px-4 text-zinc-700 bg-blue-50/30 font-medium">{row.se}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Para quién ── */}
      <section id="para-quien" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Casos de uso</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Seguridad vehicular para cada necesidad</h2>
            <p className="text-zinc-500 leading-relaxed">Conductores de Uber, flotillas de carga o tu auto particular. SilentEye se adapta.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2v4l-4 2"/><circle cx="12" cy="21" r="1"/><circle cx="5" cy="21" r="1"/><path d="M5 20h7"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg mb-2">Conductores de Uber, Didi e InDriver</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-4">
                Cada día suben pasajeros desconocidos. Si algo sale mal, no pueden sacar el celular. Con SilentEye, un botón de pánico en el GPS alerta a toda la red sin que nadie lo note.
              </p>
              <div className="flex items-center gap-2 text-[12px] font-medium text-amber-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                Botón discreto · Alerta silenciosa
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.684-.948V6h2a2 2 0 0 1 2 2v4.5"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg mb-2">Flotillas, camiones y trailers</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-4">
                Robo de carga en carretera: el conductor está solo y sin cobertura. Con SilentEye, la alerta llega a la base y a toda la flotilla cercana para coordinar antes de que el trailer desaparezca.
              </p>
              <div className="flex items-center gap-2 text-[12px] font-medium text-blue-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                GPS industrial · Alerta a toda la flota
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A1.5 1.5 0 0 0 14.1 6H9.9a1.5 1.5 0 0 0-1.2.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg mb-2">Autos, motos y camionetas</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-4">
                Tu familiar sale de noche y no contesta. Con SilentEye ves su ubicación en tiempo real, y si oprime el botón de pánico, tú y todos los cercanos reciben la alerta al instante.
              </p>
              <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                Tranquilidad familiar · Ubicación en vivo
              </div>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4 text-center">
            <Link href="/blog/mejor-gps-para-auto-mexico" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">Guía GPS para autos →</Link>
            <Link href="/blog/gps-para-trailers-camiones-carga" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">Guía GPS para trailers →</Link>
            <Link href="/blog/gps-para-motos-antirrobo" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">Guía GPS para motos →</Link>
          </div>
        </div>
      </section>

      {/* ── Dispositivos GPS compatibles ── */}
      <section id="dispositivos" className="px-6 py-24 md:py-32 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Compatibilidad</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">GPS compatibles con SilentEye</h2>
            <p className="text-zinc-500 leading-relaxed">5 marcas, un solo panel. Si tu GPS es de alguna de estas marcas, se conecta directo. Sin adaptadores, sin configuración extra.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                brand: 'Teltonika',
                origin: 'Lituania',
                models: 'FMB920, FMC920, FMC130',
                color: 'border-blue-200 bg-white',
                badge: 'bg-blue-50 text-blue-700',
                desc: 'Grado industrial. Ideal para flotillas, trailers y vehículos comerciales.',
                ideal: 'Flotillas y uso profesional',
              },
              {
                brand: 'Queclink',
                origin: 'China',
                models: 'GL300, GV300, GV58CEU',
                color: 'border-emerald-200 bg-white',
                badge: 'bg-emerald-50 text-emerald-700',
                desc: 'Versátiles y compactos. Buena relación calidad-precio para flotas medianas.',
                ideal: 'Flotas medianas y particulares',
              },
              {
                brand: 'Concox',
                origin: 'China',
                models: 'GT06N, WeTrack2, GV20, JM-VL',
                color: 'border-violet-200 bg-white',
                badge: 'bg-violet-50 text-violet-700',
                desc: 'Compactos y confiables. Alarmas SOS, corte de corriente y geocercas.',
                ideal: 'Uso general y profesional',
              },
              {
                brand: 'Cobán',
                origin: 'China',
                models: 'TK103, TK303, GPS103',
                color: 'border-amber-200 bg-white',
                badge: 'bg-amber-50 text-amber-700',
                desc: 'La marca más popular en México. Fácil de conseguir y económica.',
                ideal: 'Particulares y adopción rápida',
              },
              {
                brand: 'Sinotrack',
                origin: 'China',
                models: 'ST-901, ST-906',
                color: 'border-rose-200 bg-white',
                badge: 'bg-rose-50 text-rose-700',
                desc: 'Ultra compactos y económicos. Ideales para motos y autos pequeños.',
                ideal: 'Motos y vehículos pequeños',
              },
            ].map((d, i) => (
              <div key={i} className={`rounded-xl border-2 ${d.color} p-6 hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-extrabold text-zinc-900">{d.brand}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${d.badge}`}>{d.origin}</span>
                </div>
                <p className="text-[13px] text-zinc-500 leading-relaxed mb-3">{d.desc}</p>
                <div className="flex items-start gap-2 text-[12px] mb-1">
                  <span className="font-semibold text-zinc-400 w-14 flex-shrink-0">Modelos</span>
                  <span className="text-zinc-700 font-medium">{d.models}</span>
                </div>
                <div className="flex items-start gap-2 text-[12px]">
                  <span className="font-semibold text-zinc-400 w-14 flex-shrink-0">Ideal</span>
                  <span className="text-zinc-600">{d.ideal}</span>
                </div>
              </div>
            ))}

            {/* "Ya tienes GPS?" card */}
            <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-700 mb-2">¿Ya tienes un GPS?</h3>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">Si tu dispositivo es de alguna de estas marcas, solo apunta el servidor a SilentEye. Sin cambiar de equipo.</p>
              <Link href="/login" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                Conectar mi GPS
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto">
          <div className="mb-14">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Preguntas frecuentes</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Lo que necesitas saber sobre rastreo GPS</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {[
              { q: '¿Necesito instalar alguna app?', a: 'No. SilentEye funciona directo en el navegador de tu celular. Entra al sitio, regístrate con tu teléfono y listo. Sin descargas, sin espacio en tu celular.' },
              { q: '¿El botón SOS tiene algún costo?', a: 'No. El botón de emergencia ciudadano es completamente gratuito para cualquier persona. Solo necesitas un número de teléfono para registrarte.' },
              { q: '¿Necesito comprar un GPS nuevo?', a: 'No necesariamente. Si ya tienes un GPS Teltonika, Queclink, Concox, Cobán o Sinotrack, solo necesitas apuntar el servidor a SilentEye. La plataforma es compatible con estos equipos sin necesidad de cambiar de hardware.' },
              { q: '¿Qué marcas de GPS son compatibles?', a: 'SilentEye es multi-marca: Teltonika (FMB/FMC series), Queclink (GL300, GV300, GV58CEU), Concox (GT06N, WeTrack2, GV20, JM-VL), Cobán (TK103, TK303, GPS103) y Sinotrack (ST-901, ST-906). Si tu GPS es de alguna de estas marcas, se conecta directamente.' },
              { q: '¿Quién recibe mis alertas de emergencia?', a: 'Los administradores del sistema y cualquier voluntario o conductor registrado que se encuentre dentro del radio de 2 km de tu ubicación. Entre más personas estén registradas, más rápida la respuesta.' },
              { q: '¿Funciona en todo México?', a: 'Sí, siempre que haya señal de telefonía móvil. En zonas urbanas y carreteras principales la cobertura es excelente. Funciona en CDMX, Puebla, Guadalajara, Monterrey y cualquier ciudad del país.' },
              { q: '¿Puedo monitorear más de un vehículo?', a: 'Sí. SilentEye soporta flotas completas. Cada vehículo — auto, moto, camión, trailer o camioneta — aparece de forma independiente en el mapa con su propia información de ubicación GPS, velocidad e historial de recorridos.' },
              { q: '¿Cuánto cuesta la plataforma GPS?', a: 'El botón de emergencia SOS es gratuito para todos. La plataforma de rastreo GPS tiene planes accesibles que dependen de la cantidad de vehículos. Contacta con nosotros para una cotización personalizada según tu flota.' },
            ].map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none text-[15px] font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                  {item.q}
                  <svg className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-45 flex-shrink-0 ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </summary>
                <p className="pb-5 text-[15px] text-zinc-500 leading-relaxed -mt-1">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-zinc-900 text-white rounded-2xl px-8 py-16 md:px-16 md:py-20 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-lg">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                Cada segundo cuenta cuando te roban el auto
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                No esperes a que pase. Conecta tu GPS hoy y ten la red de respuesta más rápida de México a tu favor. O activa el botón SOS gratuito ahora.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Crear cuenta gratis
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
                <Link
                  href="/sos"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-red-400 bg-white/10 rounded-lg hover:bg-white/15 transition-colors"
                >
                  Emergencia SOS
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-100 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <SecretAdminTrigger>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                  <span className="text-sm font-bold tracking-tight">SilentEye</span>
                </div>
              </SecretAdminTrigger>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-3">
                Alerta de robo vehicular en 3 segundos. Plataforma GPS con respuesta automática para México.
              </p>
              <p className="text-[12px] text-zinc-400">
                contacto@silenteye.mx
              </p>
            </div>

            {/* Plataforma */}
            <div>
              <h4 className="text-[13px] font-bold text-zinc-900 mb-4">Plataforma</h4>
              <div className="space-y-2.5 text-[13px] text-zinc-400">
                <a href="#como-funciona" className="block hover:text-zinc-900 transition-colors">Cómo funciona</a>
                <a href="#comparativa" className="block hover:text-zinc-900 transition-colors">Comparativa GPS</a>
                <a href="#para-quien" className="block hover:text-zinc-900 transition-colors">Para quién</a>
                <a href="#dispositivos" className="block hover:text-zinc-900 transition-colors">GPS compatibles</a>
                <Link href="/sos" className="block hover:text-zinc-900 transition-colors">Emergencia SOS</Link>
                <Link href="/precios" className="block hover:text-zinc-900 transition-colors">Precios</Link>
              </div>
            </div>

            {/* Blog popular */}
            <div>
              <h4 className="text-[13px] font-bold text-zinc-900 mb-4">Guías GPS</h4>
              <div className="space-y-2.5 text-[13px] text-zinc-400">
                <Link href="/blog/mejor-gps-para-auto-mexico" className="block hover:text-zinc-900 transition-colors">Mejor GPS para auto</Link>
                <Link href="/blog/gps-para-trailers-camiones-carga" className="block hover:text-zinc-900 transition-colors">GPS para trailers</Link>
                <Link href="/blog/gps-para-motos-antirrobo" className="block hover:text-zinc-900 transition-colors">GPS para motos</Link>
                <Link href="/blog/gps-para-flotillas-gestion-vehiculos" className="block hover:text-zinc-900 transition-colors">GPS para flotillas</Link>
                <Link href="/blog/como-instalar-gps-en-auto" className="block hover:text-zinc-900 transition-colors">Cómo instalar GPS</Link>
                <Link href="/blog" className="block hover:text-zinc-900 transition-colors font-medium">Ver todo el blog →</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[13px] font-bold text-zinc-900 mb-4">Legal</h4>
              <div className="space-y-2.5 text-[13px] text-zinc-400">
                <Link href="/privacidad" className="block hover:text-zinc-900 transition-colors">Política de privacidad</Link>
                <Link href="/cookies" className="block hover:text-zinc-900 transition-colors">Política de cookies</Link>
                <Link href="/terminos" className="block hover:text-zinc-900 transition-colors">Términos de servicio</Link>
                <Link href="/login" className="block hover:text-zinc-900 transition-colors">Acceder a la plataforma</Link>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-zinc-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-[12px] text-zinc-300">SilentEye &copy; {new Date().getFullYear()} — Alerta y recuperación vehicular GPS en México</span>
            <div className="flex items-center gap-4 text-[12px] text-zinc-400">
              <a href="#faq" className="hover:text-zinc-600 transition-colors">FAQ</a>
              <Link href="/blog" className="hover:text-zinc-600 transition-colors">Blog</Link>
              <Link href="/sos" className="hover:text-zinc-600 transition-colors">SOS</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
