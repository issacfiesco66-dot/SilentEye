import type { Metadata } from 'next';
import Link from 'next/link';
import { competitors } from '@/lib/competitors';
import JsonLd, { getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'SilentEye vs competidores: Comparativas de rastreo GPS | SilentEye',
  description:
    'Compara SilentEye con Hunter, LoJack, Skyguard y otras plataformas de rastreo GPS en México. Precios, features, contratos y red de respuesta — comparativa honesta lado a lado.',
  alternates: { canonical: 'https://silenteye.mx/comparar' },
  openGraph: {
    type: 'website',
    title: 'SilentEye vs competidores — Comparativa de rastreo GPS',
    description:
      'Comparativa honesta de SilentEye vs Hunter, LoJack y Skyguard. Precios, features y veredicto por caso de uso.',
    url: 'https://silenteye.mx/comparar',
  },
};

export default function CompararIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Comparar', url: 'https://silenteye.mx/comparar' },
      ])} />
      <JsonLd data={getWebPageJsonLd({
        name: 'Comparativas SilentEye vs competidores',
        description: 'Comparativas honestas de SilentEye vs Hunter, LoJack y Skyguard.',
        url: 'https://silenteye.mx/comparar',
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
            <Link href="/precios" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              Precios
            </Link>
            <Link href="/blog" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              Blog
            </Link>
            <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-4">Comparativas</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            SilentEye vs el resto del mercado
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
            Comparamos honestamente SilentEye contra los principales servicios de rastreo GPS en México. Mostramos lo bueno, lo malo y para quién es cada opción.
          </p>
        </div>
      </header>

      {/* Calculator highlight card */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/comparar/calculadora"
            className="group block bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-10 text-white hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/20 text-white mb-3">
                  Herramienta interactiva
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                  ¿Cuánto te ahorras cambiando a SilentEye?
                </h2>
                <p className="text-blue-100 text-[15px] leading-relaxed max-w-xl">
                  Calculadora de ahorro real vs Hunter, LoJack o Skyguard. Indica cuántos vehículos tienes y lo que pagas hoy — te decimos el ahorro mensual, anual y a 3 años.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-blue-700 bg-white rounded-lg group-hover:scale-105 transition-transform flex-shrink-0">
                Calcular ahorro
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Cards */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {competitors.map((c) => (
            <Link
              key={c.slug}
              href={`/comparar/${c.slug}`}
              className="group border-2 border-zinc-200 rounded-2xl p-8 hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700">
                  Comparativa
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900 mb-2 group-hover:text-blue-600 transition-colors">
                SilentEye vs {c.competitor}
              </h2>
              <p className="text-[14px] text-zinc-500 leading-relaxed mb-6">
                {c.description.replace(/SilentEye y |SilentEye |Skyguard vs SilentEye: |/g, (m) => m).slice(0, 140)}…
              </p>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600">
                Ver comparativa
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 mb-4">
            ¿Listo para probar SilentEye sin contrato?
          </h2>
          <p className="text-zinc-500 mb-8">
            $99 MXN/mes por vehículo. Personal o flotilla. Cancela cuando quieras. El SOS ciudadano es gratis para siempre.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/precios" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Ver precios
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link href="/sos" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
              Probar SOS gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold">SilentEye</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-zinc-400">
            <Link href="/precios" className="hover:text-zinc-600">Precios</Link>
            <Link href="/blog" className="hover:text-zinc-600">Blog</Link>
            <Link href="/privacidad" className="hover:text-zinc-600">Privacidad</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
