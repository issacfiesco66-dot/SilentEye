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
    default: 'SilentEye — Alerta de Robo Vehicular en 3 Segundos | Recuperación GPS México',
    template: '%s | SilentEye — Recuperación Vehicular GPS',
  },
  description:
    'Te roban el auto y en 3 segundos todos los conductores en 2 km reciben la alerta con tu ubicación GPS en vivo. Sin llamadas, sin centrales. Plataforma GPS para autos, motos, camiones, trailers y flotillas. Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack.',
  keywords: [
    // ── Spanish (MX) ──
    'plataforma GPS', 'rastreo GPS', 'rastreo vehicular', 'monitoreo GPS',
    'GPS en tiempo real', 'seguridad vehicular', 'rastreador GPS',
    'GPS para auto', 'GPS para camiones', 'GPS para trailers',
    'GPS para motos', 'GPS para flotillas', 'GPS para uber',
    'botón de pánico GPS', 'alerta GPS robo de auto',
    'sistema GPS antirrobo', 'geocercas GPS', 'recuperación vehicular GPS',
    'GPS Teltonika', 'GPS Queclink', 'GPS Concox', 'GPS Cobán', 'GPS Sinotrack',
    'GPS FMB920', 'GPS GT06N', 'GPS TK103',
    'localizador GPS para auto', 'localizador vehicular',
    'plataforma GPS México', 'rastreador vehicular México',
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
    title: 'SilentEye — Alerta de Robo Vehicular en 3 Segundos | Recuperación GPS México',
    description:
      'Te roban el auto y en 3 segundos todos los conductores en 2 km reciben la alerta con tu ubicación GPS en vivo. Plataforma GPS para autos, motos, camiones, trailers y flotillas. México.',
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
    title: 'SilentEye — Alerta de Robo Vehicular en 3 Segundos | GPS México',
    description:
      'Oprimes un botón y en 3 segundos todos los conductores en 2 km reciben la alerta con tu ubicación en vivo. Recuperación vehicular automática para autos, motos, camiones y flotillas.',
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
