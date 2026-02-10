'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type LoginMode = 'driver' | 'admin';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('driver');
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
        : { phone: phone.trim() };
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
        : { phone: phone.trim(), code: code.trim(), name: name.trim() || undefined };
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
      router.replace('/dashboard');
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-400">SilentEye</h1>
        <p className="text-slate-400 text-center mb-8">Seguridad vehicular</p>

        <div className="flex gap-2 mb-4 p-1 bg-slate-800 rounded-lg">
          <button
            onClick={() => { setMode('driver'); resetForm(); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${mode === 'driver' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Conductor
          </button>
          <button
            onClick={() => { setMode('admin'); resetForm(); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${mode === 'admin' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Administrador
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          {step === 'input' ? (
            <>
              <label className="block text-sm text-slate-300 mb-2">
                {mode === 'driver' ? 'Número de GPS (IMEI)' : 'Teléfono'}
              </label>
              <input
                type={mode === 'driver' ? 'text' : 'tel'}
                value={mode === 'driver' ? imei : phone}
                onChange={(e) => mode === 'driver' ? setImei(e.target.value) : setPhone(e.target.value)}
                placeholder={mode === 'driver' ? '353691846029642' : '+51 999 999 999'}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              {mode === 'driver' && (
                <p className="text-slate-500 text-xs mb-4">
                  El GPS debe estar registrado por el administrador
                </p>
              )}
              <button
                onClick={requestOtp}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-2">
                Código enviado a {mode === 'driver' ? 'tu teléfono registrado' : phone}
              </p>
              {code && (
                <p className="text-emerald-400 text-sm mb-2">
                  Código generado (válido 10 min)
                </p>
              )}
              <label className="block text-sm text-slate-300 mb-2">Código OTP</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 mb-4"
              />
              {mode === 'admin' && (
                <>
                  <label className="block text-sm text-slate-300 mb-2">Nombre (opcional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 mb-4"
                  />
                </>
              )}
              <button
                onClick={verifyOtp}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 mb-2"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              <button
                onClick={resetForm}
                className="w-full text-slate-400 hover:text-white text-sm"
              >
                Cambiar {mode === 'driver' ? 'IMEI' : 'teléfono'}
              </button>
            </>
          )}

          {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
        </div>

        <p className="text-slate-500 text-xs text-center mt-6">
          Conductor: ingresa el IMEI del GPS asignado. Admin: usa tu teléfono.
        </p>
      </div>
    </div>
  );
}
