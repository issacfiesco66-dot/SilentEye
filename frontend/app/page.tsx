import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full bg-blue-500/[0.07] blur-[120px]" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.06] blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-30%,rgba(59,130,246,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(71,85,105,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(71,85,105,0.04)_1px,transparent_1px)] bg-[size:5rem_5rem]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">SilentEye</span>
          <div className="flex items-center gap-6">
            <a href="#beneficios" className="hidden sm:inline text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Beneficios
            </a>
            <a href="#como-funciona" className="hidden sm:inline text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Cómo funciona
            </a>
            <a href="#faq" className="hidden sm:inline text-slate-400 hover:text-white text-sm font-medium transition-colors">
              FAQ
            </a>
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-all"
            >
              Acceder
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-semibold tracking-[0.2em] uppercase text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Protección vehicular inteligente
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="block text-white">Tu auto,</span>
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              siempre protegido
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-6 leading-relaxed">
            Monitoreo en tiempo real, alertas al instante y una red de apoyo lista para ayudarte cuando más lo necesitas.
          </p>
          <p className="text-slate-500 text-base max-w-xl mx-auto mb-12">
            Reduce el robo hasta un 80%. Respuesta inmediata ante emergencias. Tranquilidad 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1"
            >
              Comenzar ahora
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a
              href="#beneficios"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-300 border-2 border-slate-600 rounded-xl hover:border-slate-500 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              Ver beneficios
            </a>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="relative px-6 py-16 border-y border-slate-800/50 bg-slate-900/20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="text-center group">
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2 group-hover:scale-105 transition-transform">24/7</div>
              <div className="text-slate-400 text-sm font-medium">Monitoreo continuo</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2 group-hover:scale-105 transition-transform">Seg</div>
              <div className="text-slate-400 text-sm font-medium">Ubicación en tiempo real</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl md:text-5xl font-bold text-amber-400 mb-2 group-hover:scale-105 transition-transform">1</div>
              <div className="text-slate-400 text-sm font-medium">Botón para emergencias</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl md:text-5xl font-bold text-cyan-400 mb-2 group-hover:scale-105 transition-transform">✓</div>
              <div className="text-slate-400 text-sm font-medium">Mayor recuperación</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="relative px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              ¿Por qué SilentEye?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              La solución más completa para proteger tu vehículo. Diseñada para darte tranquilidad real.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📉', title: 'Reduce el robo', desc: 'La ubicación disponible al instante. Mayor probabilidad de recuperación y efecto disuasivo contra ladrones.', color: 'emerald' },
              { icon: '🚨', title: 'Emergencia al instante', desc: 'Un botón y las autoridades o personas cercanas reciben tu ubicación exacta. Respuesta rápida.', color: 'red' },
              { icon: '💰', title: 'Ahorra en seguros', desc: 'Aseguradoras ofrecen descuentos por sistemas homologados. Protección para tu auto y tu bolsillo.', color: 'blue' },
              { icon: '😌', title: 'Tranquilidad total', desc: 'Saber dónde está tu auto en todo momento. Protección 24/7 para ti, tu familia y tu flota.', color: 'amber' },
            ].map((item, i) => (
              <div
                key={i}
                className="group p-8 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-900/50 hover:-translate-y-1"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-white mb-3 text-xl">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases + Testimonial */}
      <section className="relative px-6 py-24 md:py-32 border-t border-slate-800/50 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Para cada necesidad
              </h2>
              <p className="text-slate-400 mb-10">
                Particulares, familias o empresas. SilentEye se adapta a tu realidad.
              </p>
              <div className="space-y-6">
                {[
                  { emoji: '🚗', title: 'Auto familiar', desc: 'Protege el vehículo de la casa. Monitorea cuando los jóvenes conducen o cuando viajas con la familia.' },
                  { emoji: '🏢', title: 'Flotas empresariales', desc: 'Control de vehículos de trabajo. Ubicación en tiempo real, historial y respuesta ante incidentes.' },
                  { emoji: '🛡️', title: 'Vehículos de valor', desc: 'Autos premium o clásicos. Protección extra y alertas inmediatas ante cualquier irregularidad.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">{item.emoji}</div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700">
              <blockquote className="text-xl md:text-2xl text-slate-200 leading-relaxed mb-6">
                "Saber que mi auto está monitoreado 24/7 me da una paz increíble. En emergencias, la respuesta es inmediata."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">M</div>
                <div>
                  <div className="font-semibold text-white">Usuario SilentEye</div>
                  <div className="text-slate-500 text-sm">Protección vehicular</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="relative px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple de usar
            </h2>
            <p className="text-slate-400 text-lg">
              Tres pasos para tener tu auto protegido.
            </p>
          </div>
          <div className="space-y-0">
            {[
              { step: 1, title: 'Instalación', desc: 'Un técnico especializado instala el equipo de forma discreta en tu vehículo. Proceso rápido y sin complicaciones.' },
              { step: 2, title: 'Accede desde tu celular', desc: 'Entra al panel con tu cuenta. Visualiza la ubicación de tu auto en el mapa en tiempo real, desde cualquier lugar.' },
              { step: 3, title: 'Listo para proteger', desc: 'En caso de emergencia, activa el botón de pánico. Recibe asistencia inmediata y comparte tu ubicación con quién necesites.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-8 items-start py-8 border-b border-slate-800 last:border-0">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xl">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-xl mb-2">{item.title}</h3>
                  <p className="text-slate-400 text-lg">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative px-6 py-24 md:py-32 border-t border-slate-800/50 bg-slate-900/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {[
              { q: '¿La instalación es invasiva?', a: 'No. El equipo se instala de forma discreta y no afecta el funcionamiento ni la estética de tu vehículo.' },
              { q: '¿Funciona en todo el país?', a: 'Sí. La cobertura depende de la red móvil en la zona. En áreas urbanas y la mayoría de carreteras tendrás conexión continua.' },
              { q: '¿Qué pasa si me roban el auto?', a: 'Activa el botón de pánico si estás dentro, o accede al panel desde tu celular. La ubicación se comparte al instante con autoridades o personas de confianza.' },
              { q: '¿Puedo monitorear más de un vehículo?', a: 'Sí. SilentEye soporta flotas. Cada vehículo tiene su propia ubicación en tiempo real y alertas independientes.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
                <h3 className="font-semibold text-white mb-2 text-lg">{item.q}</h3>
                <p className="text-slate-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 md:p-20 rounded-3xl overflow-hidden border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(59,130,246,0.15),transparent)]" />
            <div className="relative text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Tu auto merece la mejor protección
              </h2>
              <p className="text-slate-400 mb-10 max-w-xl mx-auto text-lg">
                Monitoreo en tiempo real, respuesta ante emergencias y una red de apoyo lista para ayudarte.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-12 py-4 text-lg font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/30"
              >
                Iniciar sesión
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-16 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <span className="text-xl font-bold text-white">SilentEye</span>
              <p className="text-slate-500 text-sm mt-1">Protección vehicular inteligente</p>
            </div>
            <div className="flex gap-8">
              <a href="#beneficios" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Beneficios</a>
              <a href="#como-funciona" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Cómo funciona</a>
              <a href="#faq" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">FAQ</a>
              <Link href="/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Acceder</Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800/50 text-center text-slate-600 text-sm">
            SilentEye © {new Date().getFullYear()} — Todos los derechos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}
