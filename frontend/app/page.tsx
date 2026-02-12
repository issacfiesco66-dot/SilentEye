import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-blue-600/[0.08] blur-[150px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full bg-red-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(71,85,105,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(71,85,105,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-800/40 bg-slate-950/70 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SilentEye</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="#beneficios" className="hidden md:inline text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Beneficios
            </a>
            <a href="#como-funciona" className="hidden md:inline text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Cómo funciona
            </a>
            <a href="#faq" className="hidden md:inline text-slate-400 hover:text-white text-sm font-medium transition-colors">
              FAQ
            </a>
            <Link
              href="/sos"
              className="relative px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-500 transition-all shadow-lg shadow-red-600/25 hover:shadow-red-500/40"
            >
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400" />
              SOS
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:border-slate-600 transition-all"
            >
              Acceder
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-semibold tracking-[0.15em] uppercase text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Seguridad inteligente en tiempo real
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[0.95]">
            <span className="block text-white">Protección</span>
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              cuando más importa
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Monitoreo vehicular GPS en tiempo real y botón de pánico ciudadano.
            Alertas instantáneas, red de apoyo cercana y respuesta inmediata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              Comenzar ahora
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/sos"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-semibold text-red-300 border-2 border-red-500/40 rounded-xl hover:border-red-500/70 hover:text-white hover:bg-red-600/10 transition-all"
            >
              <span className="w-3 h-3 rounded-full bg-red-500 group-hover:animate-ping" />
              Emergencia SOS
            </Link>
          </div>
        </div>
      </header>

      {/* Two-mode showcase */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* GPS Card */}
            <div className="group relative p-8 md:p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgb(96,165,250)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                    <path d="M12 2a10 10 0 0 1 10 10" opacity="0.4" />
                    <path d="M12 2a10 10 0 0 0-10 10" opacity="0.4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Rastreo GPS vehicular</h3>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Monitoreo 24/7 de tu vehículo con GPS Teltonika. Ubicación en tiempo real, historial de rutas y alertas automáticas ante movimientos sospechosos.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Tiempo real', 'Geocercas', 'Historial', 'Alertas'].map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs font-medium text-blue-300 bg-blue-500/10 rounded-full border border-blue-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* SOS Card */}
            <div className="group relative p-8 md:p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-red-500/30 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgb(248,113,113)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Botón de pánico SOS</h3>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Cualquier persona puede enviar una alerta de emergencia desde su celular. Tu ubicación se comparte al instante con la red de apoyo más cercana.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Sin instalar app', 'Geolocalización', 'Red de apoyo', 'Gratis'].map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs font-medium text-red-300 bg-red-500/10 rounded-full border border-red-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative px-6 py-16 border-y border-slate-800/40 bg-slate-900/20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '24/7', label: 'Monitoreo continuo', color: 'text-blue-400' },
              { value: '<3s', label: 'Tiempo de alerta', color: 'text-emerald-400' },
              { value: '2km', label: 'Radio de notificación', color: 'text-amber-400' },
              { value: '100%', label: 'Desde el navegador', color: 'text-cyan-400' },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className={`text-3xl md:text-4xl font-extrabold ${stat.color} mb-1 group-hover:scale-105 transition-transform`}>
                  {stat.value}
                </div>
                <div className="text-slate-500 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="relative px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-400 tracking-wider uppercase">Beneficios</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
              ¿Por qué SilentEye?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Protección real para tu vehículo y tu seguridad personal.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🛰️', title: 'GPS en tiempo real', desc: 'Ubicación exacta de tu vehículo actualizada cada segundo. Mapa interactivo con historial de rutas.' },
              { icon: '🚨', title: 'Alerta instantánea', desc: 'Botón de pánico físico en el vehículo o desde tu celular. Las personas cercanas son notificadas al instante.' },
              { icon: '👥', title: 'Red de apoyo', desc: 'Conductores y voluntarios cercanos reciben tu alerta y pueden acudir a ayudarte en minutos.' },
              { icon: '📱', title: 'Sin instalar apps', desc: 'Funciona directo desde el navegador de tu celular. Regístrate con tu teléfono y listo.' },
              { icon: '🔒', title: 'Datos protegidos', desc: 'Tu ubicación solo se comparte durante emergencias. Autenticación segura con código OTP.' },
              { icon: '⚡', title: 'Respuesta rápida', desc: 'Desde que presionas el botón hasta que llega la ayuda. Cada segundo cuenta y SilentEye lo sabe.' },
            ].map((item, i) => (
              <div
                key={i}
                className="group p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-5 text-2xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="relative px-6 py-24 md:py-32 border-t border-slate-800/40 bg-slate-900/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-emerald-400 tracking-wider uppercase">Cómo funciona</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
              Simple y efectivo
            </h2>
            <p className="text-slate-400 text-lg">
              Dos formas de protección. Un solo sistema.
            </p>
          </div>

          {/* GPS flow */}
          <div className="mb-16">
            <h3 className="text-sm font-bold text-blue-400 tracking-wider uppercase mb-8 text-center">Protección vehicular GPS</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Instalación', desc: 'Un técnico instala el GPS de forma discreta en tu vehículo. Rápido y sin complicaciones.' },
                { step: '02', title: 'Monitorea', desc: 'Accede al panel desde tu celular. Ve la ubicación de tu auto en el mapa en tiempo real.' },
                { step: '03', title: 'Protege', desc: 'Ante emergencia, el botón de pánico del vehículo alerta a la red de apoyo con tu ubicación.' },
              ].map((item, i) => (
                <div key={i} className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="text-5xl font-black text-blue-500/10 absolute top-4 right-5">{item.step}</div>
                  <div className="relative">
                    <h4 className="font-semibold text-white text-lg mb-2">{item.title}</h4>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SOS flow */}
          <div>
            <h3 className="text-sm font-bold text-red-400 tracking-wider uppercase mb-8 text-center">Emergencia ciudadana SOS</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Regístrate', desc: 'Entra desde tu celular, ingresa tu teléfono y recibe un código de verificación.' },
                { step: '02', title: 'Presiona SOS', desc: 'Un gran botón rojo. Un toque y tu ubicación exacta se envía como alerta de emergencia.' },
                { step: '03', title: 'Ayuda en camino', desc: 'Personas cercanas y administradores reciben tu alerta al instante con tu ubicación.' },
              ].map((item, i) => (
                <div key={i} className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="text-5xl font-black text-red-500/10 absolute top-4 right-5">{item.step}</div>
                  <div className="relative">
                    <h4 className="font-semibold text-white text-lg mb-2">{item.title}</h4>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-amber-400 tracking-wider uppercase">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mt-3">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="space-y-4">
            {[
              { q: '¿Necesito instalar una app?', a: 'No. SilentEye funciona directo desde el navegador de tu celular. Solo necesitas registrarte con tu número de teléfono.' },
              { q: '¿El botón SOS es gratuito?', a: 'Sí. Cualquier persona puede registrarse y usar el botón de emergencia SOS sin costo.' },
              { q: '¿La instalación GPS es invasiva?', a: 'No. El equipo se instala de forma discreta y no afecta el funcionamiento ni la estética de tu vehículo.' },
              { q: '¿Quién recibe mi alerta de emergencia?', a: 'Los administradores del sistema y cualquier conductor o voluntario registrado que esté cerca de tu ubicación.' },
              { q: '¿Funciona en todo el país?', a: 'Sí. La cobertura depende de la red móvil. En áreas urbanas y la mayoría de carreteras tendrás conexión.' },
              { q: '¿Puedo monitorear más de un vehículo?', a: 'Sí. SilentEye soporta flotas completas con ubicación independiente para cada vehículo.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-24 md:py-32 border-t border-slate-800/40">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-10 md:p-16 rounded-3xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(59,130,246,0.12),transparent)]" />
            <div className="relative text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Tu seguridad no puede esperar
              </h2>
              <p className="text-slate-400 mb-10 max-w-xl mx-auto">
                Protege tu vehículo con GPS o activa el botón de emergencia ciudadano. Empieza ahora.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/25"
                >
                  Iniciar sesión →
                </Link>
                <Link
                  href="/sos"
                  className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold text-red-300 border-2 border-red-500/30 rounded-xl hover:bg-red-600/10 hover:border-red-500/50 transition-all"
                >
                  Emergencia SOS
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-12 border-t border-slate-800/40">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold text-white">SilentEye</span>
                <p className="text-slate-500 text-xs">Seguridad inteligente</p>
              </div>
            </div>
            <div className="flex gap-6">
              <a href="#beneficios" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Beneficios</a>
              <a href="#como-funciona" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Cómo funciona</a>
              <a href="#faq" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">FAQ</a>
              <Link href="/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Acceder</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800/40 text-center text-slate-600 text-xs">
            SilentEye © {new Date().getFullYear()} — Todos los derechos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}
