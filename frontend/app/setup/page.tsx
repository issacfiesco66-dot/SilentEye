'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/session';

const API = '';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'add-vehicle' | 'configure' | 'done'>('add-vehicle');
  const [plate, setPlate] = useState('');
  const [imei, setImei] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planInfo, setPlanInfo] = useState<{ plan: string; limit: number; current: number; canAdd: boolean } | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace('/login'); return; }
    // Check plan info
    fetch(`${API}/api/me/plan`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => r.json())
      .then(data => {
        setPlanInfo(data);
        // If user already has a vehicle, skip to dashboard
        if (data.current > 0) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  const addVehicle = async () => {
    if (!plate.trim()) { setError('Ingresa la placa de tu vehículo'); return; }
    if (!imei.trim()) { setError('Ingresa el IMEI de tu GPS'); return; }
    if (!/^\d{15}$/.test(imei.trim())) { setError('El IMEI debe ser exactamente 15 dígitos numéricos'); return; }
    setLoading(true);
    setError('');
    try {
      const session = getSession();
      if (!session) { router.replace('/login'); return; }
      const res = await fetch(`${API}/api/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ plate: plate.trim().toUpperCase(), imei: imei.trim(), name: vehicleName.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'plan_limit') {
          setError('Ya alcanzaste el límite de tu plan. Mejora tu plan para agregar más vehículos.');
        } else {
          throw new Error(data.error || 'Error al agregar vehículo');
        }
        return;
      }
      setStep('configure');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </Link>
          <span className="text-[13px] text-zinc-400 font-medium">Configuración inicial</span>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-16">
        {/* Progress steps */}
        <div className="flex items-center gap-3 mb-12">
          {['Registra tu vehículo', 'Configura tu GPS', 'Listo'].map((label, i) => {
            const stepIndex = i;
            const currentIndex = step === 'add-vehicle' ? 0 : step === 'configure' ? 1 : 2;
            const isActive = stepIndex === currentIndex;
            const isDone = stepIndex < currentIndex;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  {isDone ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg> : i + 1}
                </div>
                <span className={`text-[12px] font-medium hidden sm:block ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>{label}</span>
                {i < 2 && <div className={`flex-1 h-px ${isDone ? 'bg-emerald-300' : 'bg-zinc-200'}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Add vehicle */}
        {step === 'add-vehicle' && (
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mb-2">Registra tu vehículo</h1>
            <p className="text-zinc-500 text-[15px] mb-8">Ingresa la placa y el número IMEI de tu GPS. Solo toma 1 minuto.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Placa del vehículo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="Ej: ABC-1234"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">IMEI del GPS <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={imei}
                  onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="15 dígitos — está en la etiqueta de tu GPS"
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] font-mono tracking-wide focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                />
                <p className="text-[12px] text-zinc-400 mt-1">Búscalo en la etiqueta del GPS, la caja del dispositivo, o enviando &quot;IMEI&quot; por SMS al chip del GPS.</p>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Nombre del vehículo <span className="text-zinc-400 font-normal">(opcional)</span></label>
                <input
                  type="text"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="Ej: Mi Jetta, Camioneta trabajo"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span className="text-[13px] text-red-600">{error}</span>
              </div>
            )}

            <button
              onClick={addVehicle}
              disabled={loading}
              className="w-full mt-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {loading ? 'Registrando...' : 'Registrar vehículo'}
            </button>

            <p className="text-center text-[12px] text-zinc-400 mt-4">
              {planInfo ? `Plan ${planInfo.plan}: ${planInfo.current}/${planInfo.limit} vehículos` : 'Plan gratuito: 1 vehículo incluido'}
            </p>
          </div>
        )}

        {/* Step 2: Configure GPS */}
        {step === 'configure' && (
          <div>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg mb-6">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
              <span className="text-[13px] text-emerald-700 font-medium">Vehículo registrado correctamente</span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mb-2">Configura tu GPS</h1>
            <p className="text-zinc-500 text-[15px] mb-8">Apunta tu GPS al servidor de SilentEye. Solo necesitas cambiar la dirección IP y el puerto.</p>

            {/* Server config */}
            <div className="bg-zinc-900 text-white rounded-xl p-6 mb-6">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Servidor SilentEye</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-400">IP / Host</span>
                  <code className="text-[15px] font-mono text-emerald-400 font-bold select-all">gps.silenteye.mx</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-400">Puerto</span>
                  <code className="text-[15px] font-mono text-emerald-400 font-bold select-all">5000</code>
                </div>
              </div>
            </div>

            {/* Instructions by brand */}
            <div className="space-y-3 mb-8">
              <p className="text-[13px] font-semibold text-zinc-700">Cómo configurar según tu marca de GPS:</p>
              {[
                { brand: 'Cobán / Sinotrack', cmd: 'Envía por SMS al chip del GPS:', sms: 'APN,tu-apn#\nSERVER,1,gps.silenteye.mx,5000,0#', note: 'Reemplaza "tu-apn" con el APN de tu operador (ej: internet.itelcel.com para Telcel)' },
                { brand: 'Concox (GT06N, WeTrack2)', cmd: 'Envía por SMS al chip del GPS:', sms: 'SERVER,1,gps.silenteye.mx,5000,0#', note: 'Algunos modelos usan la app o plataforma web del fabricante para cambiar el servidor' },
                { brand: 'Teltonika (FMB920, FMC130)', cmd: 'Desde Teltonika Configurator:', sms: 'GPRS → Server Settings:\nDomain: gps.silenteye.mx\nPort: 5000\nProtocol: TCP', note: 'Necesitas cable USB y el software Teltonika Configurator' },
                { brand: 'Queclink (GL300, GV300)', cmd: 'Envía por SMS al chip del GPS:', sms: 'AT+GTSVR=gl300,1,gps.silenteye.mx,5000,,,,,FFFF$', note: 'El password por defecto es "gl300" o "gv300" según el modelo' },
              ].map((brand, i) => (
                <details key={i} className="group border border-zinc-200 rounded-lg overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-[14px] font-semibold text-zinc-900 hover:bg-zinc-50 transition-colors">
                    {brand.brand}
                    <svg className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-45 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  </summary>
                  <div className="px-4 pb-4 border-t border-zinc-100">
                    <p className="text-[12px] text-zinc-500 mt-3 mb-2">{brand.cmd}</p>
                    <pre className="bg-zinc-50 rounded-lg px-3 py-2 text-[12px] font-mono text-zinc-700 whitespace-pre-wrap select-all">{brand.sms}</pre>
                    <p className="text-[11px] text-amber-600 mt-2">* {brand.note}</p>
                  </div>
                </details>
              ))}
            </div>

            <button
              onClick={() => setStep('done')}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              Ya configuré mi GPS
            </button>
            <button
              onClick={() => setStep('done')}
              className="w-full mt-2 text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors py-2"
            >
              Configurar después →
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mb-2">Todo listo</h1>
            <p className="text-zinc-500 text-[15px] mb-8 max-w-sm mx-auto">
              Tu vehículo está registrado. Cuando tu GPS se conecte al servidor, lo verás en el mapa en tiempo real.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Ir al dashboard
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>

            <div className="mt-12 bg-zinc-50 border border-zinc-200 rounded-xl p-6 text-left">
              <p className="text-[13px] font-bold text-zinc-700 mb-3">¿Tu GPS aún no aparece?</p>
              <ul className="space-y-2 text-[13px] text-zinc-500">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">1.</span>
                  Verifica que el chip SIM del GPS tenga saldo y datos móviles activos
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">2.</span>
                  Confirma que el servidor apunte a <code className="font-mono text-blue-600">gps.silenteye.mx:5000</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">3.</span>
                  Reinicia el GPS (desconecta y reconecta la alimentación)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">4.</span>
                  Espera 2-5 minutos para que el GPS envíe su primera señal
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
