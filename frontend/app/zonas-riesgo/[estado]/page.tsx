import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  stateRisk,
  getStateBySlug,
  getRiskBand,
  getRiskBandColor,
  getRiskBandLabel,
  getNationalRank,
} from '@/lib/risk-zones';
import JsonLd, { getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';

interface Props {
  params: { estado: string };
}

export function generateStaticParams() {
  return stateRisk.map((s) => ({ estado: s.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const s = getStateBySlug(params.estado);
  if (!s) return { title: 'Estado no encontrado' };
  const band = getRiskBand(s.risk_score);
  const bandLabel = getRiskBandLabel(band).toLowerCase();
  const rank = getNationalRank(s.code);
  const title = `GPS y rastreo vehicular en ${s.name} — Zona de ${bandLabel} (#${rank} en México) | SilentEye`;
  const description = `${s.name} tiene un índice de riesgo SESNSP de ${s.risk_score}/100 (puesto ${rank} de 32). Rastreo GPS para autos, motos, camionetas, trailers y flotillas con alerta a red ciudadana en menos de 3 segundos. Cobertura en ${s.principalCities.slice(0, 3).join(', ')}.`;
  return {
    title,
    description,
    alternates: { canonical: `https://silenteye.mx/zonas-riesgo/${s.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `https://silenteye.mx/zonas-riesgo/${s.slug}`,
    },
  };
}

function buildStateNarrative(s: ReturnType<typeof getStateBySlug>) {
  if (!s) return null;
  const band = getRiskBand(s.risk_score);
  const rank = getNationalRank(s.code);
  const isHighRisk = band === 'alto';
  const isMidRisk = band === 'medio';

  const intro = isHighRisk
    ? `${s.name} está entre los estados con mayor riesgo de robo vehicular en México. Con un índice SESNSP de ${s.risk_score} sobre 100 y el puesto ${rank} a nivel nacional, operar aquí sin un sistema de rastreo en tiempo real es una apuesta cara. Las rutas comerciales que cruzan ${s.highways[0]} y los traslados entre ${s.principalCities.slice(0, 2).join(' y ')} concentran la mayoría de los incidentes reportados.`
    : isMidRisk
      ? `${s.name} tiene un nivel de riesgo medio según los datos SESNSP, con un índice de ${s.risk_score}/100 y el puesto ${rank} de 32 estados. No es de los puntos críticos del país, pero la actividad económica en ${s.principalCities.slice(0, 2).join(' y ')} y el tránsito por ${s.highways[0]} hacen que el rastreo vehicular siga siendo una inversión razonable, especialmente para flotas y vehículos comerciales.`
      : `${s.name} es uno de los estados con menor riesgo de robo vehicular en México (${s.risk_score}/100, puesto ${rank} de 32). Aun así, el rastreo GPS sigue siendo útil para administración de flotas, control de conductores, geocercas y respuesta rápida ante cualquier eventualidad — especialmente en zonas urbanas como ${s.principalCities[0]}.`;

  const recommendation = isHighRisk
    ? `Para vehículos particulares en ${s.name} recomendamos un GPS Cobán TK103 o Sinotrack ST-901 (~$400-500 MXN una vez) conectado al plan Personal de SilentEye ($99 MXN/mes). Para trailers y camiones de carga, lo apropiado es un Teltonika FMC130 con botón de pánico físico (DIN1) y plan Flotillas ($79 MXN/mes/vehículo). En esta zona el botón de pánico físico hace una diferencia real: una alerta puede llegar en menos de 3 segundos a la red ciudadana en radio de 2 km.`
    : isMidRisk
      ? `En ${s.name} cualquier GPS compatible (Cobán, Sinotrack, Queclink, Concox, Teltonika) funciona bien con SilentEye. El plan Personal ($99 MXN/mes) cubre autos, motos y camionetas particulares; el plan Flotillas ($79 MXN/mes/vehículo, mínimo 4) cubre operaciones comerciales con conductores asignados, alertas de velocidad y reportes PDF.`
      : `En ${s.name} la prioridad probablemente no sea recuperación de robo, sino operación: ver dónde están tus vehículos en vivo, configurar geocercas (zona de trabajo, casa, ruta), recibir alertas si salen de horario o si alguien acelera de más. SilentEye Personal ($99 MXN/mes) o Flotillas ($79 MXN/mes/vehículo) cubren todo eso desde el navegador, sin app, sin contrato.`;

  return { intro, recommendation, band, rank };
}

export default function EstadoPage({ params }: Props) {
  const s = getStateBySlug(params.estado);
  if (!s) notFound();

  const narrative = buildStateNarrative(s);
  if (!narrative) notFound();
  const { intro, recommendation, band, rank } = narrative;
  const colors = getRiskBandColor(band);

  // Related states (same band, different state)
  const related = stateRisk
    .filter((other) => other.slug !== s.slug && getRiskBand(other.risk_score) === band)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 4);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `GPS y rastreo vehicular en ${s.name}`,
    description: `Riesgo de robo vehicular y rastreo GPS en ${s.name}, México.`,
    inLanguage: 'es-MX',
    author: { '@type': 'Organization', name: 'SilentEye', url: 'https://silenteye.mx' },
    publisher: {
      '@type': 'Organization',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
      logo: { '@type': 'ImageObject', url: 'https://silenteye.mx/icon-512.png' },
    },
    mainEntityOfPage: `https://silenteye.mx/zonas-riesgo/${s.slug}`,
    spatialCoverage: {
      '@type': 'AdministrativeArea',
      name: s.name,
      containedInPlace: { '@type': 'Country', name: 'México' },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Zonas de riesgo', url: 'https://silenteye.mx/zonas-riesgo' },
        { name: s.name, url: `https://silenteye.mx/zonas-riesgo/${s.slug}` },
      ])} />
      <JsonLd data={getWebPageJsonLd({
        name: `GPS y rastreo vehicular en ${s.name}`,
        description: `Riesgo SESNSP ${s.risk_score}/100 — ${s.name}`,
        url: `https://silenteye.mx/zonas-riesgo/${s.slug}`,
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
            <Link href="/zonas-riesgo" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              ← Todos los estados
            </Link>
            <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 pt-12 pb-8 md:pt-20 md:pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-[13px] text-zinc-400 mb-4">
            <Link href="/zonas-riesgo" className="hover:text-zinc-700 transition-colors">Zonas de riesgo</Link>
            <span className="mx-2">/</span>
            <span>{s.name}</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4 ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {getRiskBandLabel(band)} — Puesto #{rank} de 32
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-6">
            GPS y rastreo vehicular en {s.name}
          </h1>
          <p className="text-zinc-600 text-lg leading-relaxed">{intro}</p>
        </div>
      </header>

      {/* Risk score visualization */}
      <section className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-zinc-900 text-white rounded-2xl p-8 md:p-10 grid md:grid-cols-3 gap-8 items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Índice de riesgo</p>
              <div className="flex items-end gap-2">
                <span className="text-6xl md:text-7xl font-extrabold">{s.risk_score}</span>
                <span className="text-zinc-500 text-lg pb-2">/ 100</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                <div className={`h-full ${colors.dot} rounded-full`} style={{ width: `${s.risk_score}%` }} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Posición nacional</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold">#{rank}</span>
                <span className="text-zinc-500 text-base">de 32</span>
              </div>
              <p className="text-[12px] text-zinc-500 mt-2">A mayor número, menor riesgo</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Banda</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {getRiskBandLabel(band)}
              </span>
              <p className="text-[12px] text-zinc-500 mt-3 leading-relaxed">
                {band === 'alto' && 'Alto: GPS y red de respuesta son esenciales.'}
                {band === 'medio' && 'Medio: GPS recomendado para flotas y autos comerciales.'}
                {band === 'bajo' && 'Bajo: GPS útil para administración y prevención.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cities + highways */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Ciudades principales</p>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-4">Cobertura en {s.name}</h2>
            <ul className="space-y-2">
              {s.principalCities.map((c) => (
                <li key={c} className="flex items-center gap-2 text-[14px] text-zinc-700">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Carreteras críticas</p>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-4">Rutas a vigilar</h2>
            <ul className="space-y-2">
              {s.highways.map((h) => (
                <li key={h} className="flex items-start gap-2 text-[14px] text-zinc-700">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18m-9-9v18"/></svg>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Recommendation */}
      <section className="px-6 py-16 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-3xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Recomendación</p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6">
            ¿Qué GPS y plan elegir si operas en {s.name}?
          </h2>
          <p className="text-zinc-600 text-[15px] leading-relaxed mb-8">{recommendation}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/precios" className="block bg-white rounded-xl p-6 border-2 border-blue-500 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Recomendado</span>
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 mb-1">Plan Personal</h3>
              <p className="text-zinc-500 text-[14px] mb-3">$99 MXN/mes/vehículo</p>
              <p className="text-[13px] text-zinc-600 leading-relaxed">Para autos, motos y camionetas particulares en {s.name}. Hasta 3 vehículos.</p>
            </Link>
            <Link href="/precios" className="block bg-white rounded-xl p-6 border-2 border-zinc-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Para empresas</span>
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 mb-1">Plan Flotillas</h3>
              <p className="text-zinc-500 text-[14px] mb-3">$79 MXN/mes/vehículo (4+)</p>
              <p className="text-[13px] text-zinc-600 leading-relaxed">Trailers, camiones y flotas con conductores asignados.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-zinc-900 text-white rounded-2xl px-8 py-12 md:px-14 md:py-14 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-xl">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
                Calcula cuánto te ahorras vs Hunter o LoJack en {s.name}
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                Indica cuántos vehículos tienes y lo que pagas hoy. Te decimos el ahorro mensual, anual y a 3 años.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/comparar/calculadora" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors">
                  Calcular mi ahorro
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
                <Link href="/comparar" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-white/10 rounded-lg hover:bg-white/15 transition-colors">
                  Ver comparativas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related states */}
      {related.length > 0 && (
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Otros estados con {getRiskBandLabel(band).toLowerCase()}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {related.map((o) => (
                <Link
                  key={o.slug}
                  href={`/zonas-riesgo/${o.slug}`}
                  className="border border-zinc-200 rounded-lg px-4 py-3 hover:border-blue-500 transition-colors"
                >
                  <span className="text-[13px] font-semibold text-zinc-900 block">{o.name}</span>
                  <span className="text-[11px] text-zinc-400 font-mono">Score {o.risk_score}/100</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
            <Link href="/zonas-riesgo" className="hover:text-zinc-600">Estados</Link>
            <Link href="/comparar" className="hover:text-zinc-600">Comparar</Link>
            <Link href="/precios" className="hover:text-zinc-600">Precios</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
