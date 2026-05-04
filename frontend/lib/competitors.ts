/**
 * Comparativas SilentEye vs competidores
 * Datos basados en información pública disponible en sitios oficiales
 * y reseñas de usuarios. Última actualización: 2026-05.
 *
 * NOTA: Los precios y features de competidores cambian. Los datos aquí
 * son rangos representativos para fines comparativos, no cotizaciones.
 */

export interface CompetitorComparison {
  slug: string;
  competitor: string;
  competitorBrand: string;
  title: string;
  description: string;
  keyword: string;
  intro: string;
  /** 4-6 ventajas concretas y verificables de SilentEye sobre este competidor */
  silenteyeAdvantages: { title: string; desc: string }[];
  /** 2-3 cosas en las que el competidor puede ser preferible — honestidad */
  competitorStrengths: { title: string; desc: string }[];
  /** Tabla de comparación feature por feature */
  comparisonTable: {
    feature: string;
    silenteye: string;
    competitor: string;
    winner: 'silenteye' | 'competitor' | 'tie';
  }[];
  /** Veredicto resumen: ¿para quién es cada uno? */
  verdict: {
    chooseSilenteye: string[];
    chooseCompetitor: string[];
  };
  /** FAQs específicos de esta comparativa */
  faqs: { q: string; a: string }[];
}

