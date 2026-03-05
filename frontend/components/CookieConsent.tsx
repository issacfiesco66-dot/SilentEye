'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_NAME = 'se_cookie_consent';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 86400}; SameSite=Lax${secure}`;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookie(COOKIE_NAME);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    setCookie(COOKIE_NAME, 'accepted', 365);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto bg-zinc-900 text-white rounded-2xl shadow-2xl shadow-black/20 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-relaxed text-zinc-300">
            Usamos cookies esenciales para mantener tu sesión activa. No usamos rastreadores ni publicidad.{' '}
            <Link href="/cookies" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium">
              Más info
            </Link>
          </p>
        </div>
        <button
          onClick={accept}
          className="flex-shrink-0 px-5 py-2 rounded-lg bg-white text-zinc-900 text-[13px] font-semibold hover:bg-zinc-100 active:scale-95 transition-all"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
