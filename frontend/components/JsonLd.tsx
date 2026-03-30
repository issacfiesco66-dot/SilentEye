/**
 * JSON-LD Structured Data for SEO
 * Provides rich snippets for Google: Organization, SoftwareApplication, FAQPage, BreadcrumbList
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ── Organization ──
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SilentEye',
  url: 'https://silenteye.mx',
  logo: 'https://silenteye.mx/icon-512.png',
  description:
    'Plataforma GPS de seguridad vehicular con rastreo en tiempo real, alertas automáticas y botón de pánico. Compatible con GPS Teltonika, Queclink, Concox, Cobán y Sinotrack.',
  foundingDate: '2026',
  sameAs: [],
  knowsAbout: [
    'Rastreo GPS vehicular',
    'Seguridad vehicular México',
    'Gestión de flotillas GPS',
    'Recuperación vehicular',
    'GPS Teltonika',
    'GPS Cobán',
    'GPS Sinotrack',
    'Botón de pánico vehicular',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    url: 'https://silenteye.mx',
    availableLanguage: ['Spanish'],
  },
  areaServed: {
    '@type': 'Country',
    name: 'México',
  },
};

// ── SoftwareApplication ──
export const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SilentEye — Plataforma GPS de Seguridad Vehicular',
  url: 'https://silenteye.mx',
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'MXN',
    description: 'Botón de emergencia SOS gratuito. Plataforma GPS con planes accesibles.',
  },
  description:
    'Software de rastreo GPS vehicular en tiempo real con detección automática de robo, botón de pánico, alertas instantáneas y coordinación de respuesta. Compatible con GPS Teltonika FMB920, Queclink GL300, Concox GT06N, Cobán TK103 y Sinotrack ST-901.',
  featureList: [
    'Rastreo GPS en tiempo real',
    'Botón de pánico GPS',
    'Detección automática de robo de vehículo',
    'Alertas GPS instantáneas en menos de 3 segundos',
    'Geocercas GPS',
    'Monitoreo de flotillas GPS',
    'Historial de recorridos GPS',
    'Compatible con GPS Teltonika, Queclink, Concox, Cobán, Sinotrack',
    'Red de apoyo ciudadana',
    'Reportes PDF de incidentes',
    'Notificaciones push',
    'Sin app — funciona desde el navegador',
  ],
  screenshot: 'https://silenteye.mx/og-image.png',
  author: {
    '@type': 'Organization',
    name: 'SilentEye',
  },
};

// ── FAQ ──
export const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué es SilentEye y cómo funciona la plataforma GPS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SilentEye es una plataforma GPS de seguridad vehicular que convierte tu rastreador GPS existente en un sistema de respuesta inmediata. Conecta tu GPS Teltonika, Queclink, Concox, Cobán o Sinotrack y la plataforma monitorea en tiempo real, detecta emergencias y distribuye alertas automáticamente a personas cercanas en menos de 3 segundos.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Necesito instalar alguna app para usar el rastreo GPS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. SilentEye funciona directo en el navegador de tu celular. Entra al sitio, regístrate con tu teléfono y listo. Sin descargas, sin espacio en tu celular. Toda la plataforma GPS es accesible desde cualquier dispositivo con navegador web.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué marcas y modelos de GPS son compatibles con SilentEye?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SilentEye es compatible con 5 marcas de GPS: Teltonika (FMB920, FMC920, FMC130), Queclink (GL300, GV300, GV58CEU), Concox (GT06N, WeTrack2, GV20, JM-VL), Cobán (TK103, TK303, GPS103) y Sinotrack (ST-901, ST-906). Si tu GPS es de alguna de estas marcas, se conecta directamente a la plataforma.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Necesito comprar un GPS nuevo para usar la plataforma?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No necesariamente. Si ya tienes un GPS Teltonika, Queclink, Concox, Cobán o Sinotrack instalado en tu vehículo, solo necesitas apuntar el servidor de tu GPS a SilentEye. La plataforma es compatible con estos equipos sin necesidad de cambiar de hardware ni de rastreador GPS.',
      },
    },
    {
      '@type': 'Question',
      name: '¿El botón de pánico SOS tiene algún costo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. El botón de emergencia ciudadano SOS es completamente gratuito para cualquier persona. No necesitas un GPS instalado. Solo necesitas un correo electrónico para registrarte y puedes activar una alerta de emergencia desde tu celular.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Quién recibe mis alertas GPS de emergencia?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Los administradores del sistema y cualquier voluntario o conductor registrado que se encuentre dentro del radio de 2 km de tu ubicación GPS. La plataforma distribuye la alerta automáticamente con tu ubicación en tiempo real. Entre más personas estén registradas, más rápida la respuesta.',
      },
    },
    {
      '@type': 'Question',
      name: '¿SilentEye funciona para monitoreo de flotillas GPS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. SilentEye soporta gestión completa de flotillas GPS. Cada vehículo aparece de forma independiente en el mapa con su propia información de ubicación GPS, velocidad, historial de recorridos y geocercas. Ideal para flotillas de transporte, trailers y vehículos comerciales.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo es la plataforma GPS comparada con un GPS tradicional?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Un GPS tradicional solo rastrea y genera eventos para revisión posterior. SilentEye va más allá: distribuye alertas automáticas en menos de 3 segundos a todas las personas cercanas con ubicación GPS en vivo. No hay central de monitoreo, no hay llamada, no hay espera. La reacción ocurre mientras el evento sigue sucediendo.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué GPS es mejor para un auto particular?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Para autos particulares recomendamos GPS Cobán TK103 o Sinotrack ST-901 por su bajo costo y fácil instalación. Si buscas algo más robusto, el Teltonika FMB920 es grado industrial. Todos son compatibles con SilentEye y ofrecen rastreo GPS en tiempo real, geocercas y alerta de robo automática.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué GPS recomiendan para trailers y camiones de carga?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Para trailers y camiones de carga recomendamos GPS Teltonika FMC130 o Queclink GV500 por su resistencia industrial, conectividad estable en carretera y botón de pánico físico (DIN1). SilentEye monitorea la ruta completa con alertas de desvío, exceso de velocidad y coordinación de recuperación vehicular.',
      },
    },
    {
      '@type': 'Question',
      name: '¿SilentEye funciona con GPS para motos y motocicletas?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. Los GPS Sinotrack ST-901 y Concox WeTrack2 son ultracompactos e ideales para motos. Se instalan de forma discreta y SilentEye detecta movimiento no autorizado, vibración y envía alertas instantáneas. Las motos son el vehículo más robado en México — un GPS con SilentEye ofrece protección real.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cuánto cuesta la plataforma GPS de SilentEye?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'El botón de emergencia SOS es completamente gratuito. La plataforma de rastreo GPS para autos, camiones, trailers, motos y flotillas tiene planes accesibles que dependen de la cantidad de vehículos. Contacta con nosotros para una cotización personalizada.',
      },
    },
  ],
};

// ── HowTo: Proceso de recuperación vehicular ──
export const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Cómo funciona la recuperación vehicular con GPS y SilentEye',
  description:
    'Proceso paso a paso de cómo SilentEye detecta una emergencia vehicular, distribuye alertas automáticas y coordina la recuperación del vehículo en menos de 3 segundos.',
  totalTime: 'PT3S',
  tool: [
    { '@type': 'HowToTool', name: 'Dispositivo GPS compatible (Teltonika, Queclink, Concox, Cobán o Sinotrack)' },
    { '@type': 'HowToTool', name: 'Plataforma SilentEye (acceso desde navegador web)' },
  ],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Emergencia detectada',
      text: 'El conductor presiona el botón de pánico en el GPS o desde su celular. La señal se envía al instante a la plataforma SilentEye.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Plataforma analiza',
      text: 'SilentEye identifica el tipo de emergencia, valida la ubicación GPS y prepara la distribución de alertas en menos de 1 segundo.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Alerta distribuida',
      text: 'En menos de 3 segundos, administradores, helpers y conductores cercanos dentro de un radio de 2 km reciben la alerta con ubicación en vivo.',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Coordinación en vivo',
      text: 'La red de apoyo ve la ubicación del vehículo en tiempo real sobre el mapa. Helpers confirman que van en camino y se coordinan.',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'Recuperación y reporte',
      text: 'El incidente queda documentado con testigos digitales, responders y reporte PDF automático para seguimiento legal.',
    },
  ],
};

// ── Service: Plataforma GPS ──
export const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Plataforma de Rastreo GPS Vehicular SilentEye',
  description:
    'Servicio de rastreo GPS vehicular en tiempo real con alertas automáticas, botón de pánico, gestión de flotillas y coordinación de recuperación vehicular. Compatible con GPS Teltonika, Queclink, Concox, Cobán y Sinotrack.',
  provider: {
    '@type': 'Organization',
    name: 'SilentEye',
    url: 'https://silenteye.mx',
  },
  serviceType: 'Rastreo GPS Vehicular',
  areaServed: {
    '@type': 'Country',
    name: 'México',
  },
  availableChannel: {
    '@type': 'ServiceChannel',
    serviceUrl: 'https://silenteye.mx',
    servicePlatform: 'Web',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'MXN',
    description: 'Botón de emergencia SOS gratuito. Planes accesibles de rastreo GPS según cantidad de vehículos.',
    availability: 'https://schema.org/InStock',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios GPS SilentEye',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Botón de Emergencia SOS Ciudadano',
          description: 'Alerta de emergencia gratuita desde el navegador. Sin GPS, sin app, sin costo.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Rastreo GPS para Autos',
          description: 'Monitoreo GPS en tiempo real para autos particulares con alertas de robo y geocercas.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Rastreo GPS para Flotillas',
          description: 'Gestión completa de flotillas GPS con panel multi-vehículo, asignación de conductores y alertas de velocidad.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Rastreo GPS para Camiones y Trailers',
          description: 'Rastreo GPS industrial para transporte de carga con monitoreo en carretera 24/7 y botón de pánico.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Rastreo GPS para Motos',
          description: 'GPS compacto para motos con alerta de vibración, movimiento no autorizado y recuperación vehicular.',
        },
      },
    ],
  },
};

// ── WebSite (for sitelinks search box in Google) ──
export const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SilentEye',
  url: 'https://silenteye.mx',
  description: 'Plataforma GPS de seguridad vehicular con rastreo en tiempo real, alertas automáticas y botón de pánico.',
  inLanguage: 'es-MX',
  publisher: {
    '@type': 'Organization',
    name: 'SilentEye',
    url: 'https://silenteye.mx',
  },
};

// ── Article (for blog posts) ──
export function getArticleJsonLd(opts: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified || opts.datePublished,
    image: opts.image || 'https://silenteye.mx/og-image.png',
    author: {
      '@type': 'Organization',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
      logo: {
        '@type': 'ImageObject',
        url: 'https://silenteye.mx/icon-512.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': opts.url,
    },
    inLanguage: 'es-MX',
  };
}

// ── BreadcrumbList ──
export function getBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── WebPage ──
export function getWebPageJsonLd(opts: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
    },
  };
}
