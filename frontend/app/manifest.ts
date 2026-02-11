import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SilentEye - Seguridad Vehicular',
    short_name: 'SilentEye',
    description: 'Plataforma de seguridad vehicular con GPS y botón de pánico',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1e40af',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-192.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
