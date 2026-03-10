import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Botón de Pánico SOS — Emergencia Vehicular GPS en Tiempo Real',
  description:
    'Botón de emergencia SOS gratuito de SilentEye. Envía tu ubicación GPS a la red de apoyo cercana en menos de 3 segundos. Sin app, sin descargas. Alerta de pánico GPS para robo vehicular, asalto o emergencia.',
  keywords: [
    'botón de pánico GPS',
    'SOS GPS',
    'emergencia vehicular',
    'alerta de robo GPS',
    'pánico vehicular',
    'botón de emergencia GPS',
    'alerta SOS GPS',
  ],
  openGraph: {
    title: 'Botón de Pánico SOS — SilentEye',
    description: 'Envía tu ubicación GPS como alerta de emergencia a personas cercanas en menos de 3 segundos. Gratis y sin app.',
    url: 'https://silenteye.mx/sos',
  },
  alternates: {
    canonical: 'https://silenteye.mx/sos',
  },
};

export default function SOSLayout({ children }: { children: React.ReactNode }) {
  return children;
}
