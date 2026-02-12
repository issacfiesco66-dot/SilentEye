'use client';

import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWebSocket } from '@/hooks/useWebSocket';
import { playAlarmSound, initAudioOnInteraction } from '@/utils/alarm';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type Status = 'idle' | 'locating' | 'sending' | 'sent' | 'error';

interface PanicResult {
  incidentId: string;
  nearbyCount: number;
}

interface IncomingAlert {
  incidentId: string;
  plate?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export default function SOSPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<PanicResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [incomingAlerts, setIncomingAlerts] = useState<IncomingAlert[]>([]);
  const watchRef = useRef<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const locationReportRef = useRef<NodeJS.Timeout | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Unlock audio on first user interaction (required by mobile browsers)
  useEffect(() => {
    initAudioOnInteraction();
  }, []);

  // Auth check
  useLayoutEffect(() => {
    try {
      const t = localStorage.getItem('token');
      const raw = localStorage.getItem('user');
      if (!t || !raw) {
        window.location.href = '/login';
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.id) {
        window.location.href = '/login';
        return;
      }
      setToken(t);
      setUserName(parsed.name || parsed.phone || '');
    } catch {
      window.location.href = '/login';
    }
  }, []);

  // Continuous geolocation — try high accuracy first, fallback to low
  useEffect(() => {
    if (!navigator.geolocation) return;

    const startWatch = (highAccuracy: boolean) => {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(newCoords);
          coordsRef.current = newCoords;
          setGpsAccuracy(Math.round(pos.coords.accuracy));
        },
        (err) => {
          if (highAccuracy && err.code !== 1) {
            startWatch(false);
          }
        },
        { enableHighAccuracy: highAccuracy, maximumAge: 10000, timeout: 15000 }
      );
    };
    startWatch(true);

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  // Report location to backend every 15 seconds so nearby detection works
  useEffect(() => {
    if (!token) return;

    const reportLocation = async () => {
      const c = coordsRef.current;
      if (!c) return;
      try {
        await fetch(`${API}/api/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude: c.lat, longitude: c.lng }),
        });
      } catch {
        // Silently ignore
      }
    };

    // Report immediately once coords are available
    const initialDelay = setTimeout(reportLocation, 2000);
    locationReportRef.current = setInterval(reportLocation, 15000);

    return () => {
      clearTimeout(initialDelay);
      if (locationReportRef.current) clearInterval(locationReportRef.current);
    };
  }, [token]);

  // WebSocket: receive panic alerts from other users
  useWebSocket({
    token,
    enabled: !!token,
    onMessage: useCallback((msg: { type: string; payload: unknown }) => {
      if (msg.type === 'panic' && msg.payload) {
        const p = msg.payload as { incidentId?: string; plate?: string; latitude?: number; longitude?: number; timestamp?: number };
        if (p.incidentId && typeof p.latitude === 'number') {
          const alert: IncomingAlert = {
            incidentId: p.incidentId,
            plate: p.plate,
            latitude: p.latitude,
            longitude: p.longitude ?? 0,
            timestamp: p.timestamp ?? Date.now(),
          };
          setIncomingAlerts((prev) => {
            if (prev.some((a) => a.incidentId === alert.incidentId)) return prev;
            return [alert, ...prev].slice(0, 10);
          });
          // Sound + vibrate to notify
          playAlarmSound();
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
        }
      }
    }, []),
  });

  const sendPanic = useCallback(async (lat: number, lng: number) => {
    if (!token) return;
    setStatus('sending');
    try {
      const res = await fetch(`${API}/api/panic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error || 'Error al enviar alerta');
        return;
      }
      setStatus('sent');
      setResult({ incidentId: data.incidentId, nearbyCount: data.nearbyCount });

      // Vibrate on success
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }

      // Cooldown: 30 seconds before allowing another panic
      setCountdown(30);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setStatus('idle');
            setResult(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      setStatus('error');
      setError('Sin conexión. Verifica tu internet.');
    }
  }, [token]);

