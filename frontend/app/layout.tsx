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
    'Plataforma GPS de seguridad vehicular con rastreo en tiempo real, alertas automáticas y botón de pánico. Compatible con GPS Teltonika, Queclink, Concox, Cobán y Sinotrack. Monitoreo GPS 24/7 para flotillas, vehículos particulares y transporte.',
  keywords: [
    'plataforma GPS',
    'rastreo GPS',
    'rastreo vehicular',
    'monitoreo GPS',
    'GPS en tiempo real',
    'seguridad vehicular',
    'rastreador GPS',
    'GPS para auto',
    'GPS para flotillas',
    'GPS Teltonika',
    'GPS Queclink',
    'GPS Concox',
    'GPS Cobán',
    'GPS Sinotrack',
    'GPS tracker México',
    'plataforma de rastreo GPS',
    'software GPS tracking',
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
    title: 'SilentEye — Plataforma GPS de Seguridad Vehicular | Rastreo en Tiempo Real',
    description:
      'Conecta tu GPS y convierte un simple rastreador en un sistema de respuesta inmediata. Detección de robo, alerta automática y coordinación — todo en menos de 3 segundos. Compatible con Teltonika, Queclink, Concox, Cobán y Sinotrack.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SilentEye — Plataforma GPS de Seguridad Vehicular con rastreo en tiempo real',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SilentEye — Plataforma GPS de Seguridad Vehicular',
    description:
      'Rastreo GPS en tiempo real, alertas automáticas y botón de pánico. Compatible con 5 marcas de GPS. Monitoreo 24/7 para flotillas y vehículos particulares.',
    images: ['/og-image.png'],
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
      </body>
    </html>
  );
}
