import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd, { getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Precios — Plataforma de Rastreo GPS | SilentEye',
  description:
    'Conoce los precios de SilentEye. Botón de emergencia SOS gratuito. Planes de rastreo GPS desde $99 MXN/mes por vehículo. Sin contratos, sin permanencia. GPS para autos, motos, camiones, trailers y flotillas.',
  alternates: { canonical: 'https://silenteye.mx/precios' },
  openGraph: {
    type: 'website',
    title: 'Precios de Rastreo GPS — SilentEye',
    description: 'Planes de rastreo GPS vehicular desde $99 MXN/mes. Botón SOS gratuito. Sin contratos.',
    url: 'https://silenteye.mx/precios',
  },
};

export default function PreciosPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Precios', url: 'https://silenteye.mx/precios' },
      ])} />
      <JsonLd data={getWebPageJsonLd({
        name: 'Precios — Plataforma GPS SilentEye',
        description: 'Planes y precios de rastreo GPS vehicular. Botón de emergencia SOS gratuito.',
        url: 'https://silenteye.mx/precios',
      })} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              ← Inicio
            </Link>
            <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-4">Precios</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Protege tu vehículo desde $99/mes
          </h1>
          <p className="text-lg text-zinc-500 max-w-xl mx-auto">
            Sin contratos. Sin permanencia. Cancela cuando quieras. El botón de emergencia SOS es y siempre será gratuito.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-6 py-12 md:py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {/* SOS Gratuito */}
          <div className="border-2 border-zinc-200 rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="text-lg font-bold text-zinc-900">SOS Ciudadano</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-zinc-900">Gratis</span>
              <span className="text-zinc-400 text-sm ml-1">para siempre</span>
            </div>
            <p className="text-[14px] text-zinc-500 mb-6">
              Botón de emergencia para cualquier persona. Sin GPS, sin app, sin costo.
            </p>
            <ul className="space-y-3 text-[14px] text-zinc-600 mb-8">
              {[
                'Botón de pánico desde el navegador',
                'Alerta a personas cercanas (2 km)',
                'Ubicación GPS en tiempo real',
                'Sin registro de tarjeta',
                'Sin app que instalar',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/sos" className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Activar SOS gratis
            </Link>
          </div>

          {/* Personal */}
          <div className="border-2 border-blue-500 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full">
              Popular
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 className="text-lg font-bold text-zinc-900">Personal</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-zinc-900">$99</span>
              <span className="text-zinc-400 text-sm ml-1">MXN/mes por vehículo</span>
            </div>
            <p className="text-[14px] text-zinc-500 mb-6">
              Rastreo GPS completo para 1-3 vehículos. Ideal para autos, motos y camionetas.
            </p>
            <ul className="space-y-3 text-[14px] text-zinc-600 mb-8">
              {[
                'Rastreo GPS en tiempo real 24/7',
                'Alertas de robo automáticas (<3s)',
                'Botón de pánico GPS + navegador',
                'Geocercas ilimitadas',
                'Historial de recorridos (30 días)',
                'Notificaciones push',
                'Alerta a red cercana (2 km)',
                'Compatible con 5 marcas GPS',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Comenzar ahora
            </Link>
          </div>

          {/* Flotillas */}
          <div className="border-2 border-zinc-200 rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-zinc-900">Flotillas</h2>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-zinc-900">$79</span>
              <span className="text-zinc-400 text-sm ml-1">MXN/mes por vehículo</span>
            </div>
            <p className="text-[14px] text-zinc-500 mb-6">
              Para empresas con 4+ vehículos. Trailers, camiones, autos y motos.
            </p>
            <ul className="space-y-3 text-[14px] text-zinc-600 mb-8">
              {[
                'Todo lo del plan Personal',
                'Panel multi-vehículo unificado',
                'Asignación de conductores',
                'Alertas de velocidad por vehículo',
                'Historial de recorridos (90 días)',
                'Reportes PDF de incidentes',
                'Coordinación de recuperación',
                'Soporte prioritario',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-zinc-900 border-2 border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
              Cotizar flotilla
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison banner */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-extrabold text-zinc-900 mb-1">
                ¿Comparando con Hunter, LoJack o Skyguard?
              </h3>
              <p className="text-[14px] text-zinc-600 leading-relaxed">
                Vemos lado a lado precio, contrato, hardware, app y red de respuesta. Comparativa honesta con lo bueno y lo malo de cada uno.
              </p>
            </div>
            <Link
              href="/comparar"
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver comparativas
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ precios */}
      <section className="px-6 py-16 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-8">Preguntas sobre precios</h2>
          <div className="divide-y divide-zinc-200">
            {[
              { q: '¿Necesito comprar un GPS aparte?', a: 'Sí, el GPS es un dispositivo físico que se instala en tu vehículo. Puedes comprar un GPS Cobán TK103 desde $400 MXN o un Sinotrack ST-901 desde $350 MXN. Si ya tienes un GPS compatible, solo lo apuntas a SilentEye.' },
              { q: '¿Hay costo de instalación?', a: 'SilentEye es solo la plataforma de software. La instalación del GPS depende de tu instalador local. Muchos GPS como el Sinotrack ST-901 son tan sencillos que puedes instalarlos tú mismo.' },
              { q: '¿Qué incluye el chip SIM?', a: 'Tu GPS necesita un chip SIM con datos móviles (cualquier operador). El costo es de $50-150 MXN/mes dependiendo del operador. Este costo es adicional al plan de SilentEye.' },
              { q: '¿Hay contrato o permanencia?', a: 'No. Puedes cancelar en cualquier momento. Sin penalizaciones, sin letras chicas.' },
              { q: '¿Ofrecen descuento por volumen?', a: 'Sí. El plan Flotillas ya tiene precio reducido ($79 vs $99/vehículo). Para más de 20 vehículos, contáctanos para una cotización especial.' },
              { q: '¿El botón SOS siempre será gratis?', a: 'Sí. El botón de emergencia ciudadano SOS es y será gratuito para siempre. No necesitas GPS ni plan de pago para usarlo.' },
            ].map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between py-4 cursor-pointer text-[15px] font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                  {item.q}
                  <svg className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-45 flex-shrink-0 ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </summary>
                <p className="pb-4 text-[14px] text-zinc-500 leading-relaxed -mt-1">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 mb-4">
            Empieza a proteger tu vehículo hoy
          </h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            Conecta tu GPS, crea tu cuenta y tu vehículo estará protegido en minutos. Sin apps, sin contratos.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Crear cuenta gratis
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link href="/sos" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
              Probar SOS gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="border-t border-zinc-100 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold">SilentEye</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-zinc-400">
            <Link href="/privacidad" className="hover:text-zinc-600">Privacidad</Link>
            <Link href="/terminos" className="hover:text-zinc-600">Términos</Link>
            <Link href="/blog" className="hover:text-zinc-600">Blog</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
