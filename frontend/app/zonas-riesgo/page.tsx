import type { Metadata } from 'next';
import Link from 'next/link';
import { stateRisk, getRiskBand, getRiskBandColor, getRiskBandLabel } from '@/lib/risk-zones';
import JsonLd, { getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';
import RiskMapClient from '@/components/RiskMapClient';

export const metadata: Metadata = {
  title: 'Zonas de riesgo de robo vehicular en México por estado | SilentEye',
  description:
    'Mapa de riesgo de robo de auto, trailer y carga por estado en México. Ranking nacional con datos SESNSP, ciudades principales, carreteras críticas y plataforma GPS de rastreo en tiempo real.',
  alternates: { canonical: 'https://silenteye.mx/zonas-riesgo' },
  openGraph: {
    type: 'website',
    title: 'Zonas de riesgo vehicular por estado en México',
    description: 'Ranking de riesgo de robo vehicular por estado, basado en datos SESNSP. Cobertura GPS de SilentEye con red de respuesta ciudadana.',
    url: 'https://silenteye.mx/zonas-riesgo',
  },
};

export default function ZonasRiesgoIndexPage() {
  const sorted = [...stateRisk].sort((a, b) => b.risk_score - a.risk_score);
  const top = sorted.slice(0, 6);

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Zonas de riesgo', url: 'https://silenteye.mx/zonas-riesgo' },
      ])} />
      <JsonLd data={getWebPageJsonLd({
        name: 'Zonas de riesgo de robo vehicular en México',
        description: 'Ranking nacional de riesgo de robo de vehículos por estado.',
        url: 'https://silenteye.mx/zonas-riesgo',
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
            <Link href="/comparar" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Comparar</Link>
            <Link href="/precios" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Precios</Link>
            <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">Comenzar gratis</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 pt-12 pb-10 md:pt-20 md:pb-14">
        <div className="max-w-4xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Zonas de riesgo SESNSP</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            Ranking de riesgo vehicular por estado en México
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl leading-relaxed">
            Riesgo de robo de auto, trailer y carga por estado, basado en datos del Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública. Si tu vehículo opera en alguno de estos estados, SilentEye te avisa en menos de 3 segundos en cuanto algo se sale de lo normal.
          </p>
        </div>
      </header>

      {/* Interactive map */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-1">Mapa interactivo</p>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900">Visualización por estado</h2>
            </div>
            <p className="text-[13px] text-zinc-500 sm:text-right max-w-sm">
              Pasa el cursor para ver el detalle, click para ir a la página del estado.
            </p>
          </div>
          <RiskMapClient />
        </div>
      </section>

      {/* Top 6 */}
      <section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Estados con mayor riesgo</h2>
          <p className="text-zinc-500 text-[14px] mb-8">Los 6 estados con índice de riesgo más alto. Si operas aquí, GPS no es opcional.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {top.map((s, i) => {
              const band = getRiskBand(s.risk_score);
              const colors = getRiskBandColor(band);
              return (
                <Link
                  key={s.code}
                  href={`/zonas-riesgo/${s.slug}`}
                  className="group block bg-white rounded-2xl border-2 border-zinc-200 hover:border-red-400 hover:shadow-lg p-6 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-zinc-400">#{i + 1} en México</span>
                      <h3 className="text-xl font-extrabold text-zinc-900 group-hover:text-red-600 transition-colors mt-1">{s.name}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {getRiskBandLabel(band)}
                    </span>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-extrabold text-zinc-900">{s.risk_score}</span>
                      <span className="text-zinc-400 text-sm pb-1.5">/ 100</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${colors.dot} rounded-full`} style={{ width: `${s.risk_score}%` }} />
                    </div>
                  </div>
                  <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-2">
                    {s.principalCities.slice(0, 3).join(', ')}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full table */}
      <section className="px-6 py-16 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Todos los estados (32)</h2>
          <p className="text-zinc-500 text-[14px] mb-8">Ordenados por índice de riesgo. Click para ver el detalle del estado.</p>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4 text-zinc-500 font-semibold text-[12px] uppercase tracking-wider">#</th>
                  <th className="py-3 px-4 text-zinc-500 font-semibold text-[12px] uppercase tracking-wider">Estado</th>
                  <th className="py-3 px-4 text-zinc-500 font-semibold text-[12px] uppercase tracking-wider">Score</th>
                  <th className="py-3 px-4 text-zinc-500 font-semibold text-[12px] uppercase tracking-wider hidden md:table-cell">Banda</th>
                  <th className="py-3 px-4 text-zinc-500 font-semibold text-[12px] uppercase tracking-wider hidden lg:table-cell">Ciudades principales</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sorted.map((s, i) => {
                  const band = getRiskBand(s.risk_score);
                  const colors = getRiskBandColor(band);
                  return (
                    <tr key={s.code} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-4 font-mono text-zinc-400">{i + 1}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-900">{s.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">{s.risk_score}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {band}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-zinc-500 text-[13px]">
                        {s.principalCities.slice(0, 3).join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/zonas-riesgo/${s.slug}`} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700">
                          Ver detalle →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-zinc-400 mt-4 leading-relaxed">
            Datos basados en SESNSP CNSP/38/15 — categoría &ldquo;Robo de vehículo automotor con violencia + Robo de tractores&rdquo;. Score directo 0-100; corte 2026-03-31.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-zinc-900 text-white rounded-2xl px-8 py-14 md:px-14 md:py-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-xl">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
                Riesgo alto no significa miedo. Significa preparación.
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                SilentEye combina rastreo GPS en tiempo real con una red de respuesta ciudadana en radio de 2 km. Cuando algo se sale de lo normal — desvío, paro sospechoso, botón de pánico — la alerta llega a quien puede ayudar en menos de 3 segundos.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/precios" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors">
                  Ver precios desde $99/mes
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
                <Link href="/comparar" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-white/10 rounded-lg hover:bg-white/15 transition-colors">
                  Comparar vs Hunter, LoJack, Skyguard
                </Link>
              </div>
            </div>
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
            <Link href="/comparar" className="hover:text-zinc-600">Comparar</Link>
            <Link href="/precios" className="hover:text-zinc-600">Precios</Link>
            <Link href="/blog" className="hover:text-zinc-600">Blog</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
