/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 */

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden selection:bg-blue-600/10">

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
            <a href="#problema" className="hover:text-zinc-900 transition-colors">Problema</a>
            <a href="#producto" className="hover:text-zinc-900 transition-colors">Producto</a>
            <a href="#equipo" className="hover:text-zinc-900 transition-colors">Equipo GPS</a>
            <a href="#comparativa" className="hover:text-zinc-900 transition-colors">Comparativa</a>
            <a href="#casos" className="hover:text-zinc-900 transition-colors">Casos</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/sos" className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              SOS
            </Link>
            <Link href="/login" className="px-4 py-2 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Acceder
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative px-6 pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,white_60%,#f8fafc)]" />
        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-6">
              Plataforma de seguridad vehicular
            </p>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-zinc-900 mb-6">
              Monitoreo GPS y{' '}
              <span className="relative inline-block">
                respuesta inmediata
                <span className="absolute -bottom-1 left-0 w-full h-3 bg-blue-600/10 -skew-x-6 rounded-sm" />
              </span>{' '}
              ante emergencias
            </h1>
            <p className="text-lg md:text-xl text-zinc-500 leading-relaxed max-w-xl mb-10">
              Rastrea tus vehículos en tiempo real. Activa alertas de pánico
              desde el GPS o desde cualquier celular. La ayuda llega en segundos.
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

          {/* Hero visual – CSS art dashboard mockup */}
          <div className="hidden lg:block absolute right-0 top-8 w-[480px]" aria-hidden="true">
            <div className="relative bg-zinc-900 rounded-xl p-4 shadow-2xl shadow-zinc-900/20 border border-zinc-800">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-3 text-[10px] text-zinc-500 font-mono">dashboard / mapa en vivo</span>
              </div>
              {/* Fake map */}
              <div className="relative bg-zinc-800 rounded-lg h-52 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-[size:24px_24px]" />
                {/* Fake route line */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 208">
                  <path d="M40,160 C80,140 120,80 200,90 S320,40 420,60" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="6,4" opacity="0.6"/>
                  {/* Vehicle dots */}
                  <circle cx="200" cy="90" r="5" fill="#3b82f6"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle>
                  <circle cx="200" cy="90" r="10" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3"><animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/></circle>
                  <circle cx="420" cy="60" r="4" fill="#22c55e"/>
                  <circle cx="80" cy="145" r="4" fill="#22c55e"/>
                  {/* SOS pin */}
                  <circle cx="320" cy="130" r="7" fill="#ef4444"><animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/></circle>
                  <circle cx="320" cy="130" r="14" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4"><animate attributeName="r" values="14;24;14" dur="1.5s" repeatCount="indefinite"/></circle>
                  <text x="332" y="126" fill="#fca5a5" fontSize="8" fontFamily="monospace">SOS</text>
                </svg>
              </div>
              {/* Fake status bar */}
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

      {/* ── El Problema Real ── */}
      <section id="problema" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-red-600 tracking-wide uppercase mb-3">El problema real</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Un GPS que solo rastrea no te protege</h2>
            <p className="text-zinc-500 leading-relaxed">La mayoría de los sistemas de seguridad vehicular fueron diseñados para localizar, no para reaccionar. Y en una emergencia, la diferencia es todo.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 mb-2">El tiempo corre en tu contra</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed">
                En México, un asalto vehicular dura entre 30 y 90 segundos. Los sistemas que dependen de que alguien llame a una central, espere confirmación y despache ayuda tardan entre 8 y 25 minutos en generar una respuesta. Para entonces, el evento ya terminó.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 mb-2">El botón de pánico tradicional es pasivo</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed">
                La mayoría de los botones de pánico generan un &quot;evento&quot; en un servidor. Alguien lo revisa después, quizás minutos u horas más tarde. No hay distribución automática, no hay alerta a personas cercanas, no hay reacción coordinada en tiempo real.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 mb-2">Depender de una llamada es una vulnerabilidad</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed">
                Si estás siendo asaltado, no puedes llamar. Si tu GPS depende de una central que recibe llamadas para actuar, tu sistema de seguridad tiene un punto de falla humano. La reacción debe ser automática, no depender de que alguien conteste un teléfono.
              </p>
            </div>
          </div>

          <div className="mt-10 bg-zinc-900 text-white rounded-xl px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
            </div>
            <div>
              <p className="font-bold text-[15px] mb-1">SilentEye resuelve esto con un cambio fundamental</p>
              <p className="text-zinc-400 text-[14px] leading-relaxed">En lugar de registrar un evento para revisión posterior, distribuye la alerta en menos de 3 segundos a todas las personas cercanas con ubicación GPS en tiempo real. No hay central, no hay llamada, no hay espera. La reacción ocurre mientras el evento sigue sucediendo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product: Bento grid ── */}
      <section id="producto" className="px-6 py-24 md:py-32 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Producto</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Dos sistemas, una plataforma</h2>
            <p className="text-zinc-500 leading-relaxed">Protección profesional GPS para flotas y un botón de pánico ciudadano abierto a todos, unificados en un solo panel.</p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {/* GPS – large */}
            <div className="md:col-span-3 group relative bg-zinc-50 border border-zinc-200 rounded-xl p-8 overflow-hidden hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">GPS</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Rastreo vehicular en tiempo real</h3>
              <p className="text-zinc-500 text-[15px] leading-relaxed mb-6 max-w-md">
                Monitorea tu flota completa con GPS Teltonika. Ubicación en vivo, historial de
                recorridos, alertas de exceso de velocidad y geocercas automáticas.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium text-zinc-400">
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Ubicación en vivo</span>
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Historial de rutas</span>
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Alertas automáticas</span>
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Botón de pánico físico</span>
              </div>
            </div>

            {/* SOS – tall */}
            <div className="md:col-span-2 group relative bg-red-600 text-white rounded-xl p-8 overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                </div>
                <span className="text-[11px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-md uppercase tracking-wider">SOS</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Botón de emergencia ciudadano</h3>
              <p className="text-red-100 text-[15px] leading-relaxed mb-6">
                Cualquier persona. Sin app. Un toque envía tu ubicación a
                toda la red de ayuda cercana. Gratis y anónimo.
              </p>
              <Link href="/sos" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                Activar SOS
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>

            {/* Small feature cards */}
            {[
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8Z"/><circle cx="12" cy="10" r="3"/></svg>, title: 'Geolocalización precisa', desc: 'GPS industrial + geolocalización del navegador. Precisión metro a metro.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: 'Red de apoyo', desc: 'Voluntarios y conductores cercanos reciben tu alerta en tiempo real.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, title: 'Autenticación segura', desc: 'Verificación OTP por teléfono. Sin contraseñas, sin datos innecesarios.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>, title: 'Respuesta inmediata', desc: 'De alerta a notificación en menos de 3 segundos. Cada segundo importa.' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>, title: 'Desde el navegador', desc: 'Sin apps que instalar. Abre el link, regístrate con tu teléfono y listo.' },
            ].map((f, i) => (
              <div key={i} className="md:col-span-1 bg-zinc-50 border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-zinc-200/70 flex items-center justify-center text-zinc-600 mb-3">
                  {f.icon}
                </div>
                <h4 className="text-[14px] font-bold mb-1">{f.title}</h4>
                <p className="text-[13px] text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="px-6 py-24 md:py-32 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Proceso</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Funciona en 3 pasos</h2>
            <p className="text-zinc-500 leading-relaxed">Elige el modo que necesitas. Ambos funcionan desde el primer minuto.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            {/* GPS column */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>
                </div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Protección GPS</h3>
              </div>
              <div className="space-y-10">
                {[
                  { n: '01', t: 'Instalación', d: 'Un técnico instala el GPS Teltonika en tu vehículo. Discreto, sin modificaciones visibles. 30 minutos.' },
                  { n: '02', t: 'Monitorea', d: 'Accede al panel desde cualquier dispositivo. Mapa en vivo, historial, velocidad y estado de cada vehículo.' },
                  { n: '03', t: 'Respuesta', d: 'Ante emergencia, el botón físico del GPS alerta a toda la red con ubicación exacta. Respuesta coordinada.' },
                ].map((s) => (
                  <div key={s.n} className="flex gap-5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-extrabold font-mono">{s.n}</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 mb-1">{s.t}</h4>
                      <p className="text-[15px] text-zinc-500 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SOS column */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
                </div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Emergencia SOS</h3>
              </div>
              <div className="space-y-10">
                {[
                  { n: '01', t: 'Regístrate', d: 'Abre SilentEye en tu celular. Ingresa tu número de teléfono y verifica con el código que recibes. Sin apps.' },
                  { n: '02', t: 'Presiona SOS', d: 'Un botón rojo, grande y claro. Un toque envía tu ubicación GPS como alerta de emergencia inmediata.' },
                  { n: '03', t: 'Ayuda en camino', d: 'Administradores y voluntarios cercanos reciben la alerta con tu ubicación en tiempo real. Coordinación inmediata.' },
                ].map((s) => (
                  <div key={s.n} className="flex gap-5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-extrabold font-mono">{s.n}</div>
                    <div>
                      <h4 className="font-bold text-zinc-900 mb-1">{s.t}</h4>
                      <p className="text-[15px] text-zinc-500 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparativa ── */}
      <section id="comparativa" className="px-6 py-24 md:py-32">
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

      {/* ── Casos de uso ── */}
      <section id="casos" className="px-6 py-24 md:py-32 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Casos de uso</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Quién lo necesita y por qué</h2>
            <p className="text-zinc-500 leading-relaxed">SilentEye no es solo para flotillas. Es para cualquiera que necesite reacción inmediata ante una emergencia vehicular.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Case 1: Conductores de apps */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 4 2v4l-4 2"/><circle cx="12" cy="21" r="1"/><circle cx="5" cy="21" r="1"/><path d="M5 20h7"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg mb-2">Conductores de apps</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-4">
                Uber, Didi, InDriver. Cada día suben pasajeros desconocidos. Si algo sale mal, no pueden sacar el celular ni hacer una llamada. Con SilentEye, un botón físico en el vehículo alerta a toda la red sin que nadie lo note.
              </p>
              <div className="flex items-center gap-2 text-[12px] font-medium text-amber-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                Botón discreto · Alerta silenciosa
              </div>
            </div>

            {/* Case 2: Flotillas y trailers */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.684-.948V6h2a2 2 0 0 1 2 2v4.5"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg mb-2">Flotillas y trailers</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-4">
                Robo de carga en carretera: el conductor está solo, sin cobertura y a merced de los asaltantes. Con GPS Teltonika, la alerta llega a la base y a todos los vehículos cercanos de la flotilla. Coordinación antes de que el trailer desaparezca.
              </p>
              <div className="flex items-center gap-2 text-[12px] font-medium text-blue-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                GPS industrial · Alertas a toda la flota
              </div>
            </div>

            {/* Case 3: Vehículos particulares */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 hover:border-blue-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A1.5 1.5 0 0 0 14.1 6H9.9a1.5 1.5 0 0 0-1.2.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
              <h3 className="font-bold text-zinc-900 text-lg mb-2">Vehículos particulares</h3>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-4">
                Tu familiar sale de noche y no contesta el teléfono. Con SilentEye puedes ver su ubicación en tiempo real, y si oprime el botón de pánico, tú y todos los cercanos reciben la alerta al instante. No necesitas esperar para actuar.
              </p>
              <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                Tranquilidad familiar · Ubicación en vivo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Equipo GPS ── */}
      <section id="equipo" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Equipo</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Todo lo que necesitas, listo para instalar</h2>
            <p className="text-zinc-500 leading-relaxed">Un solo equipo GPS profesional, ya configurado con SilentEye. Lo recibes, lo instalas y empiezas a monitorear.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Product card */}
            <div className="relative bg-zinc-50 border border-zinc-200 rounded-2xl p-8 md:p-10 overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="text-[11px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-full uppercase tracking-wider">Listo para usar</span>
              </div>

              {/* CSS art device */}
              <div className="relative w-full max-w-[280px] mx-auto mb-8" aria-hidden="true">
                <div className="relative bg-zinc-900 rounded-xl p-5 shadow-lg">
                  {/* Device body */}
                  <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] text-zinc-400 font-mono">GPS ACTIVO</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono">FMC130</span>
                    </div>
                    <div className="bg-zinc-700/50 rounded h-20 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#374151_1px,transparent_1px),linear-gradient(to_bottom,#374151_1px,transparent_1px)] bg-[size:12px_12px]" />
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 bg-emerald-500/60 rounded-full" />)}
                      </div>
                      <span className="text-[8px] text-zinc-500 font-mono">TELTONIKA</span>
                    </div>
                  </div>
                  {/* Connector dots */}
                  <div className="flex justify-center gap-3 mt-3">
                    <div className="w-3 h-3 rounded-full bg-zinc-700 border border-zinc-600" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700 border border-zinc-600" />
                    <div className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700 border border-zinc-600" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-extrabold text-zinc-900 mb-1">GPS Teltonika FMC130</h3>
              <p className="text-zinc-400 text-sm mb-6">Rastreador vehicular profesional de grado industrial</p>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight">$1,900</span>
                <span className="text-lg text-zinc-400 font-semibold">MXN</span>
              </div>
              <p className="text-[13px] text-blue-600 font-semibold mb-8 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                Envío gratis a toda la República Mexicana
              </p>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 text-sm font-semibold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Solicitar equipo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>

            {/* What's included */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-zinc-900 mb-6">El equipo incluye</h3>

              {[
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>, color: 'bg-blue-50 text-blue-600', title: 'GPS Teltonika FMC130', desc: 'Rastreador de grado industrial con antena GPS y GSM integrada. Resistente a vibraciones y temperaturas extremas.' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>, color: 'bg-emerald-50 text-emerald-600', title: 'Preconfigurado con SilentEye', desc: 'El equipo llega listo para conectar. Ya configurado con el servidor, botón de pánico activado y envío de datos cada 4 segundos en emergencia.' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>, color: 'bg-red-50 text-red-600', title: 'Botón de pánico físico', desc: 'Botón discreto para instalar en el vehículo. Al presionarlo, la alerta llega a toda la red de ayuda en menos de 3 segundos.' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>, color: 'bg-amber-50 text-amber-600', title: 'Arnés de cableado', desc: 'Cables y conectores para la instalación. Compatible con vehículos 12V y 24V (autos, camionetas, tráilers).' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>, color: 'bg-purple-50 text-purple-600', title: 'SIM con datos incluida', desc: 'Chip de datos celular activo para la transmisión GPS. Sin contratos adicionales por el primer periodo.' },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.684-.948V6h2a2 2 0 0 1 2 2v4.5"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/></svg>, color: 'bg-zinc-100 text-zinc-600', title: 'Envío a todo México', desc: 'Entrega a domicilio por paquetería en 3–5 días hábiles. Sin costo adicional de envío.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-zinc-900 mb-0.5">{item.title}</h4>
                    <p className="text-[13px] text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}

              <div className="mt-8 bg-zinc-900 text-white rounded-xl px-5 py-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                </div>
                <div>
                  <p className="font-bold text-sm">$1,900 MXN — precio final</p>
                  <p className="text-zinc-400 text-[13px] mt-0.5">Incluye equipo + configuración + botón de pánico + SIM + envío. Sin letras chicas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-24 md:py-32 border-t border-zinc-100">
        <div className="max-w-3xl mx-auto">
          <div className="mb-14">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Preguntas frecuentes</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Lo que necesitas saber</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {[
              { q: '¿Necesito instalar alguna app?', a: 'No. SilentEye funciona directo en el navegador de tu celular. Entra al sitio, regístrate con tu teléfono y listo. Sin descargas, sin espacio en tu celular.' },
              { q: '¿El botón SOS tiene algún costo?', a: 'No. El botón de emergencia ciudadano es completamente gratuito para cualquier persona. Solo necesitas un número de teléfono para registrarte.' },
              { q: '¿La instalación del GPS es invasiva?', a: 'No. El equipo GPS Teltonika se instala de forma discreta dentro del vehículo. No modifica la estética ni el funcionamiento. La instalación toma aproximadamente 30 minutos.' },
              { q: '¿Quién recibe mis alertas de emergencia?', a: 'Los administradores del sistema y cualquier voluntario o conductor registrado que se encuentre dentro del radio de 2 km de tu ubicación. Entre más personas estén registradas, más rápida la respuesta.' },
              { q: '¿Funciona en todo el país?', a: 'Sí, siempre que haya señal de telefonía móvil. En zonas urbanas y carreteras principales la cobertura es excelente. El GPS del vehículo utiliza red celular para transmitir datos.' },
              { q: '¿Puedo monitorear más de un vehículo?', a: 'Sí. SilentEye soporta flotas completas. Cada vehículo aparece de forma independiente en el mapa con su propia información de ubicación, velocidad e historial.' },
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
                Tu seguridad no puede esperar
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                Protege tu vehículo con GPS industrial o activa el
                botón de pánico ciudadano. Empieza hoy, es gratis.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Crear cuenta
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
      <footer className="border-t border-zinc-100 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold tracking-tight">SilentEye</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-zinc-400">
            <a href="#problema" className="hover:text-zinc-900 transition-colors">Problema</a>
            <a href="#producto" className="hover:text-zinc-900 transition-colors">Producto</a>
            <a href="#equipo" className="hover:text-zinc-900 transition-colors">Equipo GPS</a>
            <a href="#comparativa" className="hover:text-zinc-900 transition-colors">Comparativa</a>
            <a href="#casos" className="hover:text-zinc-900 transition-colors">Casos</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-zinc-900 transition-colors">Acceder</Link>
          </div>
          <p className="text-[12px] text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
