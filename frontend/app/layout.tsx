import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'SilentEye - Seguridad Vehicular',
  description: 'Protege tu auto con monitoreo en tiempo real. Reduce el robo, respuesta inmediata ante emergencias.',
  icons: { icon: '/icon-192.png' },
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
