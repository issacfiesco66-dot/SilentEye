import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

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
      <body className="bg-slate-950 text-slate-100 antialiased" style={{ minHeight: '100vh', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
