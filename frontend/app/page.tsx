/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 */

import Link from 'next/link';
import AuthRedirect from '@/components/AuthRedirect';
import SecretAdminTrigger from '@/components/SecretAdminTrigger';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden selection:bg-blue-600/10">
      <AuthRedirect />

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
            <a href="#producto" className="hover:text-zinc-900 transition-colors">Plataforma</a>
            <a href="#recuperacion" className="hover:text-zinc-900 transition-colors">Recuperación</a>
            <a href="#dispositivos" className="hover:text-zinc-900 transition-colors">GPS compatibles</a>
            <a href="#comparativa" className="hover:text-zinc-900 transition-colors">Comparativa</a>
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
              Plataforma inteligente de seguridad vehicular
            </p>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-zinc-900 mb-6">
              Tu GPS ya rastrea.{' '}
              <span className="relative inline-block">
                Nosotros lo hacemos reaccionar.
                <span className="absolute -bottom-1 left-0 w-full h-3 bg-blue-600/10 -skew-x-6 rounded-sm" />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-500 leading-relaxed max-w-xl mb-10">
              Conecta el GPS que ya tienes y convierte un simple rastreador en un sistema
              de respuesta inmediata. Detección, alerta y coordinación — todo automático, en menos de 3 segundos.
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
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Plataforma</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">La inteligencia no está en el GPS. Está en lo que hacemos con él.</h2>
            <p className="text-zinc-500 leading-relaxed">Conecta cualquier GPS compatible y SilentEye le agrega detección de emergencias, distribución de alertas y coordinación de respuesta — todo automático.</p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {/* GPS — large */}
            <div className="md:col-span-3 group relative bg-zinc-50 border border-zinc-200 rounded-xl p-8 overflow-hidden hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">GPS</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Conecta tu GPS. Nosotros hacemos el resto.</h3>
              <p className="text-zinc-500 text-[15px] leading-relaxed mb-6 max-w-md">
                Trae el GPS que ya tienes instalado. SilentEye lo convierte en un sistema inteligente:
                detecta emergencias, distribuye alertas y coordina la respuesta — todo automático.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium text-zinc-400">
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Detección de robo automática</span>
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Alerta a red cercana en 3s</span>
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Coordinación de recuperación</span>
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> Reportes y testigos digitales</span>
                <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg> 5 marcas GPS compatibles</span>
              </div>
            </div>

            {/* SOS — tall */}
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
                  { n: '01', t: 'Conecta tu GPS', d: '¿Ya tienes un GPS instalado? Apúntalo a SilentEye. Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack. Sin cambiar de equipo.',
                    svg: <svg className="w-full h-24 mt-3" viewBox="0 0 320 80" fill="none"><rect x="10" y="15" width="60" height="50" rx="8" fill="#f4f4f5" stroke="#3b82f6" strokeWidth="1.5"/><text x="40" y="38" textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold" fontFamily="monospace">GPS</text><text x="40" y="50" textAnchor="middle" fill="#a1a1aa" fontSize="6" fontFamily="monospace">Tu equipo</text><path d="M75 40 h40" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,3"><animate attributeName="stroke-dashoffset" values="7;0" dur="1s" repeatCount="indefinite"/></path><rect x="120" y="10" width="80" height="60" rx="10" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2"/><text x="160" y="35" textAnchor="middle" fill="#1d4ed8" fontSize="9" fontWeight="bold">SilentEye</text><text x="160" y="48" textAnchor="middle" fill="#3b82f6" fontSize="7">Plataforma</text><circle cx="160" cy="60" r="3" fill="#3b82f6"><animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/></circle><path d="M205 40 h40" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4,3"><animate attributeName="stroke-dashoffset" values="7;0" dur="1s" repeatCount="indefinite"/></path><rect x="250" y="20" width="60" height="40" rx="8" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5"/><text x="280" y="38" textAnchor="middle" fill="#059669" fontSize="7" fontWeight="bold">Protegido</text><text x="280" y="49" textAnchor="middle" fill="#059669" fontSize="6">En vivo</text></svg> },
                  { n: '02', t: 'La plataforma monitorea', d: 'SilentEye analiza cada señal GPS en tiempo real: detecta movimiento no autorizado, corte de corriente, exceso de velocidad y botón de pánico.',
                    svg: <svg className="w-full h-24 mt-3" viewBox="0 0 320 80" fill="none"><rect x="20" y="8" width="280" height="64" rx="10" fill="#f8fafc" stroke="#e4e4e7" strokeWidth="1"/><rect x="30" y="16" width="120" height="48" rx="6" fill="#18181b"><rect x="36" y="22" width="108" height="36" rx="4" fill="#27272a"/><circle cx="60" cy="40" r="4" fill="#3b82f6"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="60" cy="40" r="8" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4"><animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite"/></circle><circle cx="100" cy="35" r="3" fill="#22c55e"/><circle cx="120" cy="45" r="3" fill="#22c55e"/><path d="M60,40 Q80,30 100,35 T120,45" stroke="#3b82f6" strokeWidth="1" fill="none" strokeDasharray="3,2"/></rect><rect x="170" y="20" width="120" height="12" rx="3" fill="#dbeafe"/><text x="230" y="29" textAnchor="middle" fill="#1d4ed8" fontSize="7" fontWeight="bold">Velocidad: 45 km/h</text><rect x="170" y="36" width="120" height="12" rx="3" fill="#dcfce7"/><text x="230" y="45" textAnchor="middle" fill="#059669" fontSize="7" fontWeight="bold">Ignición: Encendido</text><rect x="170" y="52" width="120" height="12" rx="3" fill="#fef3c7"/><text x="230" y="61" textAnchor="middle" fill="#d97706" fontSize="7" fontWeight="bold">DIN1: Normal</text></svg> },
                  { n: '03', t: 'Respuesta automática', d: 'Ante emergencia, SilentEye distribuye la alerta con ubicación en vivo a toda la red cercana. Sin central, sin llamada, sin espera.',
                    svg: <svg className="w-full h-24 mt-3" viewBox="0 0 320 80" fill="none"><circle cx="50" cy="40" r="18" fill="#fef2f2" stroke="#ef4444" strokeWidth="2"><animate attributeName="r" values="18;22;18" dur="1.5s" repeatCount="indefinite"/></circle><text x="50" y="38" textAnchor="middle" fill="#dc2626" fontSize="8" fontWeight="bold">SOS</text><text x="50" y="47" textAnchor="middle" fill="#ef4444" fontSize="5">Pánico</text><path d="M72 30 L120 18" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2"><animate attributeName="stroke-dashoffset" values="5;0" dur="0.8s" repeatCount="indefinite"/></path><path d="M72 40 L120 40" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2"><animate attributeName="stroke-dashoffset" values="5;0" dur="0.8s" repeatCount="indefinite"/></path><path d="M72 50 L120 62" stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2"><animate attributeName="stroke-dashoffset" values="5;0" dur="0.8s" repeatCount="indefinite"/></path><rect x="125" y="6" width="65" height="24" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1"/><text x="157" y="16" textAnchor="middle" fill="#1d4ed8" fontSize="6" fontWeight="bold">Admin</text><text x="157" y="25" textAnchor="middle" fill="#3b82f6" fontSize="5">Notificado</text><rect x="125" y="32" width="65" height="24" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1"/><text x="157" y="42" textAnchor="middle" fill="#059669" fontSize="6" fontWeight="bold">Helpers</text><text x="157" y="51" textAnchor="middle" fill="#22c55e" fontSize="5">En camino</text><rect x="125" y="56" width="65" height="24" rx="6" fill="#fefce8" stroke="#eab308" strokeWidth="1"/><text x="157" y="66" textAnchor="middle" fill="#a16207" fontSize="6" fontWeight="bold">Conductores</text><text x="157" y="75" textAnchor="middle" fill="#eab308" fontSize="5">Alertados</text><path d="M195 18 L230 30" stroke="#3b82f6" strokeWidth="1"/><path d="M195 44 L230 38" stroke="#22c55e" strokeWidth="1"/><path d="M195 68 L230 46" stroke="#eab308" strokeWidth="1"/><rect x="235" y="20" width="75" height="40" rx="8" fill="#18181b"><text x="272" y="38" textAnchor="middle" fill="#22c55e" fontSize="7" fontWeight="bold">Ubicación</text><text x="272" y="48" textAnchor="middle" fill="#4ade80" fontSize="6">en vivo</text><circle cx="272" cy="55" r="2" fill="#4ade80"><animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle></rect></svg> },
                ].map((s) => (
                  <div key={s.n}>
                    <div className="flex gap-5">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-extrabold font-mono">{s.n}</div>
                      <div>
                        <h4 className="font-bold text-zinc-900 mb-1">{s.t}</h4>
                        <p className="text-[15px] text-zinc-500 leading-relaxed">{s.d}</p>
                      </div>
                    </div>
                    <div className="ml-[60px] mt-1">{s.svg}</div>
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
                  { n: '01', t: 'Regístrate', d: 'Abre SilentEye en tu celular. Ingresa tu correo electrónico y verifica con el código que recibes. Sin apps, sin descargas.',
                    svg: <svg className="w-full h-20 mt-3" viewBox="0 0 320 64" fill="none"><rect x="120" y="2" width="80" height="60" rx="12" fill="#18181b" stroke="#3f3f46" strokeWidth="1"/><rect x="128" y="10" width="64" height="44" rx="4" fill="#27272a"/><text x="160" y="28" textAnchor="middle" fill="#f4f4f5" fontSize="7" fontWeight="bold">SilentEye</text><rect x="138" y="34" width="44" height="14" rx="3" fill="#dc2626"/><text x="160" y="44" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">SOS</text></svg> },
                  { n: '02', t: 'Presiona SOS', d: 'Un botón rojo, grande y claro. Un toque envía tu ubicación GPS como alerta de emergencia inmediata a toda la red.',
                    svg: <svg className="w-full h-20 mt-3" viewBox="0 0 320 64" fill="none"><circle cx="160" cy="32" r="28" fill="#fef2f2" stroke="#ef4444" strokeWidth="2"/><circle cx="160" cy="32" r="20" fill="#dc2626"><animate attributeName="r" values="20;22;20" dur="1s" repeatCount="indefinite"/></circle><text x="160" y="36" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">SOS</text><circle cx="160" cy="32" r="28" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4"><animate attributeName="r" values="28;38;28" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite"/></circle></svg> },
                  { n: '03', t: 'Ayuda en camino', d: 'Administradores y voluntarios cercanos reciben la alerta con tu ubicación en tiempo real. Coordinación inmediata.',
                    svg: <svg className="w-full h-20 mt-3" viewBox="0 0 320 64" fill="none"><circle cx="60" cy="32" r="6" fill="#ef4444"><animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/></circle><text x="60" y="50" textAnchor="middle" fill="#ef4444" fontSize="6">Tú</text><circle cx="140" cy="18" r="5" fill="#3b82f6"/><text x="140" y="30" textAnchor="middle" fill="#3b82f6" fontSize="5">Admin</text><circle cx="180" cy="45" r="5" fill="#22c55e"/><text x="180" y="57" textAnchor="middle" fill="#22c55e" fontSize="5">Helper</text><circle cx="240" cy="25" r="5" fill="#22c55e"/><text x="240" y="37" textAnchor="middle" fill="#22c55e" fontSize="5">Helper</text><circle cx="280" cy="42" r="5" fill="#eab308"/><text x="280" y="54" textAnchor="middle" fill="#a16207" fontSize="5">Conductor</text><path d="M66 32 L135 18" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2"/><path d="M66 32 L175 45" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2"/><path d="M66 32 L235 25" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2"/><path d="M66 32 L275 42" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2"/><circle cx="60" cy="32" r="30" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4,2" opacity="0.3"/><text x="60" y="10" textAnchor="middle" fill="#a1a1aa" fontSize="5">2 km</text></svg> },
                ].map((s) => (
                  <div key={s.n}>
                    <div className="flex gap-5">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-extrabold font-mono">{s.n}</div>
                      <div>
                        <h4 className="font-bold text-zinc-900 mb-1">{s.t}</h4>
                        <p className="text-[15px] text-zinc-500 leading-relaxed">{s.d}</p>
                      </div>
                    </div>
                    <div className="ml-[60px] mt-1">{s.svg}</div>
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
                Robo de carga en carretera: el conductor está solo, sin cobertura y a merced de los asaltantes. Con GPS profesional (Teltonika, Queclink, Concox, Cobán o Sinotrack), la alerta llega a la base y a todos los vehículos cercanos de la flotilla. Coordinación antes de que el trailer desaparezca.
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

      {/* ── Proceso de Recuperación Vehicular ── */}
      <section id="recuperacion" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Recuperación vehicular</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Así recuperamos tu vehículo</h2>
            <p className="text-zinc-500 leading-relaxed">El GPS detecta. La plataforma reacciona. La red responde. Todo automático, sin centrales ni llamadas. Este es el proceso completo.</p>
          </div>

          {/* 5-step recovery process */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { step: '01', bg: 'bg-red-50 border-red-200', accent: 'text-red-600 bg-red-100', title: 'Emergencia detectada', desc: 'El conductor presiona el botón de pánico en el GPS o desde su celular. La señal se envía al instante.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> },
              { step: '02', bg: 'bg-blue-50 border-blue-200', accent: 'text-blue-600 bg-blue-100', title: 'Plataforma analiza', desc: 'SilentEye identifica el tipo de emergencia, valida la ubicación y prepara la distribución en menos de 1 segundo.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg> },
              { step: '03', bg: 'bg-amber-50 border-amber-200', accent: 'text-amber-600 bg-amber-100', title: 'Alerta distribuida', desc: 'En menos de 3 segundos, admins, helpers y conductores cercanos (2 km) reciben la alerta con ubicación en vivo.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { step: '04', bg: 'bg-emerald-50 border-emerald-200', accent: 'text-emerald-600 bg-emerald-100', title: 'Coordinación en vivo', desc: 'La red de apoyo ve la ubicación del vehículo en tiempo real sobre el mapa. Helpers confirman que van en camino.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8Z"/><circle cx="12" cy="10" r="3"/></svg> },
              { step: '05', bg: 'bg-violet-50 border-violet-200', accent: 'text-violet-600 bg-violet-100', title: 'Recuperación y reporte', desc: 'Incidente documentado con testigos digitales, responders y reporte PDF automático para seguimiento legal.',
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg> },
            ].map((s) => (
              <div key={s.step} className={`rounded-xl border-2 ${s.bg} p-6`}>
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${s.accent} mb-4 font-extrabold text-sm font-mono`}>{s.step}</div>
                <div className="flex justify-center mb-4">{s.icon}</div>
                <h3 className="font-extrabold text-zinc-900 text-[15px] mb-1">{s.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* SVG animated flow line */}
          <div className="hidden md:block mt-8">
            <svg className="w-full h-14" viewBox="0 0 1000 44" fill="none" aria-label="Flujo de recuperación">
              <line x1="50" y1="22" x2="950" y2="22" stroke="#e4e4e7" strokeWidth="2"/>
              <line x1="50" y1="22" x2="950" y2="22" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8,4">
                <animate attributeName="stroke-dashoffset" values="12;0" dur="1s" repeatCount="indefinite"/>
              </line>
              <circle cx="100" cy="22" r="14" fill="#fef2f2" stroke="#ef4444" strokeWidth="2"/><text x="100" y="26" textAnchor="middle" fill="#dc2626" fontSize="10" fontWeight="bold">1</text>
              <circle cx="300" cy="22" r="14" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2"/><text x="300" y="26" textAnchor="middle" fill="#2563eb" fontSize="10" fontWeight="bold">2</text>
              <circle cx="500" cy="22" r="14" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2"/><text x="500" y="26" textAnchor="middle" fill="#d97706" fontSize="10" fontWeight="bold">3</text>
              <circle cx="700" cy="22" r="14" fill="#ecfdf5" stroke="#10b981" strokeWidth="2"/><text x="700" y="26" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="bold">4</text>
              <circle cx="900" cy="22" r="14" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="2"/><text x="900" y="26" textAnchor="middle" fill="#7c3aed" fontSize="10" fontWeight="bold">5</text>
            </svg>
          </div>

          <div className="mt-8 bg-zinc-900 text-white rounded-xl px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
            </div>
            <div>
              <p className="font-bold text-[15px] mb-1">Todo ocurre sin llamar a una central</p>
              <p className="text-zinc-400 text-[14px] leading-relaxed">La plataforma es el cerebro. El GPS es solo el sensor. Tú ya tienes el sensor — nosotros le damos la inteligencia para protegerte.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dispositivos GPS compatibles ── */}
      <section id="dispositivos" className="px-6 py-24 md:py-32 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Compatibilidad</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">GPS multi-marca: 5 fabricantes, un solo panel</h2>
            <p className="text-zinc-500 leading-relaxed">No importa qué GPS tengas. Si es de estas marcas, lo conectas a SilentEye y funciona. Sin adaptadores, sin configuración extra.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                brand: 'Teltonika',
                origin: 'Lituania',
                models: 'FMB920, FMC920, FMC130',
                protocol: 'Codec 8 / 8E',
                color: 'border-blue-200 bg-white',
                badge: 'bg-blue-50 text-blue-700',
                desc: 'Grado industrial. Ideales para flotillas, trailers y vehículos comerciales. Botón de pánico físico DIN1.',
                ideal: 'Flotillas y uso profesional',
                difficulty: 'Media',
              },
              {
                brand: 'Queclink',
                origin: 'China',
                models: 'GL300, GV300, GV58CEU',
                protocol: 'Texto +RESP / +BUFF',
                color: 'border-emerald-200 bg-white',
                badge: 'bg-emerald-50 text-emerald-700',
                desc: 'Versátiles y compactos. Buena relación calidad-precio. Protocolo texto fácil de depurar.',
                ideal: 'Flotas medianas y particulares',
                difficulty: 'Media',
              },
              {
                brand: 'Concox',
                origin: 'China',
                models: 'GT06N, WeTrack2, GV20, JM-VL',
                protocol: 'GT06 binario',
                color: 'border-violet-200 bg-white',
                badge: 'bg-violet-50 text-violet-700',
                desc: 'Protocolo GT06 ampliamente adoptado. Alarmas SOS, corte de corriente, vibración y geocercas.',
                ideal: 'Uso general y profesional',
                difficulty: 'Media',
              },
              {
                brand: 'Cobán',
                origin: 'China',
                models: 'TK103, TK303, GPS103',
                protocol: 'GT06 binario',
                color: 'border-amber-200 bg-white',
                badge: 'bg-amber-50 text-amber-700',
                desc: 'Marca muy popular en México. Los instaladores ya la conocen. Fácil de conseguir y económica.',
                ideal: 'Particulares y adopción rápida',
                difficulty: 'Baja',
              },
              {
                brand: 'Sinotrack',
                origin: 'China',
                models: 'ST-901, ST-906',
                protocol: 'GT06 binario',
                color: 'border-rose-200 bg-white',
                badge: 'bg-rose-50 text-rose-700',
                desc: 'Ultra compactos y económicos. Ideales para motos, autos pequeños y rastreo personal.',
                ideal: 'Motos y vehículos pequeños',
                difficulty: 'Baja',
              },
            ].map((d, i) => (
              <div key={i} className={`rounded-xl border-2 ${d.color} p-6 hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-extrabold text-zinc-900">{d.brand}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${d.badge}`}>{d.origin}</span>
                </div>
                <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">{d.desc}</p>
                <div className="space-y-2.5 text-[12px]">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-zinc-400 w-16 flex-shrink-0">Modelos</span>
                    <span className="text-zinc-700 font-medium">{d.models}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-zinc-400 w-16 flex-shrink-0">Protocolo</span>
                    <span className="text-zinc-600 font-mono text-[11px]">{d.protocol}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-zinc-400 w-16 flex-shrink-0">Ideal</span>
                    <span className="text-zinc-600">{d.ideal}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-zinc-400 w-16 flex-shrink-0">Dificultad</span>
                    <span className={`font-semibold ${d.difficulty === 'Baja' ? 'text-emerald-600' : 'text-amber-600'}`}>{d.difficulty}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* "Ya tienes GPS?" card */}
            <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-700 mb-2">¿Ya tienes un GPS?</h3>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">Si tu dispositivo es de alguna de estas marcas, solo necesitas apuntar el servidor a SilentEye. Sin cambiar de equipo.</p>
              <Link href="/login" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
                Conectar mi GPS
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>

          {/* Architecture note */}
          <div className="mt-10 bg-zinc-900 text-white rounded-xl px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
            </div>
            <div>
              <p className="font-bold text-[15px] mb-1">Arquitectura Gateway GPS unificada</p>
              <p className="text-zinc-400 text-[14px] leading-relaxed">Todos los protocolos se normalizan automáticamente en un formato estándar. Sin importar la marca, los datos llegan al mismo pipeline: mapa en vivo, alertas, notificaciones push y coordinación de emergencia.</p>
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
              { q: '¿Necesito comprar un GPS nuevo?', a: 'No necesariamente. Si ya tienes un GPS Teltonika, Queclink, Concox, Cobán o Sinotrack, solo necesitas apuntar el servidor a SilentEye. La plataforma es compatible con estos equipos sin necesidad de cambiar de hardware.' },
              { q: '¿Qué marcas de GPS son compatibles?', a: 'SilentEye es multi-marca: Teltonika (FMB/FMC series), Queclink (GL300, GV300, GV58CEU), Concox (GT06N, WeTrack2, GV20, JM-VL), Cobán (TK103, TK303, GPS103) y Sinotrack (ST-901, ST-906). Si tu GPS es de alguna de estas marcas, se conecta directamente.' },
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
          <SecretAdminTrigger>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <span className="text-sm font-bold tracking-tight">SilentEye</span>
            </div>
          </SecretAdminTrigger>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-zinc-400">
            <a href="#problema" className="hover:text-zinc-900 transition-colors">Problema</a>
            <a href="#producto" className="hover:text-zinc-900 transition-colors">Plataforma</a>
            <a href="#recuperacion" className="hover:text-zinc-900 transition-colors">Recuperación</a>
            <a href="#dispositivos" className="hover:text-zinc-900 transition-colors">GPS compatibles</a>
            <a href="#comparativa" className="hover:text-zinc-900 transition-colors">Comparativa</a>
            <a href="#faq" className="hover:text-zinc-900 transition-colors">FAQ</a>
            <Link href="/login" className="hover:text-zinc-900 transition-colors">Acceder</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacidad" className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors">Privacidad</Link>
            <Link href="/cookies" className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors">Cookies</Link>
            <Link href="/terminos" className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors">Términos</Link>
            <span className="text-[12px] text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
