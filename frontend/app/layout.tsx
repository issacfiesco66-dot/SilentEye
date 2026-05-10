import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import WhatsAppButton from '@/components/WhatsAppButton';
import { LocaleProvider } from '@/contexts/LocaleContext';
import MetadataUpdater from '@/components/MetadataUpdater';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

const SITE_URL = 'https://silenteye.mx';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SilentEye — Rastreo Satelital y GPS para Camiones, Trailers y Flotillas | México',
    template: '%s | SilentEye — Rastreo Satelital GPS México',
  },
  description:
    'Plataforma de rastreo satelital y GPS para camiones, trailers y flotillas en México. Alerta de robo en 3 segundos a conductores cercanos: sin central, sin llamada, sin espera. Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack. Desde $79 MXN/mes por vehículo.',
  keywords: [
    // ── Camiones / transporte de carga (CSV high-priority) ──
    'rastreo satelital para camiones', 'rastreo satelital de vehículos',
    'rastreo satelital para camiones de carga', 'seguimiento satelital de vehículos',
    'seguimiento satelital de camiones', 'monitoreo satelital de camiones',
    'monitoreo satelital de vehículos', 'sistema de rastreo satelital para camiones',
    'gps para camiones', 'gps para camiones de carga', 'gps para camión',
    'gps para trailers', 'gps para tractocamión', 'gps para flota de camiones',
    'gps para transporte de carga', 'gps para transporte pesado',
    'gps para camiones comerciales', 'gps para camionetas',
    'localizador gps para camiones', 'rastreador gps para camiones',
    'sistema gps para camiones', 'control satelital para camiones',
    'gepeese para camiones',
    // ── Plataforma + producto ──
    'plataforma GPS', 'rastreo GPS', 'rastreo vehicular', 'monitoreo GPS',
    'GPS en tiempo real', 'seguridad vehicular', 'rastreador GPS',
    'GPS para auto', 'GPS para motos', 'GPS para flotillas', 'GPS para uber',
    'botón de pánico GPS', 'alerta GPS robo de auto',
    'sistema GPS antirrobo', 'geocercas GPS', 'recuperación vehicular GPS',
    'GPS Teltonika', 'GPS Queclink', 'GPS Concox', 'GPS Cobán', 'GPS Sinotrack',
    'GPS FMB920', 'GPS FMC130', 'GPS GT06N', 'GPS TK103', 'GPS GV500',
    'localizador GPS para auto', 'localizador vehicular',
    'plataforma GPS México', 'rastreador vehicular México',
    'cotizar gps para flotilla', 'cotizar rastreo satelital camiones',
    // ── English (US) ──
    'GPS tracking platform', 'vehicle GPS tracker', 'real-time GPS tracking',
    'GPS fleet management', 'vehicle theft alert', 'stolen car GPS recovery',
    'GPS tracker for cars', 'GPS tracker for trucks', 'GPS tracker for motorcycles',
    'GPS tracker for fleets', 'GPS tracker for Uber drivers',
    'panic button GPS', 'GPS theft alert system', 'vehicle recovery GPS',
    'GPS geofence alerts', 'anti-theft GPS tracker',
    'Teltonika GPS tracker', 'Queclink GPS tracker', 'Concox GPS tracker',
    'Coban GPS tracker', 'Sinotrack GPS tracker',
    'best GPS tracker USA', 'fleet GPS tracking software',
    'car GPS locator', 'vehicle tracking system', 'GPS vehicle security',
    'mass alert GPS platform', 'crowd-sourced vehicle recovery',
    'GPS tracker no app needed', 'browser-based GPS tracking',
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
    alternateLocale: 'en_US',
    url: SITE_URL,
    siteName: 'SilentEye',
    title: 'SilentEye — Rastreo Satelital y GPS para Camiones, Trailers y Flotillas | México',
    description:
      'Rastreo satelital y GPS para camiones, trailers y flotillas. Alerta de robo en 3 segundos a conductores cercanos. Sin central, sin llamada. Desde $79 MXN/mes. México.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SilentEye — Alerta de robo vehicular en 3 segundos a conductores cercanos',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SilentEye — Rastreo Satelital GPS para Camiones y Flotillas | México',
    description:
      'Rastreo satelital de camiones, trailers y flotillas. Alerta a la red en 3 segundos: sin central, sin llamada. Plataforma compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack.',
    images: ['/opengraph-image'],
  },
  alternates: {
    canonical: SITE_URL,
    languages: { 'es-MX': SITE_URL, 'en-US': SITE_URL },
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
        <LocaleProvider>
          <MetadataUpdater />
          {children}
          <CookieConsent />
          <WhatsAppButton />
        </LocaleProvider>
      </body>
    </html>
  );
}
