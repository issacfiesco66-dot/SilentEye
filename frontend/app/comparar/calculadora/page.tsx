import type { Metadata } from 'next';
import JsonLd, { getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';
import CalculadoraClient from './CalculadoraClient';

export const metadata: Metadata = {
  title: 'Calculadora: ¿cuánto ahorras vs Hunter, LoJack o Skyguard? | SilentEye',
  description:
    'Calcula cuánto te ahorras al año cambiando de Hunter, LoJack o Skyguard a SilentEye. Personal $99 MXN/mes, Flotillas $79 MXN/mes. Sin contrato, sin permanencia.',
  alternates: { canonical: 'https://silenteye.mx/comparar/calculadora' },
  openGraph: {
    type: 'website',
    title: 'Calculadora de ahorro SilentEye vs Hunter, LoJack, Skyguard',
    description:
      'Cuánto te ahorras al cambiar de Hunter, LoJack o Skyguard a SilentEye — calculadora interactiva.',
    url: 'https://silenteye.mx/comparar/calculadora',
  },
};

export default function CalculadoraPage() {
  return (
    <>
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Comparar', url: 'https://silenteye.mx/comparar' },
        { name: 'Calculadora de ahorro', url: 'https://silenteye.mx/comparar/calculadora' },
      ])} />
      <JsonLd data={getWebPageJsonLd({
        name: 'Calculadora de ahorro vs Hunter, LoJack y Skyguard',
        description:
          'Calcula cuánto ahorras al año cambiando de Hunter, LoJack o Skyguard a SilentEye.',
        url: 'https://silenteye.mx/comparar/calculadora',
      })} />
      <CalculadoraClient />
    </>
  );
}
