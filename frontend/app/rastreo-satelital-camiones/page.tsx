import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd, {
  getBreadcrumbJsonLd,
  getWebPageJsonLd,
} from '@/components/JsonLd';
import RoiCalculator from '@/components/RoiCalculator';

export const metadata: Metadata = {
  title:
    'Rastreo Satelital para Camiones, Trailers y Flotas de Carga | SilentEye México',
  description:
    'Rastreo satelital y GPS para camiones, trailers, tractocamión y flotas de carga en México. Alerta a la red en 3 segundos: sin central, sin llamada. Compatible con Teltonika FMC130, Queclink GV500 y Concox GT06N. Desde $79 MXN/mes por unidad.',
  keywords: [
    'rastreo satelital para camiones',
    'rastreo satelital de vehículos',
    'rastreo satelital para camiones de carga',
    'gps para camiones',
    'gps para trailers',
    'gps para flota de camiones',
    'gps para tractocamión',
    'gps para transporte de carga',
    'monitoreo satelital de camiones',
    'seguimiento satelital de vehículos',
    'sistema de rastreo satelital para camiones',
    'cotizar gps para flotilla',
  ],
  alternates: {
    canonical: 'https://silenteye.mx/rastreo-satelital-camiones',
  },
  openGraph: {
    type: 'website',
    title: 'Rastreo Satelital para Camiones, Trailers y Flotas | SilentEye',
    description:
      'Rastreo satelital y GPS para camiones de carga: alerta en 3 segundos, sin central. Desde $79 MXN/mes por unidad. Cotiza tu flota en menos de 1 minuto.',
    url: 'https://silenteye.mx/rastreo-satelital-camiones',
    locale: 'es_MX',
  },
};

const faqItems = [
  {
    q: '¿Qué diferencia hay entre rastreo satelital y rastreo GPS?',
    a: 'Son lo mismo en la práctica. "Rastreo satelital" es como se le llama coloquialmente en México al rastreo vehicular por GPS, porque la posición se obtiene de la constelación de satélites GPS. SilentEye recibe esa posición desde tu GPS instalado en el camión y la convierte en alertas accionables.',
  },
  {
    q: '¿Necesito comprar GPS nuevos para mi flota o sirven los que ya tengo?',
    a: 'Si tus GPS son Teltonika (FMB920, FMC130), Queclink (GV500, GV300), Concox (GT06N), Cobán (TK103) o Sinotrack (ST-901), se conectan directo a SilentEye apuntando el servidor. No necesitas cambiar hardware. Si tienes otra marca, contáctanos y validamos el protocolo.',
  },
  {
    q: '¿Cuál es el GPS recomendado para un tractocamión o trailer?',
    a: 'Para camiones de carga recomendamos el Teltonika FMC130 ($2,000–3,500 MXN) por su grado industrial, conectividad LTE estable y botón de pánico físico vía DIN1. Alternativa robusta: Queclink GV500 ($1,800–3,000 MXN). Para flotas con presupuesto ajustado: Concox GT06N ($500–900 MXN).',
  },
  {
    q: '¿Cuánto cuesta el rastreo satelital de SilentEye para flotas?',
    a: 'El plan Flotillas es de $79 MXN/mes por vehículo (a partir de 4 unidades). Plan Personal $99 MXN/mes (1–3 unidades). Sin contrato, sin permanencia, cancelas cuando quieras. El chip SIM de datos lo paga el operador (~$50–150 MXN/mes adicionales).',
  },
  {
    q: '¿Cómo funciona la alerta en 3 segundos?',
    a: 'Cuando el conductor activa el botón de pánico (físico en el GPS o desde el navegador), SilentEye distribuye la alerta automáticamente a administradores y a TODOS los conductores registrados dentro de 2 km. No hay central telefónica de por medio. Mientras una central tradicional valida y llama, SilentEye ya alertó a 50 personas que pueden ver al trailer en el mapa.',
  },
  {
    q: '¿SilentEye sirve en carreteras del Estado de México, Puebla y Veracruz?',
    a: 'Sí. La plataforma funciona en toda la República Mexicana donde tu GPS tenga señal celular. Las carreteras del Triángulo Rojo (Puebla–Tlaxcala–Estado de México–Veracruz) son justamente donde más útil es el rastreo satelital, porque concentran ~60% de los robos de carga del país según ANERPV.',
  },
  {
    q: '¿Puedo configurar geocercas para zonas de carga y descarga?',
    a: 'Sí. Defines polígonos en el mapa para tus CEDIS, almacenes o puntos de carga. Recibes alerta automática cuando un camión entra o sale de la geocerca, con timestamp. Útil para detectar paradas no autorizadas y validar tiempos en patio.',
  },
  {
    q: '¿Tienen alertas de desvío de ruta y exceso de velocidad?',
    a: 'Sí. Cargas la ruta esperada y SilentEye alerta si el camión se desvía. La velocidad máxima es configurable por unidad. También hay alertas por corte de corriente del GPS, apertura de puerta (si conectas sensor) y entrada/salida de geocerca.',
  },
  {
    q: '¿Qué pasa si el ladrón apaga el GPS o le corta la corriente?',
    a: 'GPS industriales como el Teltonika FMC130 tienen batería de respaldo interna que sigue transmitiendo posición incluso sin alimentación del camión. Además, SilentEye genera una alerta automática de "corte de corriente" en el momento exacto que se desconecta — esa alerta sí llega aunque después el GPS se apague.',
  },
  {
    q: '¿Cómo cotizo para más de 50 camiones?',
    a: 'Llena el formulario en /cotizar-flota o escríbenos por WhatsApp al +52 56 1066 9353. Para flotas grandes ofrecemos descuentos por volumen y onboarding asistido (configuración de geocercas, capacitación a operadores y dashboards a la medida).',
  },
  {
    q: '¿Hay app que instalar?',
    a: 'No. SilentEye funciona desde cualquier navegador (Chrome, Safari, Edge) en celular o computadora. El operador entra desde su celular sin descargar nada. Esto evita que los operadores desinstalen la app o se queden sin espacio en sus dispositivos.',
  },
  {
    q: '¿Generan reportes para auditoría y aseguradoras?',
    a: 'Sí. Puedes exportar reportes PDF por unidad o por flota: recorridos, paradas, alertas, incidentes y velocidades promedio. Los reportes incluyen el rastro completo geolocalizado y son aceptados por aseguradoras y autoridades como evidencia.',
  },
];

