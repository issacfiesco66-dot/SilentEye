'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async () => {
    if (!phone.trim()) {
      setError('Ingresa tu teléfono');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar OTP');
      setStep('otp');
      if (data.code) {
        setCode(data.code);
      }
    } catch (e: any) {
      setError(e?.message || 'Error. ¿El backend está corriendo en el puerto 3001?');
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
      const res = await fetch(`${API}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim(), name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('loginAt', String(Date.now()));
      router.replace('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-400">SilentEye</h1>
        <p className="text-slate-400 text-center mb-8">Seguridad vehicular</p>

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          {step === 'phone' ? (
            <>
              <label className="block text-sm text-slate-300 mb-2">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+51 999 999 999"
                className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
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
              <p className="text-slate-400 text-sm mb-2">Código enviado a {phone}</p>
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
              <label className="block text-sm text-slate-300 mb-2">Nombre (opcional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <button
                onClick={verifyOtp}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 mb-2"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              <button
                onClick={() => setStep('phone')}
                className="w-full text-slate-400 hover:text-white text-sm"
              >
                Cambiar teléfono
              </button>
            </>
          )}

          {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
        </div>

        <p className="text-slate-500 text-xs text-center mt-6">
          Con OTP_SHOW_IN_PROD activo, el código se rellena automáticamente.
        </p>
      </div>
    </div>
  );
}
