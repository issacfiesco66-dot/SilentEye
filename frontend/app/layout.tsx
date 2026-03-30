import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

const SITE_URL = 'https://silenteye.mx';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SilentEye — Plataforma GPS de Seguridad Vehicular | Rastreo GPS en Tiempo Real',
    template: '%s | SilentEye — Plataforma GPS',
  },
  description:
    'Plataforma GPS de seguridad vehicular con rastreo en tiempo real, alertas automáticas y botón de pánico. GPS para autos, camiones, trailers, motos y flotillas. Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack. Monitoreo GPS 24/7 México.',
  keywords: [
    'plataforma GPS',
    'rastreo GPS',
    'rastreo vehicular',
    'monitoreo GPS',
    'GPS en tiempo real',
    'seguridad vehicular',
    'rastreador GPS',
    'GPS para auto',
    'GPS para autos',
    'GPS para carro',
    'GPS para camiones',
    'GPS para trailers',
    'GPS para motos',
    'GPS para motocicletas',
    'GPS para flotillas',
    'GPS para transporte',
    'GPS para uber',
    'GPS para didi',
    'GPS para taxi',
    'GPS para camioneta',
    'GPS para vehículos',
    'plataforma para GPS',
    'plataforma de rastreo GPS',
    'software GPS tracking',
    'mejor plataforma GPS México',
    'GPS Teltonika',
    'GPS Queclink',
    'GPS Concox',
    'GPS Cobán',
    'GPS Sinotrack',
    'GPS tracker México',
    'gestión de flotillas GPS',
    'localización GPS vehicular',
    'botón de pánico GPS',
    'alerta GPS robo de auto',
    'monitoreo de vehículos',
    'seguimiento GPS',
    'sistema GPS antirrobo',
    'GPS FMB920',
    'GPS FMC920',
    'GPS GT06N',
    'GPS TK103',
    'geocercas GPS',
    'recuperación vehicular GPS',
    'GPS multi-marca',
    'plataforma GPS México',
    'rastreo GPS camiones',
    'rastreo GPS motos',
    'rastreo GPS trailers',
    'localizar auto robado GPS',
    'GPS antirrobo moto',
    'GPS antirrobo auto',
    'localizador GPS para auto',
    'localizador GPS para moto',
    'localizador vehicular',
    'localizador de autos',
    'rastreador vehicular México',
    'sistema de rastreo GPS',
    'plataforma de monitoreo GPS',
    'software de rastreo vehicular',
    'control de flotillas',
    'monitoreo de flotillas',
    'GPS para transporte de carga',
    'GPS para reparto',
    'GPS para empresa de transporte',
    'precio GPS tracker México',
    'rastreo satelital vehicular',
    'rastreo satelital México',
    'GPS con alerta de robo',
    'GPS con botón de pánico',
    'seguridad para conductores Uber',
    'GPS para InDriver',
    'GPS para Beat',
    'monitoreo vehicular en tiempo real',
    'plataforma GPS gratuita',
    'app de rastreo GPS',
    'rastrear auto robado',
    'como rastrear un auto con GPS',
    'mejor rastreador GPS México 2026',
    'GPS para prevenir robo de auto',
    'GPS económico para auto México',
    'chip GPS para auto',
    'GPS sin renta mensual',
    'GPS para carga pesada',
    'GPS para mensajería',
    'GPS oculto para auto',
    'GPS vehicular con app',
    'GPS Micodus',
    'GPS con corte de motor a distancia',
    'localización satelital',
    'GPS para repartidores',
    'GPS antirrobo camioneta',
    'GPS para autobús',
    'como saber si mi auto tiene GPS',
    'APN GPS tracker Telcel',
    'GPS para mujeres',
    'botón de pánico vehicular',
    'recuperar auto robado GPS',
    'GPS tracker barato México',
    'rastreador satelital para carro',
    'GPS para taxi',
    'GPS para camioneta pickup',
    'geocerca GPS',
    'alerta de velocidad GPS',
  ],
  authors: [{ name: 'SilentEye', url: SITE_URL }],
  creator: 'SilentEye',
  publisher: 'SilentEye',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: SITE_URL,
    siteName: 'SilentEye',
    title: 'SilentEye — Plataforma GPS para Autos, Camiones, Trailers y Motos | Rastreo en Tiempo Real',
    description:
      'GPS para autos, camiones, trailers, motos y flotillas. Rastreo en tiempo real, alertas automáticas y botón de pánico. Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack. La mejor plataforma GPS de México.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SilentEye — Plataforma GPS de Seguridad Vehicular con rastreo en tiempo real',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SilentEye — GPS para Autos, Camiones, Trailers, Motos y Flotillas',
    description:
      'Plataforma GPS con rastreo en tiempo real para autos, camiones, trailers y motos. Alertas automáticas, botón de pánico y monitoreo 24/7. Compatible con 5 marcas de GPS en México.',
    images: ['/opengraph-image'],
  },
  alternates: {
    canonical: SITE_URL,
    languages: { 'es-MX': SITE_URL },
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
  },
  manifest: '/manifest.json',
  category: 'technology',
  verification: {
    google: 'BlJAbtY9k43s6l9ZPdXtog1eLX9iupG-s1fpC6-vRAc',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="bg-white text-zinc-900 antialiased" style={{ minHeight: '100vh', margin: 0 }}>
        {children}
        <CookieConsent />
        {/* WhatsApp floating button */}
        <a
          href="https://wa.me/525610669353?text=Hola%2C%20me%20interesa%20SilentEye"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-full shadow-lg hover:bg-[#20bd5a] transition-colors hover:scale-105 active:scale-95"
        >
          <svg viewBox="0 0 32 32" width="28" height="28" fill="#fff">
            <path d="M16.004 2.002c-7.732 0-14.002 6.27-14.002 14.002 0 2.468.654 4.876 1.896 6.992L2 30l7.193-1.864A13.94 13.94 0 0 0 16.004 30c7.732 0 14.002-6.27 14.002-14.002-.004-7.728-6.274-13.996-14.002-13.996Zm0 25.6a11.6 11.6 0 0 1-5.918-1.624l-.424-.252-4.4 1.154 1.174-4.293-.277-.44a11.562 11.562 0 0 1-1.775-6.145c0-6.408 5.216-11.62 11.624-11.62 6.404 0 11.616 5.212 11.616 11.62-.004 6.408-5.216 11.6-11.62 11.6Zm6.372-8.7c-.348-.176-2.068-1.02-2.388-1.136-.32-.12-.552-.176-.784.176-.232.348-.9 1.136-1.104 1.368-.204.232-.408.26-.756.088-.348-.176-1.472-.544-2.804-1.732-1.036-.924-1.736-2.064-1.94-2.412-.204-.348-.02-.536.152-.712.156-.156.348-.408.524-.612.176-.204.232-.348.348-.58.116-.232.06-.436-.028-.612-.088-.176-.784-1.892-1.076-2.588-.284-.68-.572-.588-.784-.6-.204-.008-.436-.012-.668-.012s-.612.088-.932.436c-.32.348-1.22 1.192-1.22 2.908s1.248 3.372 1.424 3.604c.176.232 2.46 3.752 5.96 5.264.832.36 1.484.576 1.992.736.836.268 1.6.232 2.2.14.672-.1 2.068-.844 2.36-1.66.292-.82.292-1.52.204-1.664-.088-.148-.32-.232-.668-.408Z"/>
          </svg>
        </a>
      </body>
    </html>
  );
}