  const handlePanic = useCallback(() => {
    if (status === 'sending' || status === 'locating' || countdown > 0) return;

    // Vibrate feedback
    if (navigator.vibrate) navigator.vibrate(100);

    if (coords) {
      sendPanic(coords.lat, coords.lng);
      return;
    }

    // No cached coords — request fresh
    setStatus('locating');
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Tu navegador no soporta geolocalización');
      return;
    }

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          setGpsAccuracy(Math.round(pos.coords.accuracy));
          sendPanic(lat, lng);
        },
        (err) => {
          if (highAccuracy && err.code !== 1) {
            // Retry without high accuracy
            tryGetPosition(false);
            return;
          }
          setStatus('error');
          if (err.code === 1) {
            setError('Permiso de ubicación denegado. Ve a Ajustes del navegador > Permisos > Ubicación y permite el acceso.');
          } else if (err.code === 2) {
            setError('No se pudo determinar tu ubicación. Asegúrate de estar al aire libre o cerca de una ventana.');
          } else {
            setError('Tiempo agotado obteniendo ubicación. Intenta de nuevo.');
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: 20000, maximumAge: 30000 }
      );
    };
    tryGetPosition(true);
  }, [status, coords, countdown, sendPanic]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginAt');
    router.replace('/login');
  };

  if (!token) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-slate-950/90 backdrop-blur-sm">
        <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
          ← Dashboard
        </Link>
        <span className="text-sm font-bold tracking-tight">SilentEye SOS</span>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm transition-colors">
          Salir
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden">
        {/* Background pulse effect when idle */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-80 rounded-full bg-red-500/5 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
        )}

        {/* Sent success pulse */}
        {status === 'sent' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-96 h-96 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
        )}

        {/* User greeting */}
        <p className="text-slate-400 text-sm mb-2">
          {userName ? `Hola, ${userName}` : 'SOS Móvil'}
        </p>

        {/* GPS status */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full ${coords ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-xs text-slate-500">
            {coords
              ? `GPS activo · ${gpsAccuracy ? `±${gpsAccuracy}m` : ''} · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
              : 'Obteniendo ubicación...'}
          </span>
        </div>

        {/* Panic button */}
        <button
          onClick={handlePanic}
          disabled={status === 'sending' || status === 'locating' || countdown > 0}
          className={`
            relative w-56 h-56 rounded-full font-bold text-2xl uppercase tracking-widest
            transition-all duration-300 select-none
            focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-slate-950
            ${status === 'idle'
              ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 hover:scale-105 active:scale-95 focus:ring-red-500/50'
              : status === 'locating' || status === 'sending'
              ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-2xl shadow-amber-500/30 animate-pulse cursor-wait'
              : status === 'sent'
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-2xl shadow-emerald-500/30'
              : 'bg-gradient-to-br from-slate-600 to-slate-800 text-slate-300 shadow-xl'
            }
          `}
        >
          {/* Outer ring animation */}
          {status === 'idle' && (
            <>
              <span className="absolute inset-0 rounded-full border-4 border-red-400/30 animate-ping" style={{ animationDuration: '2s' }} />
              <span className="absolute -inset-3 rounded-full border-2 border-red-500/20 animate-ping" style={{ animationDuration: '3s' }} />
            </>
          )}

          {status === 'idle' && <span>SOS</span>}
          {status === 'locating' && (
            <span className="text-lg">
              <span className="block text-3xl mb-1">📡</span>
              Ubicando...
            </span>
          )}
          {status === 'sending' && (
            <span className="text-lg">
              <span className="block text-3xl mb-1">📤</span>
              Enviando...
            </span>
          )}
          {status === 'sent' && (
            <span className="text-lg">
              <span className="block text-3xl mb-1">✓</span>
              Enviado
            </span>
          )}
          {status === 'error' && (
            <span className="text-base">
              <span className="block text-3xl mb-1">⚠️</span>
              Reintentar
            </span>
          )}
        </button>

        {/* Status messages */}
        <div className="mt-8 text-center min-h-[80px]">
          {status === 'idle' && (
            <p className="text-slate-400 text-sm max-w-xs">
              Presiona el botón para enviar una alerta de emergencia con tu ubicación
            </p>
          )}

          {status === 'sent' && result && (
            <div className="space-y-2">
              <p className="text-emerald-400 font-semibold">Alerta enviada correctamente</p>
              <p className="text-slate-400 text-sm">
                {result.nearbyCount > 0
                  ? `${result.nearbyCount} persona${result.nearbyCount > 1 ? 's' : ''} cercana${result.nearbyCount > 1 ? 's' : ''} notificada${result.nearbyCount > 1 ? 's' : ''}`
                  : 'Administradores notificados'}
              </p>
              {countdown > 0 && (
                <p className="text-slate-500 text-xs mt-2">
                  Puedes enviar otra alerta en {countdown}s
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <p className="text-red-400 font-semibold">{error}</p>
              <button
                onClick={() => { setStatus('idle'); setError(''); }}
                className="text-slate-400 hover:text-white text-sm underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {(status === 'locating' || status === 'sending') && (
            <p className="text-amber-400 text-sm animate-pulse">
              {status === 'locating' ? 'Obteniendo tu ubicación GPS...' : 'Enviando alerta de emergencia...'}
            </p>
          )}
        </div>
      </main>

      {/* Incoming alerts from nearby users */}
      {incomingAlerts.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider text-center">
            Alertas cercanas recibidas
          </p>
          {incomingAlerts.map((a) => (
            <div
              key={a.incidentId}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center animate-pulse"
              style={{ animationDuration: '2s' }}
            >
              <p className="text-red-300 font-semibold text-sm">
                Emergencia: {a.plate || 'SOS'}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)} · {new Date(a.timestamp).toLocaleTimeString('es-MX')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Footer info */}
      <footer className="px-6 py-4 border-t border-slate-800/50 text-center">
        <p className="text-slate-600 text-xs">
          Tu ubicación se comparte solo durante emergencias.
          Administradores y personas cercanas serán notificados.
        </p>
      </footer>
    </div>
  );
}