export const competitors: CompetitorComparison[] = [
  {
    slug: 'silenteye-vs-hunter',
    competitor: 'Hunter',
    competitorBrand: 'Hunter (Grupo Skyangel)',
    title: 'SilentEye vs Hunter: Comparativa de rastreo GPS vehicular en México',
    description:
      'Comparamos SilentEye y Hunter (Skyangel): precios, contratos, rastreo en tiempo real, app vs navegador, recuperación y red de respuesta. Descubre cuál conviene a tu auto o flotilla.',
    keyword: 'SilentEye vs Hunter',
    intro:
      'Hunter, del Grupo Skyangel, es uno de los servicios de rastreo y recuperación vehicular más conocidos de México. Tiene presencia desde hace décadas y un call center de monitoreo 24/7. SilentEye es una plataforma más nueva, sin contrato, basada en navegador y con una red de respuesta ciudadana en lugar de call center. Aquí los comparamos punto por punto.',
    silenteyeAdvantages: [
      {
        title: 'Sin contrato ni permanencia',
        desc: 'SilentEye se cancela en cualquier momento. Hunter típicamente requiere contratos anuales con penalización por cancelación anticipada.',
      },
      {
        title: 'Precio público y transparente',
        desc: 'Personal $99 MXN/mes/vehículo, Flotillas $79 MXN/mes/vehículo. Sin cotizaciones telefónicas ni descuentos por permanencia.',
      },
      {
        title: 'Compatible con cualquier GPS',
        desc: 'Funciona con Teltonika, Cobán, Sinotrack, Queclink y Concox. Hunter te amarra a su hardware propietario.',
      },
      {
        title: 'Sin app que instalar',
        desc: 'Todo desde el navegador (PWA opcional). Sin rentar permisos a una app, sin actualizaciones forzadas.',
      },
      {
        title: 'Red de respuesta ciudadana en 2 km',
        desc: 'En una emergencia SOS, alertamos automáticamente a usuarios cercanos en menos de 3 segundos. No dependes de un operador telefónico.',
      },
      {
        title: 'Botón SOS gratis para cualquier persona',
        desc: 'Sin GPS y sin pago, cualquiera puede activar el botón de pánico desde su navegador. Hunter es 100% de pago.',
      },
    ],
    competitorStrengths: [
      {
        title: 'Call center 24/7 con operadores',
        desc: 'Hunter tiene operadores humanos que coordinan con autoridades. SilentEye no tiene call center propio — la coordinación es entre usuarios.',
      },
      {
        title: 'Cobertura RF en zonas sin señal celular',
        desc: 'Algunos planes Hunter incluyen tecnología RF de respaldo. SilentEye depende 100% de red celular para transmitir ubicación.',
      },
      {
        title: 'Marca consolidada con décadas en el mercado',
        desc: 'Si tu compañía de seguros pide específicamente "Hunter o LoJack", puede haber descuento en póliza vehicular que SilentEye aún no tiene acreditado.',
      },
    ],
    comparisonTable: [
      { feature: 'Precio mensual (auto particular)', silenteye: '$99 MXN', competitor: 'Cotización (~$280-450 MXN público)', winner: 'silenteye' },
      { feature: 'Contrato', silenteye: 'Sin contrato', competitor: 'Típicamente 12 meses', winner: 'silenteye' },
      { feature: 'GPS compatible', silenteye: '5 marcas (Teltonika, Cobán, Sinotrack, Queclink, Concox)', competitor: 'Hardware propietario', winner: 'silenteye' },
      { feature: 'App requerida', silenteye: 'No (navegador / PWA)', competitor: 'App propietaria', winner: 'silenteye' },
      { feature: 'Tiempo de alerta', silenteye: '<3 segundos a red cercana', competitor: 'Variable según call center', winner: 'silenteye' },
      { feature: 'Botón SOS gratuito', silenteye: 'Sí, sin pago ni GPS', competitor: 'No', winner: 'silenteye' },
      { feature: 'Call center 24/7 con operadores', silenteye: 'No (red ciudadana)', competitor: 'Sí', winner: 'competitor' },
      { feature: 'Tecnología RF de respaldo', silenteye: 'No', competitor: 'En algunos planes', winner: 'competitor' },
      { feature: 'Multivehículo / flotillas', silenteye: 'Sí, plan dedicado $79/mes', competitor: 'Sí, cotización empresarial', winner: 'tie' },
      { feature: 'Geocercas', silenteye: 'Ilimitadas', competitor: 'Limitadas según plan', winner: 'silenteye' },
      { feature: 'Reportes PDF', silenteye: 'Sí, descargables', competitor: 'Sí (planes superiores)', winner: 'tie' },
      { feature: 'Historial de recorridos', silenteye: '30-90 días según plan', competitor: 'Variable', winner: 'tie' },
    ],
    verdict: {
      chooseSilenteye: [
        'Buscas precio transparente y sin contrato',
        'Ya tienes un GPS o quieres elegir tu propio hardware',
        'Prefieres autonomía: ver tu vehículo en vivo sin depender de un operador',
        'Tienes flotilla pequeña o mediana (4-50 unidades)',
        'Valoras la red ciudadana y el botón SOS gratuito como filosofía',
      ],
      chooseCompetitor: [
        'Tu aseguradora exige específicamente Hunter para descuento de póliza',
        'Operas en rutas con frecuentes zonas sin señal celular',
        'Necesitas un operador humano que llame y coordine en tu lugar',
      ],
    },
    faqs: [
      {
        q: '¿SilentEye recupera autos como Hunter?',
        a: 'SilentEye no opera un equipo de recuperación física. Lo que hacemos es darte la ubicación en vivo y alertar a la red cercana en menos de 3 segundos para que puedas coordinar con autoridades, asegurador o tu propio equipo. La recuperación física la hace la autoridad o un servicio que tú contrates.',
      },
      {
        q: '¿Mi seguro acepta SilentEye en lugar de Hunter?',
        a: 'Depende de la aseguradora. Algunas piden marcas específicas (Hunter, LoJack) para descuento; otras aceptan "rastreador GPS instalado" en general. Pregunta a tu aseguradora antes de cancelar Hunter si tu objetivo es el descuento de póliza.',
      },
      {
        q: '¿Puedo usar mi GPS Hunter actual con SilentEye?',
        a: 'No. El hardware Hunter es propietario y se comunica solo con su plataforma. Para usar SilentEye necesitas un GPS de las marcas compatibles (Teltonika, Cobán, Sinotrack, Queclink, Concox). El más económico arranca en $400 MXN una vez.',
      },
      {
        q: '¿Cuánto me ahorro al año cambiando de Hunter a SilentEye?',
        a: 'Si Hunter te cobra $300 MXN/mes y SilentEye Personal son $99/mes, son $2,412 de ahorro anual por vehículo, sin contar el ahorro de no tener contrato. Con 5 vehículos en flotilla ($79/mes c/u en SilentEye) el ahorro fácilmente supera $13,000 al año.',
      },
    ],
  },
  {
    slug: 'silenteye-vs-lojack',
    competitor: 'LoJack',
    competitorBrand: 'LoJack',
    title: 'SilentEye vs LoJack: ¿Rastreo continuo o recuperación post-robo?',
    description:
      'Comparamos SilentEye (rastreo GPS continuo en tiempo real) y LoJack (recuperación con tecnología de radiofrecuencia). Precios, alcance, tipo de tecnología y cuál conviene a tu auto.',
    keyword: 'SilentEye vs LoJack',
    intro:
      'LoJack es históricamente conocido por la recuperación de vehículos robados mediante tecnología de radiofrecuencia (RF) y coordinación con autoridades. SilentEye es una plataforma de rastreo GPS continuo basada en internet móvil. Resuelven el mismo problema —proteger tu vehículo— con filosofías muy distintas. Aquí la comparación honesta.',
    silenteyeAdvantages: [
      {
        title: 'Ves tu vehículo en vivo, todo el tiempo',
        desc: 'LoJack tradicionalmente se "activa" cuando reportas el robo. SilentEye te muestra tu auto en el mapa 24/7, no solo en emergencias.',
      },
      {
        title: 'Geocercas y alertas preventivas',
        desc: 'Te avisa si tu auto sale de una zona definida (casa, oficina, taller). LoJack RF clásico no ofrece esta funcionalidad.',
      },
      {
        title: 'Sin contrato',
        desc: 'LoJack típicamente requiere suscripción multianual con instalación cara. SilentEye se paga mes a mes.',
      },
      {
        title: 'Botón de pánico activo',
        desc: 'No solo rastreas — puedes pedir ayuda con un botón físico (DIN1 del GPS) o desde el navegador. Alerta llega en <3 segundos a personas cercanas.',
      },
      {
        title: 'Compatible con cualquier vehículo',
        desc: 'Autos, motos, camionetas, trailers — el GPS se instala en cualquier vehículo. LoJack tradicionalmente se enfoca en autos.',
      },
    ],
    competitorStrengths: [
      {
        title: 'Funciona aunque desactiven la red celular',
        desc: 'La tecnología RF de LoJack opera en frecuencias dedicadas, no depende de chip SIM. Si los ladrones jaman la señal celular, GPS falla; LoJack RF puede seguir funcionando.',
      },
      {
        title: 'Coordinación con autoridades acreditada',
        desc: 'En algunos países LoJack tiene acuerdos formales con policía. SilentEye no tiene ese acuerdo institucional aún.',
      },
      {
        title: 'Reconocimiento por aseguradoras',
        desc: 'LoJack es marca aceptada para descuento de póliza en muchas aseguradoras mexicanas.',
      },
    ],
    comparisonTable: [
      { feature: 'Tipo de tecnología', silenteye: 'GPS sobre red celular', competitor: 'RF + GPS (según plan)', winner: 'tie' },
      { feature: 'Rastreo continuo en vivo', silenteye: 'Sí, 24/7', competitor: 'Limitado / solo post-robo en planes básicos', winner: 'silenteye' },
      { feature: 'Geocercas', silenteye: 'Ilimitadas', competitor: 'No (RF clásico)', winner: 'silenteye' },
      { feature: 'Resistencia a jamming celular', silenteye: 'Vulnerable', competitor: 'RF más robusto', winner: 'competitor' },
      { feature: 'Precio mensual', silenteye: '$99 MXN', competitor: 'Cotización (~$200-350 MXN público)', winner: 'silenteye' },
      { feature: 'Permanencia', silenteye: 'Sin permanencia', competitor: '1-3 años típicamente', winner: 'silenteye' },
      { feature: 'Acuerdo formal con policía', silenteye: 'No', competitor: 'Sí (en algunos países)', winner: 'competitor' },
      { feature: 'Compatible con motos', silenteye: 'Sí', competitor: 'Limitado', winner: 'silenteye' },
      { feature: 'Aceptación por aseguradoras', silenteye: 'Variable', competitor: 'Amplia', winner: 'competitor' },
    ],
    verdict: {
      chooseSilenteye: [
        'Quieres ver tu auto en vivo todo el tiempo, no solo cuando lo roban',
        'Necesitas geocercas, alertas de velocidad, historial de recorridos',
        'Tu vehículo es moto, camioneta, trailer o flota',
        'Buscas precio claro y mes a mes',
      ],
      chooseCompetitor: [
        'Tu zona tiene robos sofisticados con jammers de señal celular',
        'Tu aseguradora da descuento solo con LoJack',
        'No te interesa la administración diaria del vehículo, solo recuperación si lo roban',
      ],
    },
    faqs: [
      {
        q: '¿Qué pasa si los ladrones bloquean la señal del GPS?',
        a: 'Honestidad primero: cualquier rastreador GPS (SilentEye, Hunter, etc.) depende de la red celular. Si activan un jammer, deja de transmitir. La diferencia con SilentEye es que te alertamos inmediatamente cuando se pierde señal en movimiento (anomalía), no esperamos a que reportes el robo. LoJack RF es más resistente al jamming, pero también más caro.',
      },
      {
        q: '¿SilentEye se conecta con mi seguro como LoJack?',
        a: 'No tenemos integración formal con aseguradoras todavía. Algunos clientes han logrado descuento presentando el reporte mensual de SilentEye + factura del GPS instalado, pero no es garantizado. Pregunta a tu aseguradora.',
      },
      {
        q: '¿Cuál es mejor para una moto?',
        a: 'Para motos, SilentEye con un Sinotrack ST-901 ($350 MXN una vez) o Cobán TK103 funciona muy bien — el GPS es pequeño, fácil de ocultar, y el plan es $99/mes. LoJack para moto es menos común y más caro.',
      },
    ],
  },
  {
    slug: 'silenteye-vs-skyguard',
    competitor: 'Skyguard',
    competitorBrand: 'Skyguard',
    title: 'SilentEye vs Skyguard: Comparativa de plataformas de rastreo GPS',
    description:
      'Skyguard vs SilentEye: precios, planes, multivehículo, app, contratos y red de respuesta. Comparativa para autos particulares y flotillas en México.',
    keyword: 'SilentEye vs Skyguard',
    intro:
      'Skyguard es una de las plataformas de rastreo vehicular más usadas en México, con presencia tanto en autos particulares como flotas. SilentEye llega como alternativa con precio público, sin contrato y enfoque en red ciudadana. Veamos las diferencias reales.',
    silenteyeAdvantages: [
      {
        title: 'Precio público y plano',
        desc: 'SilentEye publica precios: $99 personal, $79 flotilla. Skyguard típicamente cotiza por canal de venta y varía entre clientes.',
      },
      {
        title: 'Sin contrato ni permanencia',
        desc: 'Skyguard maneja contratos anuales en muchos casos. SilentEye se cancela cuando quieras.',
      },
      {
        title: 'Hardware abierto',
        desc: 'Conectas el GPS que prefieras de 5 marcas compatibles. Skyguard prefiere su distribución de hardware propio.',
      },
      {
        title: 'SOS ciudadano gratis',
        desc: 'Cualquier persona puede usar el botón SOS sin pago, sin GPS y sin app. Es un canal de marca y un servicio público al mismo tiempo.',
      },
      {
        title: 'Sin app obligatoria',
        desc: 'Funciona desde navegador en cualquier dispositivo. Skyguard requiere su app instalada.',
      },
    ],
    competitorStrengths: [
      {
        title: 'Marca con presencia comercial extendida',
        desc: 'Skyguard tiene distribuidores físicos en muchas ciudades. SilentEye es 100% online por ahora.',
      },
      {
        title: 'Servicios complementarios empresariales',
        desc: 'Skyguard ofrece módulos avanzados de combustible, temperatura, integración con ERP. SilentEye está enfocado en seguridad y rastreo, no en telemática avanzada todavía.',
      },
    ],
    comparisonTable: [
      { feature: 'Precio personal mensual', silenteye: '$99 MXN público', competitor: 'Cotización privada', winner: 'silenteye' },
      { feature: 'Precio flotilla', silenteye: '$79 MXN/vehículo', competitor: 'Cotización por volumen', winner: 'tie' },
      { feature: 'Contrato', silenteye: 'Mes a mes', competitor: 'Típicamente anual', winner: 'silenteye' },
      { feature: 'Hardware', silenteye: '5 marcas abiertas', competitor: 'Hardware del proveedor', winner: 'silenteye' },
      { feature: 'App requerida', silenteye: 'No (navegador)', competitor: 'Sí', winner: 'silenteye' },
      { feature: 'Distribución física', silenteye: 'Solo online', competitor: 'Distribuidores en varias ciudades', winner: 'competitor' },
      { feature: 'Telemática avanzada (combustible, temperatura)', silenteye: 'No todavía', competitor: 'Sí en planes empresariales', winner: 'competitor' },
      { feature: 'Botón SOS gratuito ciudadano', silenteye: 'Sí', competitor: 'No', winner: 'silenteye' },
      { feature: 'Tiempo de alerta', silenteye: '<3 segundos', competitor: 'Variable', winner: 'silenteye' },
    ],
    verdict: {
      chooseSilenteye: [
        'Quieres saber el precio antes de hablar con un vendedor',
        'Tienes 1-50 vehículos y no necesitas integración con ERP',
        'Prefieres comprar tu propio GPS y conectarlo',
        'Te interesa probar sin compromiso de contrato',
      ],
      chooseCompetitor: [
        'Necesitas telemática avanzada (control de combustible, temperatura de carga, integración SAP)',
        'Quieres un distribuidor que vaya físicamente a tu negocio',
        'Operas más de 200 vehículos con requerimientos empresariales complejos',
      ],
    },
    faqs: [
      {
        q: '¿Por qué Skyguard no publica precios?',
        a: 'Es práctica común en B2B mexicano: el precio se ajusta por canal, volumen, tipo de hardware y servicios extras. SilentEye decidió publicar precios para reducir fricción y permitir que el cliente decida sin llamar a un vendedor.',
      },
      {
        q: '¿SilentEye sirve para flotillas grandes?',
        a: 'Hasta unos 50-100 vehículos funciona perfectamente con el plan Flotillas. Si tienes más de 200 unidades con necesidades de telemática avanzada (combustible por minuto, temperatura de furgón refrigerado, integración con ERP), Skyguard u otra solución empresarial puede ser mejor opción. Contáctanos para casos grandes.',
      },
      {
        q: '¿Puedo migrar de Skyguard a SilentEye sin perder datos?',
        a: 'El hardware Skyguard es propietario, así que el GPS no se puede reutilizar. Necesitas un nuevo dispositivo de las marcas compatibles. Los datos históricos no se migran (regulación de plataforma anterior). Conservas 30-90 días de historial nuevo desde el cambio.',
      },
    ],
  },
];

export function getCompetitorBySlug(slug: string): CompetitorComparison | undefined {
  return competitors.find((c) => c.slug === slug);
}
