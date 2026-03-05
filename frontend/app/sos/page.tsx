'use client';
/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from '@/hooks/useSession';
import { useWebSocket } from '@/hooks/useWebSocket';
import { playAlarmSound, initAudioOnInteraction } from '@/lib/alarm';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { clearSession } from '@/lib/session';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs">
      Cargando mapa…
    </div>
  ),
});

const API = '';

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
  vehicleId?: string;
  imei?: string;
  source?: string;
}

interface LiveVehicle {
  vehicleId?: string;
  imei?: string;
  plate?: string;
  latitude: number;
  longitude: number;
  speed?: number;
}

export default function SOSPage() {
  const router = useRouter();
  const { token, user: sessionUser, ready: authReady, logout } = useSession();

  usePushNotifications(token);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<PanicResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [incomingAlerts, setIncomingAlerts] = useState<IncomingAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [trackingIncident, setTrackingIncident] = useState<string | null>(null);
  const [liveVehicles, setLiveVehicles] = useState<LiveVehicle[]>([]);
  const watchRef = useRef<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const locationReportRef = useRef<NodeJS.Timeout | null>(null);
  const wsLocationRef = useRef<NodeJS.Timeout | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Unlock audio on first user interaction (required by mobile browsers)
  useEffect(() => {
    initAudioOnInteraction();
  }, []);

  // Read ?incident=XXX from URL (push notification click) and auto-select it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const incidentId = params.get('incident');
    if (!incidentId) return;
    const t = token;
    if (!t) return;

    // Fetch the incident details so we can show it on the map
    fetch(`${API}/api/incidents`, { headers: { Authorization: `Bearer ${t}` } })
      .then(res => res.ok ? res.json() : [])
      .then((incidents: { id: string; latitude: number; longitude: number; plate?: string; started_at?: string; vehicle_id?: string; imei?: string }[]) => {
        const inc = incidents.find((i: { id: string }) => i.id === incidentId);
        if (inc && typeof inc.latitude === 'number') {
          const alert: IncomingAlert = {
            incidentId: inc.id,
            plate: inc.plate,
            latitude: inc.latitude,
            longitude: inc.longitude,
            timestamp: inc.started_at ? new Date(inc.started_at).getTime() : Date.now(),
            vehicleId: inc.vehicle_id,
            imei: inc.imei,
          };
          setIncomingAlerts(prev => {
            if (prev.some(a => a.incidentId === incidentId)) return prev;
            return [alert, ...prev];
          });
          setSelectedAlert(incidentId);
          setTrackingIncident(incidentId);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userName = sessionUser?.name || sessionUser?.phone || '';
  const dashType = sessionUser?.permissions?.dashboardType;

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

  // REST fallback: report location every 30s (in case WS is down)
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

    const initialDelay = setTimeout(reportLocation, 2000);
    locationReportRef.current = setInterval(reportLocation, 30000);

    return () => {
      clearTimeout(initialDelay);
      if (locationReportRef.current) clearInterval(locationReportRef.current);
    };
  }, [token]);

  // WebSocket: receive panic alerts + live location updates + send location every 3s
  const { connected: wsConnected, send: wsSend } = useWebSocket({
    token,
    enabled: !!token,
    onMessage: useCallback((msg: { type: string; payload: unknown }) => {
      if (msg.type === 'panic' && msg.payload) {
        const p = msg.payload as { incidentId?: string; plate?: string; latitude?: number; longitude?: number; timestamp?: number; vehicleId?: string; imei?: string; source?: string };
        if (p.incidentId && typeof p.latitude === 'number') {
          const alert: IncomingAlert = {
            incidentId: p.incidentId,
            plate: p.plate,
            latitude: p.latitude,
            longitude: p.longitude ?? 0,
            timestamp: p.timestamp ?? Date.now(),
            vehicleId: p.vehicleId,
            imei: p.imei,
            source: p.source,
          };
          setIncomingAlerts((prev) => {
            if (prev.some((a) => a.incidentId === alert.incidentId)) return prev;
            return [alert, ...prev].slice(0, 10);
          });
          // Auto-open tracking map for the first alert
          setTrackingIncident((curr) => curr ?? p.incidentId!);
          // Sound + vibrate to notify
          playAlarmSound();
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
        }
      }

      // Real-time vehicle location updates (for tracked incidents)
      if (msg.type === 'location' && msg.payload) {
        const loc = msg.payload as { vehicleId?: string; imei?: string; plate?: string; latitude?: number; longitude?: number; speed?: number };
        if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
          setLiveVehicles((prev) => {
            const key = loc.vehicleId || loc.imei || '';
            const idx = prev.findIndex((v) => (v.vehicleId || v.imei || '') === key);
            const updated: LiveVehicle = {
              vehicleId: loc.vehicleId,
              imei: loc.imei,
              plate: loc.plate,
              latitude: loc.latitude!,
              longitude: loc.longitude!,
              speed: loc.speed,
            };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [...prev, updated];
          });
          // Also update the alert's position so the incident marker moves
          setIncomingAlerts((prev) =>
            prev.map((a) => {
              if (a.vehicleId && a.vehicleId === loc.vehicleId) {
                return { ...a, latitude: loc.latitude!, longitude: loc.longitude! };
              }
              if (a.imei && a.imei === loc.imei) {
                return { ...a, latitude: loc.latitude!, longitude: loc.longitude! };
              }
              return a;
            })
          );
        }
      }

      // Incident resolved — remove from tracking
      if (msg.type === 'incident_update' && msg.payload) {
        const u = msg.payload as { id?: string; status?: string };
        if (u.id && (u.status === 'resolved' || u.status === 'closed')) {
          setIncomingAlerts((prev) => prev.filter((a) => a.incidentId !== u.id));
          setTrackingIncident((curr) => (curr === u.id ? null : curr));
        }
      }
    }, []),
  });

  // Primary: send location via WebSocket every 3s (real-time, no HTTP overhead)
  useEffect(() => {
    if (!wsConnected) {
      if (wsLocationRef.current) clearInterval(wsLocationRef.current);
      return;
    }

    wsLocationRef.current = setInterval(() => {
      const c = coordsRef.current;
      if (!c) return;
      wsSend({ type: 'location_update', latitude: c.lat, longitude: c.lng, speed: 0 });
    }, 3000);

    return () => {
      if (wsLocationRef.current) clearInterval(wsLocationRef.current);
    };
  }, [wsConnected, wsSend]);

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

  const handleLogout = logout;

  if (!token) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-400 text-sm">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-zinc-200/60 px-4 h-12 flex items-center justify-between">
        <Link href={dashType === 'sos' ? '/' : '/dashboard'} className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          {dashType === 'sos' ? 'Inicio' : 'Dashboard'}
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-xs font-bold tracking-tight text-zinc-700">SilentEye SOS</span>
        </div>
        <button onClick={handleLogout} className="text-zinc-400 hover:text-zinc-600 text-xs font-medium transition-colors">
          Salir
        </button>
      </header>

      {/* GPS status bar */}
      <div className="bg-white border-b border-zinc-100 px-4 py-1.5 flex items-center justify-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${coords ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
        <span className="text-[11px] text-zinc-400 truncate">
          {coords
            ? `GPS listo · ±${gpsAccuracy || '?'}m · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
            : 'Obteniendo ubicación…'}
        </span>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden">
        {/* Background pulse — subtle */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 rounded-full bg-red-100/40 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
        )}
        {status === 'sent' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 rounded-full bg-emerald-100/40 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
        )}

        {/* Greeting */}
        {userName && (
          <p className="text-zinc-400 text-xs mb-4">Hola, {userName}</p>
        )}

        {/* SOS button */}
        <button
          onClick={handlePanic}
          disabled={status === 'sending' || status === 'locating' || countdown > 0}
          className={`
            relative w-36 h-36 rounded-full font-bold text-xl uppercase tracking-widest
            transition-all duration-300 select-none
            focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-zinc-50
            ${status === 'idle'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:shadow-red-600/35 hover:scale-105 active:scale-95 focus:ring-red-500/30'
              : status === 'locating' || status === 'sending'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/15 animate-pulse cursor-wait'
              : status === 'sent'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/15'
              : 'bg-zinc-200 text-zinc-500 shadow'
            }
          `}
        >
          {status === 'idle' && (
            <span className="absolute inset-0 rounded-full border-[3px] border-red-300/25 animate-ping" style={{ animationDuration: '2s' }} />
          )}

          {status === 'idle' && 'SOS'}
          {status === 'locating' && (
            <span className="flex flex-col items-center text-sm gap-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8Z"/><circle cx="12" cy="10" r="3"/></svg>
              Ubicando
            </span>
          )}
          {status === 'sending' && (
            <span className="flex flex-col items-center text-sm gap-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>
              Enviando
            </span>
          )}
          {status === 'sent' && (
            <span className="flex flex-col items-center text-sm gap-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
              Enviado
            </span>
          )}
          {status === 'error' && (
            <span className="flex flex-col items-center text-xs gap-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              Reintentar
            </span>
          )}
        </button>

        {/* Status feedback */}
        <div className="mt-5 text-center min-h-[56px] max-w-xs">
          {status === 'idle' && (
            <p className="text-zinc-400 text-xs leading-relaxed">
              Presiona el botón para enviar una alerta de emergencia con tu ubicación
            </p>
          )}

          {status === 'sent' && result && (
            <div className="space-y-1">
              <p className="text-emerald-600 font-semibold text-sm">Alerta enviada</p>
              <p className="text-zinc-500 text-xs">
                {result.nearbyCount > 0
                  ? `${result.nearbyCount} persona${result.nearbyCount > 1 ? 's' : ''} notificada${result.nearbyCount > 1 ? 's' : ''}`
                  : 'Administradores notificados'}
              </p>
              {countdown > 0 && (
                <p className="text-zinc-400 text-[11px]">Nueva alerta en {countdown}s</p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-1.5">
              <p className="text-red-600 font-medium text-xs">{error}</p>
              <button
                onClick={() => { setStatus('idle'); setError(''); }}
                className="text-zinc-400 hover:text-zinc-600 text-xs underline transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {(status === 'locating' || status === 'sending') && (
            <p className="text-amber-600 text-xs animate-pulse">
              {status === 'locating' ? 'Obteniendo ubicación GPS…' : 'Enviando alerta…'}
            </p>
          )}
        </div>

        {/* Emergency call */}
        <a
          href="tel:911"
          className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-600 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
          Llamar al 911
        </a>
      </main>

      {/* Incoming alerts banner — tap to open tracking map */}
      {incomingAlerts.length > 0 && !trackingIncident && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider text-center">
            Alertas cercanas
          </p>
          {incomingAlerts.map((a) => (
            <div
              key={a.incidentId}
              onClick={() => { setTrackingIncident(a.incidentId); setSelectedAlert(a.incidentId); }}
              className="px-3 py-3 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <div>
                  {a.source === 'theft' && (
                    <span className="text-orange-600 font-bold text-[10px] uppercase mr-1.5">ROBO</span>
                  )}
                  <span className="text-red-700 font-semibold text-sm">{a.plate || 'SOS'}</span>
                  <span className="text-zinc-400 text-[10px] ml-2">
                    {new Date(a.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                Ver mapa
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen tracking map overlay */}
      {trackingIncident && (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900">
          {/* Tracking header */}
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between safe-area-top">
            <button
              onClick={() => setTrackingIncident(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              Volver
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-bold">
                {(() => {
                  const tracked = incomingAlerts.find((a) => a.incidentId === trackingIncident);
                  const label = tracked?.source === 'theft' ? 'ROBO' : (tracked?.plate || 'Emergencia');
                  return `${label} — En vivo`;
                })()}
              </span>
            </div>
            <a href="tel:911" className="text-xs font-medium text-white/80 hover:text-white">911</a>
          </div>

          {/* Alert info bar */}
          {incomingAlerts.length > 1 && (
            <div className="bg-zinc-800 px-4 py-2 flex gap-2 overflow-x-auto">
              {incomingAlerts.map((a) => (
                <button
                  key={a.incidentId}
                  onClick={() => { setTrackingIncident(a.incidentId); setSelectedAlert(a.incidentId); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    trackingIncident === a.incidentId
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  {a.plate || 'SOS'} · {a.latitude.toFixed(3)}, {a.longitude.toFixed(3)}
                </button>
              ))}
            </div>
          )}

          {/* Full map */}
          <div className="flex-1">
            <LeafletMap
              incidents={incomingAlerts.map((a) => ({
                id: a.incidentId,
                latitude: a.latitude,
                longitude: a.longitude,
                plate: a.plate || 'SOS',
                status: 'active',
              }))}
              liveLocations={[
                ...(coords ? [{ latitude: coords.lat, longitude: coords.lng, speed: 0, plate: 'Tú' }] : []),
                ...liveVehicles.map((v) => ({
                  vehicleId: v.vehicleId,
                  imei: v.imei,
                  latitude: v.latitude,
                  longitude: v.longitude,
                  speed: v.speed,
                  plate: v.plate || 'Vehículo',
                })),
              ]}
              selectedId={selectedAlert}
              onSelectIncident={(id) => { setSelectedAlert(id); if (id) setTrackingIncident(id); }}
              centerOnIncidentId={trackingIncident}
            />
          </div>

          {/* Bottom info */}
          <div className="bg-zinc-800 px-4 py-3 text-center safe-area-bottom">
            <p className="text-zinc-400 text-xs">
              Ubicación del incidente en tiempo real · Sigue moviéndote con precaución
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-4 py-3 border-t border-zinc-200/60 text-center">
        <p className="text-zinc-300 text-[10px] leading-relaxed">
          Ubicación compartida solo en emergencias · Admins y personas cercanas serán notificados
        </p>
      </footer>
    </div>
  );
}
