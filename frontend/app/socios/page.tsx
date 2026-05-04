import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd, { getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';
import SociosForm from './SociosForm';

export const metadata: Metadata = {
  title: 'Programa para cámaras y asociaciones de transporte | SilentEye',
  description:
    'SilentEye se asocia con CANACAR, AMOTAC, ANTP y cámaras estatales para llevar rastreo GPS con red de respuesta ciudadana a sus socios. Tarifa preferente, pilot gratuito 30 días con 5 unidades, reportes agregados.',
  alternates: { canonical: 'https://silenteye.mx/socios' },
  openGraph: {
    type: 'website',
    title: 'Programa de socios SilentEye — Cámaras de transporte',
    description:
      'Pilot gratuito 30 días + tarifa preferente para socios de cámaras y asociaciones de transporte en México.',
    url: 'https://silenteye.mx/socios',
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: '¿Tiene costo para la cámara?',
    a: 'No. El programa de socios es gratuito para la cámara o asociación. Los socios que decidan adoptar SilentEye pagan su plan mensual directo a nosotros con la tarifa preferente acordada. La cámara puede recibir comisión si así se acuerda en el convenio (modelo opcional, sin obligación).',
  },
  {
    q: '¿Cómo funciona el pilot gratuito de 30 días?',
    a: 'Identificamos junto con la cámara entre 5 y 10 socios voluntarios. Les damos acceso completo a la plataforma sin costo durante 30 días. Si el GPS ya lo tienen, lo apuntan a SilentEye en minutos; si no, se compra una sola vez (~$400 MXN) — ese costo lo asume el socio porque el hardware queda en su unidad. Al final del pilot presentamos resultados a la mesa directiva.',
  },
  {
    q: '¿Qué tarifa preferente reciben los socios?',
    a: 'Sobre el plan Flotillas público de $79 MXN/mes/vehículo, ofrecemos descuentos por volumen agregado a nivel de cámara. Entre más socios participan, mejor el precio para todos. El detalle se acuerda en el convenio y se mantiene mientras la cámara siga activa con nosotros.',
  },
  {
    q: '¿Pueden integrar con nuestra plataforma de socios o CRM?',
    a: 'Sí, contamos con API para integraciones básicas (alta de usuarios, sincronización de unidades). Para integraciones más complejas con sistemas internos lo evaluamos caso por caso en la fase de convenio.',
  },
  {
    q: '¿Quién instala los GPS?',
    a: 'SilentEye no instala hardware. El socio puede usar un instalador local de su confianza o auto-instalar dispositivos sencillos como Sinotrack ST-901 o Cobán TK103. Si la cámara prefiere, recomendamos instaladores en su región. Costo típico: $300-500 MXN una sola vez por unidad.',
  },
  {
    q: '¿Qué pasa si un socio quiere cancelar?',
    a: 'Sin penalización. SilentEye es mes a mes; cualquier socio puede cancelar cuando quiera y conserva su GPS para usar con otra plataforma compatible si así lo decide.',
  },
  {
    q: '¿Compartimos datos con autoridades automáticamente?',
    a: 'No. Cada socio decide a quién dar acceso a su flota. Lo que sí hacemos es facilitar al socio la generación de reportes PDF formales que pueden compartir con autoridades, aseguradoras o comités internos cuando lo necesiten.',
  },
];

const partnerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Programa de socios SilentEye para cámaras de transporte',
  description:
    'Programa de partnership con cámaras de transporte y asociaciones empresariales en México. Tarifa preferente, pilot gratuito de 30 días, reportes agregados y capacitación a socios.',
  provider: { '@type': 'Organization', name: 'SilentEye', url: 'https://silenteye.mx' },
  areaServed: { '@type': 'Country', name: 'México' },
  audience: {
    '@type': 'Audience',
    audienceType: 'Cámaras de transporte y asociaciones empresariales',
  },
  url: 'https://silenteye.mx/socios',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function SociosPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={partnerJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Socios', url: 'https://silenteye.mx/socios' },
      ])} />
      <JsonLd data={getWebPageJsonLd({
        name: 'Programa de socios SilentEye',
        description: 'Programa para cámaras y asociaciones de transporte.',
        url: 'https://silenteye.mx/socios',
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
            <Link href="/precios" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Precios</Link>
            <Link href="/comparar" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Comparar</Link>
            <a href="#solicitar-pilot" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Solicitar pilot
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative px-6 pt-16 pb-12 md:pt-24 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,white_60%,#f8fafc)]" />
        <div className="relative max-w-4xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-4">
            Programa para cámaras y asociaciones
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight text-zinc-900 mb-6">
            Sus socios protegen patrimonio. Nosotros lo respaldamos con tecnología.
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 leading-relaxed mb-8 max-w-2xl">
            SilentEye se asocia con cámaras de transporte (CANACAR, AMOTAC, ANTP) y cámaras de comercio estatales para llevar rastreo GPS con red de respuesta ciudadana a sus socios — con tarifa preferente, pilot gratuito y reportes agregados para la cámara.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#solicitar-pilot" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Solicitar pilot gratuito
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <a href="#programa" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-700 bg-white border-2 border-zinc-200 rounded-lg hover:border-zinc-400 transition-colors">
              Ver detalles del programa
            </a>
          </div>
        </div>
      </header>

      {/* Quick stats strip */}
      <section className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { val: '30 días', label: 'Pilot sin costo' },
            { val: '0%', label: 'Costo para la cámara' },
            { val: '$0', label: 'Penalización por cancelar' },
            { val: '<3s', label: 'Tiempo de alerta' },
          ].map((m, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight font-mono">{m.val}</div>
              <div className="text-sm text-zinc-400 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What chamber gets vs what members get */}
      <section id="programa" className="px-6 py-20 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-14">
            <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">El programa</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Beneficios para todos los lados de la mesa
            </h2>
            <p className="text-zinc-500 leading-relaxed">
              Diseñamos el programa para que la cámara cumpla con su misión (cuidar a los socios) sin asumir costos, riesgos ni operación.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-blue-700">Para la cámara</span>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 mb-5">Lo que recibe la asociación</h3>
              <ul className="space-y-3 text-[14px] text-zinc-700">
                {[
                  'Reportes mensuales agregados de actividad de socios',
                  'Visibilidad de incidentes y patrones de robo en su jurisdicción',
                  'Capacitación gratuita a socios sobre uso de la plataforma',
                  'Co-marketing en eventos y comunicaciones de la cámara',
                  'Modelo de comisión opcional sobre lo facturado',
                  'Convenio formal con cláusulas claras y revisables',
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-700">Para los socios</span>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 mb-5">Lo que recibe cada transportista</h3>
              <ul className="space-y-3 text-[14px] text-zinc-700">
                {[
                  'Tarifa preferente sobre el plan Flotillas público',
                  'Pilot gratuito de 30 días con hasta 5 unidades por socio voluntario',
                  'Compatible con cualquier GPS que ya tengan instalado',
                  'Sin contrato ni permanencia (mes a mes)',
                  'Red de respuesta ciudadana en radio de 2 km',
                  'Reportes PDF formales para autoridades y aseguradoras',
                  'Onboarding y soporte prioritario',
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="px-6 py-20 md:py-24 bg-zinc-900 text-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-400 tracking-wide uppercase mb-3">El problema</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
            Sus socios pierden patrimonio en estados que ya están mapeados
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-3xl">
            Según datos del Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública, el robo de carga en México se concentra en estados con índices de riesgo medibles. Estado de México, Jalisco, Guanajuato y Puebla acumulan la mayor incidencia. Sin un sistema que avise en segundos —no en minutos—, la unidad ya cambió de placas o desapareció antes de que el call center llame.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              { num: '14,000+', label: 'Robos de carga al año (ANERPV)' },
              { num: '8 min', label: 'Tiempo promedio de respuesta tradicional' },
              { num: '<3 seg', label: 'Tiempo de respuesta SilentEye' },
            ].map((s, i) => (
              <div key={i} className="bg-zinc-800 rounded-xl p-6">
                <div className="text-3xl font-extrabold text-white font-mono mb-1">{s.num}</div>
                <div className="text-[13px] text-zinc-400 leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>

          <Link href="/zonas-riesgo" className="inline-flex items-center gap-2 text-[14px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            Ver mapa de riesgo por estado
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* How the pilot works */}
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-5xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Pilot gratuito</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Cómo funciona el pilot de 30 días
          </h2>
          <p className="text-zinc-500 leading-relaxed mb-12 max-w-2xl">
            Validamos juntos antes de cualquier compromiso económico. Si al final del pilot los socios no ven valor, cerramos sin pena.
          </p>

          <div className="space-y-4">
            {[
              {
                week: 'Semana 1',
                title: 'Kick-off con la cámara',
                desc: 'Reunión con la mesa directiva, identificamos 5-10 socios voluntarios, definimos métricas de éxito y firmamos convenio simple.',
              },
              {
                week: 'Semana 2',
                title: 'Onboarding de socios',
                desc: 'Capacitación virtual de 30 minutos a los socios voluntarios. Si no tienen GPS, recomendamos instaladores; si ya tienen uno compatible, lo conectan en minutos.',
              },
              {
                week: 'Semana 2-4',
                title: 'Operación en vivo',
                desc: 'Los socios usan la plataforma con todas las funciones. Damos soporte directo y monitoreamos calidad. La cámara recibe reporte semanal del estado del pilot.',
              },
              {
                week: 'Semana 4',
                title: 'Resultados a la mesa directiva',
                desc: 'Presentación con los datos del pilot: alertas generadas, tiempos de respuesta, ahorro estimado vs alternativas. La cámara decide si formalizamos el rollout completo o cerramos.',
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center font-extrabold text-blue-600 text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 bg-white border border-zinc-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 font-mono">{step.week}</span>
                    <h3 className="font-extrabold text-zinc-900">{step.title}</h3>
                  </div>
                  <p className="text-[14px] text-zinc-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="solicitar-pilot" className="px-6 py-20 md:py-24 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-3xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Solicitar pilot</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Empecemos a platicar
          </h2>
          <p className="text-zinc-500 leading-relaxed mb-10">
            Llena los datos básicos y te abrimos un WhatsApp con el mensaje pre-llenado para coordinar la primera reunión. Si prefieres correo, escríbenos a <a href="mailto:contacto@silenteye.mx" className="text-blue-600 font-semibold hover:underline">contacto@silenteye.mx</a>.
          </p>
          <SociosForm />
        </div>
      </section>

      {/* FAQs */}
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-3xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Preguntas frecuentes</p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8">
            Lo que las cámaras suelen preguntar
          </h2>
          <div className="divide-y divide-zinc-200">
            {FAQS.map((item, i) => (
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
            <Link href="/comparar" className="hover:text-zinc-600">Comparar</Link>
            <Link href="/zonas-riesgo" className="hover:text-zinc-600">Zonas de riesgo</Link>
            <Link href="/blog" className="hover:text-zinc-600">Blog</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
