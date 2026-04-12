'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '@/lib/session';
import { useLocale } from '@/hooks/useLocale';

const API = '';

/** Login method — based on input type, NOT user role */
type LoginMethod = 'gps' | 'email' | 'imei' | 'phone';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const [method, setMethod] = useState<LoginMethod>('gps');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [imei, setImei] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const { t } = useLocale();

  const isEmailFlow = method === 'gps' || method === 'email';

  const loginWithPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError(t.login.errors.enterEmail); return; }
    if (!password) { setError(t.login.errors.enterPassword); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      saveSession(data.token, data.user);
      const dashType = data.user?.permissions?.dashboardType;
      router.replace(dashType === 'admin' ? '/admin' : dashType === 'sos' ? '/sos' : '/dashboard');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    setLoading(true);
    setError('');
    try {
      let body: Record<string, string | undefined>;
      if (method === 'imei') {
        body = { imei: imei.trim() };
      } else if (method === 'gps') {
        body = { email: email.trim().toLowerCase(), mode: 'gps' };
      } else if (method === 'email') {
        body = { email: email.trim().toLowerCase(), mode: 'citizen' };
      } else {
        body = { phone: phone.trim() };
      }
      const identifier = method === 'imei' ? imei.trim() : isEmailFlow ? email.trim() : phone.trim();
      if (!identifier) {
        setError(method === 'imei' ? t.login.errors.enterImei : isEmailFlow ? t.login.errors.enterEmail : t.login.errors.enterPhone);
        setLoading(false);
        return;
      }
      if (isEmailFlow) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setError(t.login.errors.enterEmailValid);
          setLoading(false);
          return;
        }
      }
      const res = await fetch(`${API}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar OTP');
      setStep('otp');
      if (data.code && !isEmailFlow) {
        setCode(data.code);
      }
      if (data.emailSent) setEmailSent(true);
      if (data.emailHint) setEmailHint(data.emailHint);
    } catch (e: unknown) {
      setError((e as Error).message || t.login.errors.backendDown);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!code.trim()) {
      setError(t.login.errors.enterCode);
      return;
    }
    if (isEmailFlow && !name.trim()) {
      setError(t.login.otp.nameRequired);
      return;
    }
    if (isEmailFlow && name.trim().length < 2) {
      setError(t.login.otp.nameTooShort);
      return;
    }
    setLoading(true);
    setError('');
    try {
      let body: Record<string, string | undefined>;
      if (method === 'imei') {
        body = { imei: imei.trim(), code: code.trim() };
      } else if (method === 'gps') {
        body = { email: email.trim().toLowerCase(), code: code.trim(), name: name.trim() || undefined, mode: 'gps' };
      } else if (method === 'email') {
        body = { email: email.trim().toLowerCase(), code: code.trim(), name: name.trim() || undefined, mode: 'citizen' };
      } else {
        body = { phone: phone.trim(), code: code.trim() };
      }
      const res = await fetch(`${API}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');
      saveSession(data.token, data.user);

      // GPS self-service: redirect to onboarding setup
      if (method === 'gps') {
        router.replace('/setup');
        return;
      }

      // Other methods: route based on backend-provided permissions
      const dashType = data.user?.permissions?.dashboardType;
      router.replace(dashType === 'sos' ? '/sos' : dashType === 'admin' ? '/admin' : '/dashboard');
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('input');
    setCode('');
    setPassword('');
    setError('');
    setEmailSent(false);
    setEmailHint('');
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
            {method === 'gps'
              ? <>{t.login.leftPanel.gpsTitle.split('\n')[0]}<br />{t.login.leftPanel.gpsTitle.split('\n')[1]}</>
              : <>{t.login.leftPanel.defaultTitle.split('\n')[0]}<br />{t.login.leftPanel.defaultTitle.split('\n')[1]}</>
            }
          </h2>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-sm">
            {method === 'gps'
              ? t.login.leftPanel.gpsDesc
              : t.login.leftPanel.defaultDesc
            }
          </p>
        </div>

        <div className="relative space-y-4">
          <div className="flex items-center gap-3 text-[13px] text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {t.login.leftPanel.secureOtp}
          </div>
          <div className="flex items-center gap-3 text-[13px] text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8Z"/><circle cx="12" cy="10" r="3"/></svg>
            {t.login.leftPanel.locationPrivacy}
          </div>
          <div className="flex items-center gap-3 text-[13px] text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
            {t.login.leftPanel.alertSpeed}
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

          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mb-1">
            {method === 'gps' ? t.login.titleGps : t.login.title}
          </h1>
          <p className="text-[15px] text-zinc-400 mb-8">
            {method === 'gps' ? t.login.subtitleGps : t.login.subtitle}
          </p>

          {/* Method tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-zinc-100 rounded-lg">
            <button
              onClick={() => { setMethod('gps'); resetForm(); }}
              className={`flex-1 py-2 rounded-md text-[13px] font-semibold transition-all ${method === 'gps' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t.login.tabGps}
            </button>
            <button
              onClick={() => { setMethod('email'); resetForm(); }}
              className={`flex-1 py-2 rounded-md text-[13px] font-semibold transition-all ${method === 'email' ? 'bg-white text-red-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t.login.tabSos}
            </button>
            <button
              onClick={() => { setMethod('imei'); resetForm(); }}
              className={`flex-1 py-2 rounded-md text-[13px] font-semibold transition-all ${method === 'imei' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t.login.tabImei}
            </button>
            <button
              onClick={() => { setMethod('phone'); resetForm(); }}
              className={`flex-1 py-2 rounded-md text-[13px] font-semibold transition-all ${method === 'phone' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t.login.tabPhone}
            </button>
          </div>

          {/* Form */}
          <div>
            {step === 'input' ? (
              <>
                {method === 'gps' && (
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg>
                      <span className="text-[13px] text-blue-600 font-medium">{t.login.gps.freeVehicle}</span>
                    </div>
                    <p className="text-[12px] text-zinc-400 px-1">{t.login.gps.enterEmail}</p>
                  </div>
                )}
                {method === 'email' && (
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                      <span className="text-[13px] text-red-600 font-medium">{t.login.sos.citizenButton}</span>
                    </div>
                    <p className="text-[12px] text-zinc-400 px-1">{t.login.sos.enterEmail}</p>
                  </div>
                )}
                {method === 'phone' && (
                  <div className="space-y-2 mb-5">
                    <p className="text-[12px] text-zinc-400 px-1">{t.login.phone.enterPhone}</p>
                  </div>
                )}
                <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">
                  {method === 'imei' ? t.login.imei.label : isEmailFlow ? t.common.email : t.common.phone}
                </label>
                <input
                  type={method === 'imei' ? 'text' : isEmailFlow ? 'email' : 'tel'}
                  value={method === 'imei' ? imei : isEmailFlow ? email : phone}
                  onChange={(e) => method === 'imei' ? setImei(e.target.value) : isEmailFlow ? setEmail(e.target.value) : setPhone(e.target.value)}
                  placeholder={method === 'imei' ? t.login.imei.placeholder : isEmailFlow ? 'tu@correo.com' : '+52 222 123 4567'}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all mb-1.5"
                />
                {method === 'imei' && (
                  <p className="text-zinc-400 text-[12px] mb-4">
                    {t.login.imei.registeredByAdmin}
                  </p>
                )}
                {method !== 'imei' && <div className="mb-4" />}
                <button
                  onClick={requestOtp}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-colors ${method === 'gps' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                >
                  {loading ? t.login.sending : method === 'gps' ? t.login.gps.registerFree : t.login.sendCode}
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-500 text-[13px] mb-4">
                  {isEmailFlow
                    ? <>{t.login.otp.codeSentTo} <span className="font-semibold text-zinc-700">{email}</span></>
                    : emailHint
                    ? <>{t.login.otp.codeSentEmail} <span className="font-semibold text-zinc-700">{emailHint}</span></>
                    : <>{t.login.otp.codeSentPhone} <span className="font-semibold text-zinc-700">{method === 'imei' ? t.login.otp.registeredContact : phone}</span></>
                  }
                </p>
                {emailSent && (
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <span className="text-[13px] text-blue-700 font-medium">{t.login.otp.emailCheckInbox}</span>
                  </div>
                )}
                {code && !isEmailFlow && (
                  <div className="flex items-center gap-2 px-3 py-2.5 mb-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
                    <span className="text-[13px] text-emerald-700 font-medium">{t.login.otp.codeGenerated}</span>
                  </div>
                )}
                <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">{t.login.otp.label}</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] font-mono tracking-widest focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all mb-4"
                />
                {isEmailFlow && (
                  <>
                    <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">{t.login.otp.nameLabel} <span className="text-red-500">*</span></label>
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
                  className={`w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-colors mb-3 ${method === 'gps' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                >
                  {loading ? t.login.otp.verifying : method === 'gps' ? t.login.gps.createAccount : t.login.otp.verify}
                </button>
                <button
                  onClick={resetForm}
                  className="w-full text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors"
                >
                  {method === 'imei' ? t.login.otp.changeImei : isEmailFlow ? t.login.otp.changeEmail : t.login.otp.changePhone}
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
            {t.login.help}
          </p>
        </div>
      </div>
    </div>
  );
}
