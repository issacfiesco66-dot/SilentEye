'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type UseCase = 'personal' | 'flotilla';
type Competitor = 'hunter' | 'lojack' | 'skyguard' | 'otro';

const COMPETITOR_DEFAULT_PRICE: Record<Competitor, number> = {
  hunter: 300,
  lojack: 250,
  skyguard: 280,
  otro: 250,
};

const COMPETITOR_LABEL: Record<Competitor, string> = {
  hunter: 'Hunter (Skyangel)',
  lojack: 'LoJack',
  skyguard: 'Skyguard',
  otro: 'Otro proveedor',
};

const SILENTEYE_PERSONAL = 99;
const SILENTEYE_FLOTILLA = 79;
// One-time GPS hardware cost reference (Cobán TK103 / Sinotrack ST-901 range)
const GPS_HARDWARE_COST = 450;

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)));
}

export default function CalculadoraClient() {
  const [useCase, setUseCase] = useState<UseCase>('personal');
  const [competitor, setCompetitor] = useState<Competitor>('hunter');
  const [vehicles, setVehicles] = useState<number>(1);
  const [currentMonthly, setCurrentMonthly] = useState<number>(COMPETITOR_DEFAULT_PRICE.hunter);

  function selectCompetitor(c: Competitor) {
    setCompetitor(c);
    setCurrentMonthly(COMPETITOR_DEFAULT_PRICE[c]);
  }

  function selectUseCase(u: UseCase) {
    setUseCase(u);
    if (u === 'personal' && vehicles > 3) setVehicles(1);
    if (u === 'flotilla' && vehicles < 4) setVehicles(5);
  }

  const calc = useMemo(() => {
    const silenteyeRate = useCase === 'flotilla' ? SILENTEYE_FLOTILLA : SILENTEYE_PERSONAL;
    const safeVehicles = Math.max(1, Math.min(500, vehicles));
    const safeCurrent = Math.max(0, Math.min(2000, currentMonthly));

    const monthlyCurrentTotal = safeCurrent * safeVehicles;
    const monthlySilenteyeTotal = silenteyeRate * safeVehicles;
    const monthlySavings = Math.max(0, monthlyCurrentTotal - monthlySilenteyeTotal);
    const annualSavings = monthlySavings * 12;
    const threeYearSavings = monthlySavings * 36;

    const totalGpsCost = GPS_HARDWARE_COST * safeVehicles;
    const paybackMonths = monthlySavings > 0 ? Math.ceil(totalGpsCost / monthlySavings) : null;

    const isCheaper = monthlySilenteyeTotal < monthlyCurrentTotal;
    const savingsPercent = monthlyCurrentTotal > 0
      ? Math.round((monthlySavings / monthlyCurrentTotal) * 100)
      : 0;

    return {
      silenteyeRate,
      monthlyCurrentTotal,
      monthlySilenteyeTotal,
      monthlySavings,
      annualSavings,
      threeYearSavings,
      totalGpsCost,
      paybackMonths,
      isCheaper,
      savingsPercent,
    };
  }, [useCase, vehicles, currentMonthly]);

  const whatsappMessage = encodeURIComponent(
    `Hola, vi la calculadora de SilentEye. Tengo ${vehicles} ${vehicles === 1 ? 'vehículo' : 'vehículos'} ` +
    `con ${COMPETITOR_LABEL[competitor]} ($${currentMonthly}/mes c/u). ` +
    `Me interesa el plan ${useCase === 'flotilla' ? 'Flotillas' : 'Personal'}.`
  );

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/comparar" className="hidden sm:inline-flex text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              ← Comparativas
            </Link>
            <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 pt-12 pb-8 md:pt-20 md:pb-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Calculadora de ahorro</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
            ¿Cuánto te ahorras cambiando a SilentEye?
          </h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto">
            Calcula tu ahorro real vs Hunter, LoJack o Skyguard. Sin contratos, sin permanencia.
          </p>
        </div>
      </header>

      {/* Calculator */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="bg-white rounded-2xl border-2 border-zinc-200 p-8 space-y-8">
            <div>
              <label className="block text-[13px] font-bold text-zinc-900 mb-3 uppercase tracking-wider">
                Tipo de uso
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['personal', 'flotilla'] as UseCase[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => selectUseCase(u)}
                    className={`py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
                      useCase === u
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {u === 'personal' ? 'Personal (1-3)' : 'Flotilla (4+)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-zinc-900 mb-3 uppercase tracking-wider">
                Proveedor actual
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['hunter', 'lojack', 'skyguard', 'otro'] as Competitor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => selectCompetitor(c)}
                    className={`py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
                      competitor === c
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {COMPETITOR_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="vehicles" className="block text-[13px] font-bold text-zinc-900 mb-3 uppercase tracking-wider">
                Cantidad de vehículos
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVehicles(Math.max(1, vehicles - 1))}
                  className="w-10 h-10 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-lg transition-colors"
                  aria-label="Disminuir vehículos"
                >
                  −
                </button>
                <input
                  id="vehicles"
                  type="number"
                  min={1}
                  max={500}
                  value={vehicles}
                  onChange={(e) => setVehicles(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center text-2xl font-extrabold text-zinc-900 bg-zinc-50 border-2 border-zinc-200 rounded-lg py-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setVehicles(Math.min(500, vehicles + 1))}
                  className="w-10 h-10 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-lg transition-colors"
                  aria-label="Aumentar vehículos"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="currentMonthly" className="block text-[13px] font-bold text-zinc-900 mb-3 uppercase tracking-wider">
                Pago actual al mes <span className="text-zinc-400 font-normal normal-case">(por vehículo)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">$</span>
                <input
                  id="currentMonthly"
                  type="number"
                  min={0}
                  max={2000}
                  step={10}
                  value={currentMonthly}
                  onChange={(e) => setCurrentMonthly(Math.max(0, Math.min(2000, parseInt(e.target.value) || 0)))}
                  className="w-full pl-9 pr-16 py-3 text-lg font-bold text-zinc-900 bg-zinc-50 border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">MXN</span>
              </div>
              <input
                type="range"
                min={50}
                max={800}
                step={10}
                value={currentMonthly}
                onChange={(e) => setCurrentMonthly(parseInt(e.target.value))}
                className="w-full mt-3 accent-blue-600"
                aria-label="Slider de pago mensual actual"
              />
              <div className="flex justify-between text-[11px] text-zinc-400 mt-1 font-mono">
                <span>$50</span>
                <span>$800</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-5">
            <div className={`rounded-2xl p-8 ${calc.isCheaper ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' : 'bg-zinc-100 text-zinc-900'}`}>
              <p className={`text-[12px] font-bold uppercase tracking-wider mb-2 ${calc.isCheaper ? 'text-blue-100' : 'text-zinc-500'}`}>
                Ahorro mensual total
              </p>
              <p className="text-5xl md:text-6xl font-extrabold tracking-tight">
                {formatMXN(calc.monthlySavings)}
              </p>
              {calc.isCheaper && calc.savingsPercent > 0 && (
                <p className="text-[14px] text-blue-100 mt-2">
                  Eso es {calc.savingsPercent}% menos de lo que pagas hoy
                </p>
              )}
              {!calc.isCheaper && (
                <p className="text-[14px] text-zinc-600 mt-2">
                  Estás pagando un precio competitivo. SilentEye sigue ofreciendo features que tu plan actual probablemente no tiene (red ciudadana, sin app, multi-marca).
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border-2 border-zinc-200 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Al año</p>
                <p className="text-2xl font-extrabold text-zinc-900">{formatMXN(calc.annualSavings)}</p>
              </div>
              <div className="bg-white rounded-xl border-2 border-zinc-200 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">A 3 años</p>
                <p className="text-2xl font-extrabold text-zinc-900">{formatMXN(calc.threeYearSavings)}</p>
              </div>
            </div>

            <div className="bg-zinc-900 text-white rounded-xl p-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Comparación lado a lado</p>
              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-700">
                  <span className="text-zinc-400">{COMPETITOR_LABEL[competitor]}</span>
                  <span className="font-mono font-bold">{formatMXN(calc.monthlyCurrentTotal)}<span className="text-zinc-500 text-[12px] font-normal">/mes</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-400">SilentEye {useCase === 'flotilla' ? 'Flotillas' : 'Personal'}</span>
                  <span className="font-mono font-bold text-blue-400">{formatMXN(calc.monthlySilenteyeTotal)}<span className="text-zinc-500 text-[12px] font-normal">/mes</span></span>
                </div>
              </div>
            </div>

            {calc.paybackMonths !== null && calc.isCheaper && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/><path d="m17 7-3 3M7 17l3-3M17 17l-3-3M7 7l3 3"/></svg>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-[14px] mb-1">
                      Recuperas la inversión del GPS en {calc.paybackMonths} {calc.paybackMonths === 1 ? 'mes' : 'meses'}
                    </p>
                    <p className="text-[13px] text-zinc-600 leading-relaxed">
                      El GPS cuesta una sola vez ~$450 MXN por vehículo (Cobán TK103 o Sinotrack ST-901). Con tu ahorro mensual, lo pagas en {calc.paybackMonths} {calc.paybackMonths === 1 ? 'mes' : 'meses'} y todo lo que sigue es ganancia.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Crear cuenta gratis
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <a
                href={`https://wa.me/525610669353?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#25D366] rounded-lg hover:bg-[#20bd5a] transition-colors"
              >
                <svg viewBox="0 0 32 32" width="16" height="16" fill="#fff"><path d="M16.004 2.002c-7.732 0-14.002 6.27-14.002 14.002 0 2.468.654 4.876 1.896 6.992L2 30l7.193-1.864A13.94 13.94 0 0 0 16.004 30c7.732 0 14.002-6.27 14.002-14.002-.004-7.728-6.274-13.996-14.002-13.996Zm0 25.6a11.6 11.6 0 0 1-5.918-1.624l-.424-.252-4.4 1.154 1.174-4.293-.277-.44a11.562 11.562 0 0 1-1.775-6.145c0-6.408 5.216-11.62 11.624-11.62 6.404 0 11.616 5.212 11.616 11.62-.004 6.408-5.216 11.6-11.62 11.6Zm6.372-8.7c-.348-.176-2.068-1.02-2.388-1.136-.32-.12-.552-.176-.784.176-.232.348-.9 1.136-1.104 1.368-.204.232-.408.26-.756.088-.348-.176-1.472-.544-2.804-1.732-1.036-.924-1.736-2.064-1.94-2.412-.204-.348-.02-.536.152-.712.156-.156.348-.408.524-.612.176-.204.232-.348.348-.58.116-.232.06-.436-.028-.612-.088-.176-.784-1.892-1.076-2.588-.284-.68-.572-.588-.784-.6-.204-.008-.436-.012-.668-.012s-.612.088-.932.436c-.32.348-1.22 1.192-1.22 2.908s1.248 3.372 1.424 3.604c.176.232 2.46 3.752 5.96 5.264.832.36 1.484.576 1.992.736.836.268 1.6.232 2.2.14.672-.1 2.068-.844 2.36-1.66.292-.82.292-1.52.204-1.664-.088-.148-.32-.232-.668-.408Z"/></svg>
                Hablar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 text-[13px] text-zinc-500 leading-relaxed">
            <p className="mb-2 font-semibold text-zinc-700">Sobre los precios estimados</p>
            <p>
              Los rangos de pago de Hunter, LoJack y Skyguard son estimaciones basadas en información pública y reportes de usuarios; tu factura real puede variar según contrato, hardware incluido, descuentos por permanencia y servicios adicionales. SilentEye publica precios planos: $99 MXN/mes (Personal) y $79 MXN/mes (Flotillas, 4+ vehículos), sin contrato ni permanencia. El costo del GPS hardware es referencial (Cobán TK103 / Sinotrack ST-901, ~$400-500 MXN una vez).
            </p>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">Comparativa detallada</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/comparar/silenteye-vs-hunter" className="border border-zinc-200 rounded-lg px-4 py-3 hover:border-blue-500 transition-colors">
              <span className="text-[13px] font-semibold text-zinc-900">vs Hunter</span>
            </Link>
            <Link href="/comparar/silenteye-vs-lojack" className="border border-zinc-200 rounded-lg px-4 py-3 hover:border-blue-500 transition-colors">
              <span className="text-[13px] font-semibold text-zinc-900">vs LoJack</span>
            </Link>
            <Link href="/comparar/silenteye-vs-skyguard" className="border border-zinc-200 rounded-lg px-4 py-3 hover:border-blue-500 transition-colors">
              <span className="text-[13px] font-semibold text-zinc-900">vs Skyguard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold">SilentEye</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] text-zinc-400">
            <Link href="/comparar" className="hover:text-zinc-600">Comparar</Link>
            <Link href="/precios" className="hover:text-zinc-600">Precios</Link>
            <Link href="/blog" className="hover:text-zinc-600">Blog</Link>
            <span className="text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
