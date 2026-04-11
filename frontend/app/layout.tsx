import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import WhatsAppButton from '@/components/WhatsAppButton';

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
        <WhatsAppButton />
      </body>
    </html>
  );
}
