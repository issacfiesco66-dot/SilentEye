import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { competitors, getCompetitorBySlug } from '@/lib/competitors';
import JsonLd, { getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return competitors.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const cmp = getCompetitorBySlug(params.slug);
  if (!cmp) return { title: 'Comparativa no encontrada' };
  return {
    title: cmp.title,
    description: cmp.description,
    alternates: { canonical: `https://silenteye.mx/comparar/${cmp.slug}` },
    openGraph: {
      type: 'article',
      title: cmp.title,
      description: cmp.description,
      url: `https://silenteye.mx/comparar/${cmp.slug}`,
    },
  };
}

const winnerStyles: Record<'silenteye' | 'competitor' | 'tie', string> = {
  silenteye: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  competitor: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200',
  tie: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const winnerLabel: Record<'silenteye' | 'competitor' | 'tie', string> = {
  silenteye: 'SilentEye',
  competitor: 'Competidor',
  tie: 'Empate',
};

function getFaqJsonLd(cmp: ReturnType<typeof getCompetitorBySlug>) {
  if (!cmp) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cmp.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function getComparisonJsonLd(cmp: ReturnType<typeof getCompetitorBySlug>) {
  if (!cmp) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: cmp.title,
    description: cmp.description,
    inLanguage: 'es-MX',
    author: {
      '@type': 'Organization',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
      logo: { '@type': 'ImageObject', url: 'https://silenteye.mx/icon-512.png' },
    },
    mainEntityOfPage: `https://silenteye.mx/comparar/${cmp.slug}`,
    about: [
      { '@type': 'SoftwareApplication', name: 'SilentEye' },
      { '@type': 'Organization', name: cmp.competitorBrand },
    ],
  };
}

export default function CompararSlugPage({ params }: Props) {
  const cmp = getCompetitorBySlug(params.slug);
  if (!cmp) notFound();

  const faqJsonLd = getFaqJsonLd(cmp);
  const articleJsonLd = getComparisonJsonLd(cmp);

  return (
    <div className="min-h-screen bg-white">
      {articleJsonLd && <JsonLd data={articleJsonLd} />}
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Comparar', url: 'https://silenteye.mx/comparar' },
        { name: `vs ${cmp.competitor}`, url: `https://silenteye.mx/comparar/${cmp.slug}` },
      ])} />
      <JsonLd data={getWebPageJsonLd({
        name: cmp.title,
        description: cmp.description,
        url: `https://silenteye.mx/comparar/${cmp.slug}`,
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
            <Link href="/comparar" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              ← Todas las comparativas
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
            <Link href="/comparar" className="hover:text-zinc-700 transition-colors">Comparar</Link>
            <span className="mx-2">/</span>
            <span>vs {cmp.competitor}</span>
          </div>
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Comparativa honesta</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-6">
            SilentEye vs {cmp.competitor}
          </h1>
          <p className="text-zinc-600 text-lg leading-relaxed max-w-3xl">{cmp.intro}</p>
        </div>
      </header>

      {/* Versus banner */}
      <section className="px-6 py-8 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">Esta plataforma</div>
            <div className="text-2xl font-extrabold text-zinc-900">SilentEye</div>
            <div className="text-[13px] text-zinc-500">$99 MXN/mes · Sin contrato</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 text-white font-extrabold text-sm">VS</div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Comparado con</div>
            <div className="text-2xl font-extrabold text-zinc-900">{cmp.competitor}</div>
            <div className="text-[13px] text-zinc-500">{cmp.competitorBrand}</div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">Tabla comparativa lado a lado</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="py-4 px-4 text-zinc-500 font-semibold text-[12px] uppercase tracking-wider">Característica</th>
                  <th className="py-4 px-4 text-blue-700 font-semibold text-[12px] uppercase tracking-wider">SilentEye</th>
                  <th className="py-4 px-4 text-zinc-700 font-semibold text-[12px] uppercase tracking-wider">{cmp.competitor}</th>
                  <th className="py-4 px-4 text-zinc-500 font-semibold text-[12px] uppercase tracking-wider">Ganador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cmp.comparisonTable.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50">
                    <td className="py-4 px-4 font-semibold text-zinc-900">{row.feature}</td>
                    <td className="py-4 px-4 text-zinc-700">{row.silenteye}</td>
                    <td className="py-4 px-4 text-zinc-700">{row.competitor}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${winnerStyles[row.winner]}`}>
                        {winnerLabel[row.winner]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Advantages SilentEye */}
      <section className="px-6 py-16 md:py-20 bg-blue-50/30 border-y border-blue-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Ventajas de SilentEye</p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-10">
            Lo que SilentEye hace mejor que {cmp.competitor}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {cmp.silenteyeAdvantages.map((adv, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 mb-1">{adv.title}</h3>
                    <p className="text-[14px] text-zinc-600 leading-relaxed">{adv.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest competitor strengths */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-[13px] font-semibold text-zinc-500 tracking-wide uppercase mb-3">Honestidad ante todo</p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
            Donde {cmp.competitor} puede ser mejor opción
          </h2>
          <p className="text-zinc-500 mb-10 max-w-2xl">
            No vamos a fingir que somos perfectos para todos. {cmp.competitor} tiene fortalezas reales y aquí las reconocemos:
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {cmp.competitorStrengths.map((s, i) => (
              <div key={i} className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
                <h3 className="font-bold text-zinc-900 mb-2">{s.title}</h3>
                <p className="text-[14px] text-zinc-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="px-6 py-16 md:py-20 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-10">¿Cuál te conviene?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-8 border-2 border-blue-500">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-blue-700">Elige SilentEye si...</span>
              </div>
              <ul className="space-y-3">
                {cmp.verdict.chooseSilenteye.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-zinc-700">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/precios" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
                Ver precios SilentEye
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
            <div className="bg-white rounded-2xl p-8 border-2 border-zinc-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-700">Elige {cmp.competitor} si...</span>
              </div>
              <ul className="space-y-3">
                {cmp.verdict.chooseCompetitor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-zinc-700">
                    <svg className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-8">Preguntas frecuentes</h2>
          <div className="divide-y divide-zinc-200">
            {cmp.faqs.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between py-5 cursor-pointer text-[15px] font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                  {item.q}
                  <svg className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-45 flex-shrink-0 ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </summary>
                <p className="pb-5 text-[14px] text-zinc-600 leading-relaxed -mt-1">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-zinc-900 text-white rounded-2xl px-8 py-14 md:px-14 md:py-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-xl">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
                Pruébalo sin contrato. Cancela cuando quieras.
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                Si SilentEye no es para ti, no perdiste nada. El SOS ciudadano es gratis para siempre, y los planes son mes a mes sin penalización.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/precios" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors">
                  Ver precios
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
                <Link href="/comparar" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-white/10 rounded-lg hover:bg-white/15 transition-colors">
                  Otras comparativas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other comparisons */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Otras comparativas</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {competitors.filter((o) => o.slug !== cmp.slug).map((o) => (
              <Link
                key={o.slug}
                href={`/comparar/${o.slug}`}
                className="flex items-center justify-between border border-zinc-200 rounded-lg px-5 py-4 hover:border-blue-500 transition-colors"
              >
                <span className="text-[14px] font-semibold text-zinc-900">SilentEye vs {o.competitor}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            ))}
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
            <Link href="/privacidad" className="hover:text-zinc-600">Privacidad</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
