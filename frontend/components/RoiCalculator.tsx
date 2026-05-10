'use client';

/**
 * RoiCalculator — embeddable ROI calculator for fleet operators.
 *
 * Designed to convert fleet/trucking visitors by translating subscription
 * cost into "you only need to recover one stolen load to break even N times".
 * The default load value ($800K MXN) and incident rate (1.5%) are derived
 * from ANERPV-published industry numbers for Mexican freight.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';

const PERSONAL_PRICE_MXN = 99;
const FLEET_PRICE_MXN = 79;

function formatMxn(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RoiCalculator() {
  const [trucks, setTrucks] = useState<number>(10);
  const [loadValue, setLoadValue] = useState<number>(800_000);
  // ANERPV reports ~1.5% annual incident rate for cargo trucks in MX.
  const [incidentRate, setIncidentRate] = useState<number>(1.5);

  const result = useMemo(() => {
    const pricePerVehicle = trucks >= 4 ? FLEET_PRICE_MXN : PERSONAL_PRICE_MXN;
    const annualPlatformCost = pricePerVehicle * 12 * trucks;
    const expectedIncidentsPerYear = (trucks * incidentRate) / 100;
    const expectedAnnualLoss = expectedIncidentsPerYear * loadValue;
    const breakEvenPercent =
      annualPlatformCost > 0 && expectedAnnualLoss > 0
        ? (annualPlatformCost / expectedAnnualLoss) * 100
        : 0;
    const roiIfRecoverOne =
      annualPlatformCost > 0 ? loadValue / annualPlatformCost : 0;
    return {
      pricePerVehicle,
      annualPlatformCost,
      expectedIncidentsPerYear,
      expectedAnnualLoss,
      breakEvenPercent,
      roiIfRecoverOne,
    };
  }, [trucks, loadValue, incidentRate]);

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 md:p-10">
      <div className="mb-6">
        <p className="text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-2">
          Calculadora de retorno
        </p>
        <h3 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">
          ¿Cuánto pierdes al año si NO usas rastreo satelital?
        </h3>
        <p className="text-[14px] text-zinc-500 mt-2">
          Cifras basadas en estadísticas de robo de carga ANERPV (1.5% anual de
          incidencia en México). Ajusta los valores a tu operación.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <label className="block">
          <span className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Número de unidades
          </span>
          <input
            type="number"
            min={1}
            max={1000}
            value={trucks}
            onChange={(e) =>
              setTrucks(Math.max(1, Math.min(1000, Number(e.target.value) || 0)))
            }
            className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-lg font-bold text-zinc-900 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Valor promedio de carga (MXN)
          </span>
          <input
            type="number"
            min={10000}
            max={10_000_000}
            step={50000}
            value={loadValue}
            onChange={(e) =>
              setLoadValue(
                Math.max(10000, Math.min(10_000_000, Number(e.target.value) || 0))
              )
            }
            className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-lg font-bold text-zinc-900 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Tasa de robo anual (%)
          </span>
          <input
            type="number"
            min={0.1}
            max={20}
            step={0.1}
            value={incidentRate}
            onChange={(e) =>
              setIncidentRate(
                Math.max(0.1, Math.min(20, Number(e.target.value) || 0))
              )
            }
            className="w-full rounded-lg border-2 border-zinc-200 px-4 py-3 text-lg font-bold text-zinc-900 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-red-50 border-2 border-red-200 p-5">
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
            Pérdida estimada SIN rastreo satelital
          </p>
          <p className="text-3xl md:text-4xl font-extrabold text-red-700">
            {formatMxn(result.expectedAnnualLoss)}
          </p>
          <p className="text-[12px] text-red-600 mt-1">
            ≈ {result.expectedIncidentsPerYear.toFixed(2)} robo(s) al año × valor
            de carga
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-5">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
            Costo SilentEye (12 meses)
          </p>
          <p className="text-3xl md:text-4xl font-extrabold text-emerald-700">
            {formatMxn(result.annualPlatformCost)}
          </p>
          <p className="text-[12px] text-emerald-600 mt-1">
            ${result.pricePerVehicle} MXN/mes × {trucks} unidades × 12 meses
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900 text-white p-6 mb-6">
        <p className="text-[12px] font-bold text-blue-300 uppercase tracking-wider mb-2">
          Retorno si recuperas UNA sola carga al año
        </p>
        <p className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {result.roiIfRecoverOne >= 1
            ? `${result.roiIfRecoverOne.toFixed(1)}×`
            : '—'}
        </p>
        <p className="text-[13px] text-zinc-400 mt-2 leading-relaxed">
          Recuperar 1 carga de {formatMxn(loadValue)} paga{' '}
          {result.roiIfRecoverOne.toFixed(1)} años de plataforma. El break-even
          ocurre cuando recuperas{' '}
          <span className="font-bold text-white">
            {result.breakEvenPercent.toFixed(1)}%
          </span>{' '}
          del valor en riesgo.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/cotizar-flota"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Cotizar mi flota
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
        <a
          href={`https://wa.me/525610669353?text=${encodeURIComponent(
            `Hola, tengo ${trucks} unidades y me interesa SilentEye. ¿Pueden enviarme una cotización?`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border-2 border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
            <path d="M16.004 2.002c-7.732 0-14.002 6.27-14.002 14.002 0 2.468.654 4.876 1.896 6.992L2 30l7.193-1.864A13.94 13.94 0 0 0 16.004 30c7.732 0 14.002-6.27 14.002-14.002-.004-7.728-6.274-13.996-14.002-13.996Z" />
          </svg>
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
