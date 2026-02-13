'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type LoginMode = 'driver' | 'admin' | 'citizen';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('citizen');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [imei, setImei] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const body = mode === 'driver'
        ? { imei: imei.trim() }
        : { phone: phone.trim(), mode: mode === 'citizen' ? 'citizen' : undefined };
      const identifier = mode === 'driver' ? imei.trim() : phone.trim();
      if (!identifier) {
        setError(mode === 'driver' ? 'Ingresa el número de GPS (IMEI)' : 'Ingresa tu teléfono');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar OTP');
      setStep('otp');
      if (data.code) {
        setCode(data.code);
      }
    } catch (e: unknown) {
      setError((e as Error).message || 'Error. ¿El backend está corriendo?');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!code.trim()) {
      setError('Ingresa el código');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = mode === 'driver'
        ? { imei: imei.trim(), code: code.trim() }
        : { phone: phone.trim(), code: code.trim(), name: name.trim() || undefined, mode: mode === 'citizen' ? 'citizen' : undefined };
      const res = await fetch(`${API}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('loginAt', String(Date.now()));
      router.replace(data.user?.role === 'citizen' ? '/sos' : '/dashboard');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('input');
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-white flex">

      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-zinc-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight mb-4">
            Seguridad vehicular<br />en tiempo real
          </h2>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-sm">
            Monitoreo GPS, botón de pánico y red de apoyo ciudadana. Todo desde tu navegador.
          </p>
        </div>

        <div className="relative space-y-4">
          <div className="flex items-center gap-3 text-[13px] text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Verificación OTP segura
          </div>
          <div className="flex items-center gap-3 text-[13px] text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8Z"/><circle cx="12" cy="10" r="3"/></svg>
            Tu ubicación solo se comparte en emergencias
          </div>
          <div className="flex items-center gap-3 text-[13px] text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
            Alertas en menos de 3 segundos
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900">SilentEye</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mb-1">Iniciar sesión</h1>
          <p className="text-[15px] text-zinc-400 mb-8">Elige tu tipo de acceso para continuar</p>

          {/* Mode tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-zinc-100 rounded-lg">
            <button
              onClick={() => { setMode('citizen'); resetForm(); }}
              className={`flex-1 py-2 rounded-md text-[13px] font-semibold transition-all ${mode === 'citizen' ? 'bg-white text-red-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              SOS
            </button>
            <button
              onClick={() => { setMode('driver'); resetForm(); }}
              className={`flex-1 py-2 rounded-md text-[13px] font-semibold transition-all ${mode === 'driver' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Conductor
            </button>
            <button
              onClick={() => { setMode('admin'); resetForm(); }}
              className={`flex-1 py-2 rounded-md text-[13px] font-semibold transition-all ${mode === 'admin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Admin
            </button>
          </div>

          {/* Form */}
          <div>
            {step === 'input' ? (
              <>
                {mode === 'citizen' && (
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-5 bg-red-50 border border-red-100 rounded-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                    <span className="text-[13px] text-red-600 font-medium">Botón de emergencia ciudadano</span>
                  </div>
                )}
                <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">
                  {mode === 'driver' ? 'Número de GPS (IMEI)' : 'Número de teléfono'}
                </label>
                <input
                  type={mode === 'driver' ? 'text' : 'tel'}
                  value={mode === 'driver' ? imei : phone}
                  onChange={(e) => mode === 'driver' ? setImei(e.target.value) : setPhone(e.target.value)}
                  placeholder={mode === 'driver' ? '353691846029642' : '+52 222 123 4567'}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all mb-1.5"
                />
                {mode === 'driver' && (
                  <p className="text-zinc-400 text-[12px] mb-4">
                    El GPS debe estar registrado por el administrador
                  </p>
                )}
                {mode !== 'driver' && <div className="mb-4" />}
                <button
                  onClick={requestOtp}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
                >
                  {loading ? 'Enviando...' : 'Enviar código de verificación'}
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-500 text-[13px] mb-4">
                  Código enviado a <span className="font-semibold text-zinc-700">{mode === 'driver' ? 'tu teléfono registrado' : phone}</span>
                </p>
                {code && (
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                    <span className="text-[13px] text-emerald-700 font-medium">Código generado &mdash; válido 10 min</span>
                  </div>
                )}
                <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Código OTP</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] font-mono tracking-widest focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all mb-4"
                />
                {(mode === 'admin' || mode === 'citizen') && (
                  <>
                    <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Nombre <span className="font-normal text-zinc-400">(opcional)</span></label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all mb-4"
                    />
                  </>
                )}
                <button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold disabled:opacity-40 transition-colors mb-3"
                >
                  {loading ? 'Verificando...' : 'Verificar código'}
                </button>
                <button
                  onClick={resetForm}
                  className="w-full text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors"
                >
                  ← Cambiar {mode === 'driver' ? 'IMEI' : 'teléfono'}
                </button>
              </>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span className="text-[13px] text-red-600">{error}</span>
              </div>
            )}
          </div>

          <p className="text-zinc-300 text-[12px] text-center mt-8">
            SOS: teléfono &middot; Conductor: IMEI del GPS &middot; Admin: teléfono
          </p>
        </div>
      </div>
    </div>
  );
}
