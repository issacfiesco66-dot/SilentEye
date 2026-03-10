import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión — Plataforma GPS de Rastreo Vehicular',
  description:
    'Accede a tu plataforma GPS de rastreo vehicular SilentEye. Monitorea tus vehículos en tiempo real, gestiona flotillas GPS y recibe alertas de seguridad. Ingresa con teléfono, email o IMEI de tu rastreador GPS.',
  openGraph: {
    title: 'Iniciar Sesión — SilentEye Plataforma GPS',
    description: 'Accede a tu panel GPS de rastreo vehicular en tiempo real. Monitoreo GPS 24/7 para flotillas y vehículos particulares.',
    url: 'https://silenteye.mx/login',
  },
  alternates: {
    canonical: 'https://silenteye.mx/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