const truckGpsModels = [
  {
    brand: 'Teltonika FMC130',
    origin: 'Lituania',
    price: '$2,000 – $3,500 MXN',
    desc: 'GPS industrial 4G LTE Cat 1 con 4 entradas/4 salidas digitales. Botón de pánico físico vía DIN1, batería interna de respaldo. Protocolo Codec 8/8E. Recomendado para tractocamión y trailer.',
    accent: 'border-blue-200 bg-blue-50/40',
  },
  {
    brand: 'Queclink GV500',
    origin: 'China',
    price: '$1,800 – $3,000 MXN',
    desc: 'Diseñado para vehículos pesados. Múltiples protocolos de comunicación, batería de respaldo, ideal para flotas de larga distancia con cobertura intermitente.',
    accent: 'border-emerald-200 bg-emerald-50/40',
  },
  {
    brand: 'Concox GT06N',
    origin: 'China',
    price: '$500 – $900 MXN',
    desc: 'La opción económica con protocolo GT06 ampliamente soportado. Alarmas SOS, corte de corriente y vibración. Ideal para flotas que arrancan o presupuestos ajustados.',
    accent: 'border-violet-200 bg-violet-50/40',
  },
];

export default function RastreoSatelitalCamionesPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: 'Inicio', url: 'https://silenteye.mx' },
          {
            name: 'Rastreo satelital para camiones',
            url: 'https://silenteye.mx/rastreo-satelital-camiones',
          },
        ])}
      />
      <JsonLd
        data={getWebPageJsonLd({
          name: 'Rastreo Satelital para Camiones, Trailers y Flotas | SilentEye',
          description:
            'Rastreo satelital y GPS para camiones de carga, trailers y flotas en México. Alerta en 3 segundos, sin central. Desde $79 MXN/mes por unidad.',
          url: 'https://silenteye.mx/rastreo-satelital-camiones',
        })}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Rastreo satelital para camiones de carga',
          serviceType: 'Vehicle Tracking — Heavy Cargo',
          description:
            'Rastreo satelital y GPS para camiones, trailers y flotas de transporte de carga en México. Alertas automáticas, monitoreo 24/7, geocercas y recuperación coordinada.',
          provider: {
            '@type': 'Organization',
            name: 'SilentEye',
            url: 'https://silenteye.mx',
          },
          areaServed: { '@type': 'Country', name: 'México' },
          audience: {
            '@type': 'BusinessAudience',
            audienceType:
              'Empresas de transporte, autotransporte de carga, operadores de flotillas',
          },
          offers: {
            '@type': 'Offer',
            price: '79',
            priceCurrency: 'MXN',
            availability: 'https://schema.org/InStock',
            description:
              'Plan Flotillas — $79 MXN/mes por vehículo a partir de 4 unidades. Sin contrato.',
          },
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Servicios para flotas de camiones',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Monitoreo satelital 24/7',
                  description:
                    'Ubicación en tiempo real, historial de recorridos, velocidad y eventos.',
                },
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Alertas de desvío y geocercas',
                  description:
                    'Polígonos sobre el mapa para CEDIS y rutas. Alerta automática al salir.',
                },
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Botón de pánico para conductor',
                  description:
                    'DIN1 físico en el GPS o desde el navegador. Alerta a la red en 3s.',
                },
              },
            ],
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-zinc-100 px-6 py-3">
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
            <Link href="/cotizar-flota" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Cotizar flota
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative px-6 pt-16 pb-12 md:pt-24 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,white_60%,#f0f9ff)]" />
        <div className="relative max-w-5xl mx-auto">
          <p className="text-[12px] font-bold text-blue-600 tracking-wider uppercase mb-4">
            Rastreo satelital para flotas de carga
          </p>
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-zinc-900 mb-6">
            Rastreo satelital para camiones, trailers y tractocamión.{' '}
            <span className="text-blue-600">Alerta en 3 segundos a la red.</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 leading-relaxed max-w-3xl mb-8">
            Si te roban un camión, una central telefónica tarda <strong className="text-zinc-700">5–15 minutos</strong> en
            reaccionar. SilentEye distribuye la alerta a todos los conductores
            cercanos en <strong className="text-zinc-700">menos de 3 segundos</strong>.
            Sin central. Sin llamada. Sin espera.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link
              href="/cotizar-flota"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cotizar mi flota gratis
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <a
              href="https://wa.me/525610669353?text=Hola%2C%20tengo%20una%20flota%20de%20camiones%20y%20me%20interesa%20SilentEye"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border-2 border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
                <path d="M16.004 2.002c-7.732 0-14.002 6.27-14.002 14.002 0 2.468.654 4.876 1.896 6.992L2 30l7.193-1.864A13.94 13.94 0 0 0 16.004 30c7.732 0 14.002-6.27 14.002-14.002Z"/>
              </svg>
              Hablar por WhatsApp
            </a>
          </div>

          {/* Trust strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-zinc-200">
            {[
              { val: '<3s', label: 'Alerta a la red' },
              { val: '24/7', label: 'Monitoreo carretera' },
              { val: '$79', label: 'MXN/mes por unidad' },
              { val: '0', label: 'Contrato de permanencia' },
            ].map((m, i) => (
              <div key={i}>
                <div className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight font-mono">{m.val}</div>
                <div className="text-[13px] text-zinc-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* El problema */}
      <section className="px-6 py-16 md:py-24 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[12px] font-bold text-red-600 tracking-wider uppercase mb-3">
                El problema real del transporte de carga en México
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 mb-5">
                14,000+ robos de carga al año. El rastreo tradicional no es suficiente.
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                Según la <a href="https://anerpv.org.mx/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">ANERPV</a>, México registra más de 14,000 robos de carga
                anuales. El 60% ocurre en el llamado Triángulo Rojo: Puebla, Tlaxcala,
                Estado de México y Veracruz. Y la mayoría sucede en{' '}
                <strong className="text-zinc-900">menos de 8 minutos</strong>.
              </p>
              <p className="text-zinc-600 leading-relaxed">
                Una central de rastreo tradicional necesita: recibir la alerta,
                validarla, llamar al cliente, llamar a la policía, despachar
                respuesta. Para cuando reaccionan, el trailer ya está en otro
                estado. <strong className="text-zinc-900">El rastreo satelital sin respuesta colectiva
                solo sirve para reportar a tu aseguradora — no para recuperar.</strong>
              </p>
            </div>
            <div className="rounded-xl bg-white border-2 border-zinc-200 p-6 md:p-8">
              <h3 className="text-lg font-bold text-zinc-900 mb-5">
                Qué pasa en los primeros 8 minutos
              </h3>
              <ol className="space-y-4">
                {[
                  { t: 'Min 0', d: 'Robo del trailer en carretera o patio' },
                  { t: 'Min 1', d: 'Conductor activa botón pánico (si tiene)' },
                  { t: 'Min 2', d: 'Central recibe alerta, valida, llama' },
                  { t: 'Min 5', d: 'Cliente confirma, policía es notificada' },
                  { t: 'Min 8', d: 'Trailer ya cambió de placas o desconectó GPS' },
                ].map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-14 text-[11px] font-mono font-bold text-red-600 pt-0.5">
                      {step.t}
                    </span>
                    <span className="text-[14px] text-zinc-600">{step.d}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-5 border-t border-zinc-100">
                <p className="text-[13px] text-zinc-500">
                  <strong className="text-blue-600">Con SilentEye:</strong> en
                  Min 0:03 ya hay 30+ conductores cercanos viendo el trailer en
                  el mapa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="text-[12px] font-bold text-blue-600 tracking-wider uppercase mb-3">
              Cómo funciona el rastreo satelital con SilentEye
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 mb-4">
              De señal satelital a respuesta colectiva en 3 segundos
            </h2>
            <p className="text-zinc-500 leading-relaxed">
              No reinventamos el rastreo satelital. Reinventamos lo que pasa
              después de la alerta.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              {
                n: '01',
                title: 'GPS en tu camión',
                desc: 'Tu Teltonika, Queclink o Concox transmite posición vía satélite + red celular cada 5–30 segundos a SilentEye.',
              },
              {
                n: '02',
                title: 'Evento detectado',
                desc: 'El conductor presiona pánico, el GPS detecta desvío de ruta, exceso de velocidad o corte de corriente.',
              },
              {
                n: '03',
                title: 'Distribución masiva',
                desc: 'En <3s, todos los conductores SilentEye en 2 km reciben la ubicación viva del trailer en su navegador.',
              },
              {
                n: '04',
                title: 'Recuperación en vivo',
                desc: 'La red ve el camión moverse en tiempo real. Reportan a autoridades con ubicación exacta verificada.',
              },
            ].map((step, i) => (
              <div key={i} className="rounded-xl border-2 border-zinc-200 bg-white p-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-sm font-mono mb-4">
                  {step.n}
                </div>
                <h3 className="font-extrabold text-zinc-900 mb-2">{step.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GPS recomendados */}
      <section className="px-6 py-16 md:py-24 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="text-[12px] font-bold text-blue-600 tracking-wider uppercase mb-3">
              GPS recomendados para camión de carga
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 mb-4">
              Compatible con los GPS que ya conoces
            </h2>
            <p className="text-zinc-500 leading-relaxed">
              No te casamos con un proveedor de hardware. Si ya tienes GPS
              instalados, los conectas. Si no, te recomendamos opciones según
              tu presupuesto.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {truckGpsModels.map((m) => (
              <div key={m.brand} className={`rounded-xl border-2 ${m.accent} p-6`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-extrabold text-zinc-900">{m.brand}</h3>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {m.origin}
                  </span>
                </div>
                <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
                  {m.desc}
                </p>
                <div className="text-[14px] font-bold text-zinc-900">{m.price}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-white border-2 border-dashed border-zinc-300 p-6 text-center">
            <p className="text-[14px] text-zinc-600">
              ¿Ya tienes GPS de otra marca? Si soporta protocolo Codec 8 (Teltonika)
              o GT06 (Concox/Cobán/Sinotrack), funciona con SilentEye.{' '}
              <a
                href="https://wa.me/525610669353?text=Hola%2C%20tengo%20GPS%20%5Bmarca%5D%20instalados%20en%20mi%20flota%2C%20%C2%BFson%20compatibles%20con%20SilentEye%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-semibold hover:underline"
              >
                Pregunta por WhatsApp →
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Calculadora ROI */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <RoiCalculator />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 md:py-24 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <p className="text-[12px] font-bold text-blue-600 tracking-wider uppercase mb-3">
              Preguntas frecuentes
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900">
              Lo que preguntan dueños de flota antes de cambiar de proveedor
            </h2>
          </div>
          <div className="divide-y divide-zinc-200">
            {faqItems.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none text-[15px] font-semibold text-zinc-900 hover:text-zinc-600 transition-colors">
                  {item.q}
                  <svg className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-45 flex-shrink-0 ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </summary>
                <p className="pb-5 text-[14px] text-zinc-500 leading-relaxed -mt-1">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-zinc-900 text-white rounded-2xl px-8 py-14 md:px-16 md:py-20 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-xl">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                ¿Cuántos camiones necesitas proteger?
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                Llena un formulario corto (5 campos, sin login) y te enviamos la
                cotización exacta para tu flota en menos de 2 horas hábiles.
                Mejor aún: contáctanos por WhatsApp.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/cotizar-flota"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  Cotizar mi flota
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
                <a
                  href="https://wa.me/525610669353?text=Hola%2C%20tengo%20una%20flota%20de%20camiones%20y%20me%20interesa%20SilentEye"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  WhatsApp directo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="border-t border-zinc-100 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold">SilentEye</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-zinc-400">
            <Link href="/precios" className="hover:text-zinc-600">Precios</Link>
            <Link href="/blog/gps-para-trailers-camiones-carga" className="hover:text-zinc-600">Guía camiones</Link>
            <Link href="/comparar" className="hover:text-zinc-600">Comparar</Link>
            <Link href="/privacidad" className="hover:text-zinc-600">Privacidad</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
