'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MapView from '@/components/MapView';
import HelperDashboardLayout from '@/components/helper/HelperDashboardLayout';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface User {
  id: string;
  phone: string;
  name: string;
  role: 'driver' | 'helper' | 'admin' | 'citizen';
}

interface Incident {
  id: string;
  status: string;
  latitude: number;
  longitude: number;
  plate?: string;
  driver_name?: string;
  started_at: string;
}

interface Location {
  imei?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  plate?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [liveLocations, setLiveLocations] = useState<Record<string, Location>>({});
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  usePushNotifications(pushToken);

  const SESSION_MAX_HOURS = 8;

  // useLayoutEffect: lee sesión antes del paint para evitar "Cargando..." eterno
  useLayoutEffect(() => {
    try {
      const loginAt = localStorage.getItem('loginAt');
      if (loginAt) {
        const elapsed = Date.now() - parseInt(loginAt, 10);
        if (elapsed > SESSION_MAX_HOURS * 60 * 60 * 1000) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('loginAt');
          window.location.href = '/login';
          return;
        }
      }
      const raw = localStorage.getItem('user');
      const t = localStorage.getItem('token');
      if (!raw || !t) {
        window.location.href = '/login';
        return;
      }
      const parsed = JSON.parse(raw) as User;
      const role = String(parsed?.role || '').toLowerCase();
      if (!parsed?.id || !role) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      // Normalizar role por si viene con mayúsculas
      setUser({ ...parsed, role: role as User['role'] });
      setPushToken(t);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }, []);

  // Respaldo: si tras 1s sigue en loading pero hay datos en localStorage, forzar setUser
  useEffect(() => {
    const id = setTimeout(() => {
      setUser((current) => {
        if (current) return current;
        try {
          const raw = localStorage.getItem('user');
          const t = localStorage.getItem('token');
          if (!raw || !t) return null;
          const parsed = JSON.parse(raw) as User;
          const role = String(parsed?.role || '').toLowerCase();
          if (parsed?.id && role && ['admin', 'helper', 'driver'].includes(role)) {
            return { ...parsed, role: role as User['role'] };
          }
        } catch {}
        return null;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchData = async () => {
      try {
        const rawUser = localStorage.getItem('user');
        const u = rawUser ? JSON.parse(rawUser) : null;
        const canFetchVehicles = u?.role === 'admin' || u?.role === 'helper' || u?.role === 'driver';

        const [incRes, vehiclesRes] = await Promise.all([
          fetch(`${API}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
          canFetchVehicles
            ? fetch(`${API}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } })
            : Promise.resolve({ ok: false }),
        ]);
        if (incRes.ok) {
          const inc = await incRes.json();
          setIncidents(inc);
        }
        if (vehiclesRes.ok && (vehiclesRes as Response).json) {
          const v = await (vehiclesRes as Response).json();
          setVehicles(v);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [user?.role]);

  // WebSocket con reintentos (cold start Fly.io) - solo para admin
  const token = user && typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  useWebSocket({
    token,
    enabled: !!user && !!token && user.role === 'admin',
    onMessage: (msg) => {
      if (msg.type === 'location' && msg.payload) {
        const p = msg.payload as Location;
        setLiveLocations((prev) => ({
          ...prev,
          [p.imei || p.vehicleId || 'unk']: p,
        }));
      }
      const handlePanicLike = (incidentId: string, lat: number, lng: number, plate?: string, imei?: string, vehicleId?: string) => {
        setIncidents((prev) => {
          if (prev.some((i) => i.id === incidentId)) return prev;
          return [{ id: incidentId, status: 'active', latitude: lat, longitude: lng, plate, started_at: new Date().toISOString() }, ...prev];
        });
        setLiveLocations((prev) => ({
          ...prev,
          [imei || vehicleId || incidentId]: { imei: imei ?? '', vehicleId, latitude: lat, longitude: lng, speed: 0, plate },
        }));
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 SilentEye - Pánico', {
            body: `Vehículo ${plate || 'Sin placa'} - Ubicación: ${lat?.toFixed(5)}, ${lng?.toFixed(5)}`,
            tag: incidentId,
          });
        }
      };
      if (msg.type === 'panic' && msg.payload) {
        const p = msg.payload as { incidentId: string; latitude: number; longitude: number; plate?: string; imei?: string; vehicleId?: string };
        handlePanicLike(p.incidentId, p.latitude, p.longitude, p.plate, p.imei, p.vehicleId);
      }
      if (msg.type === 'alert' && msg.payload) {
        const a = msg.payload as { id?: string; alertType?: string; latitude?: number; longitude?: number; plate?: string; deviceImei?: string; vehicleId?: string; priority?: number; speed?: number };
        if (a.alertType === 'panic' && a.id && typeof a.latitude === 'number' && typeof a.longitude === 'number') {
          handlePanicLike(a.id, a.latitude, a.longitude, a.plate, a.deviceImei, a.vehicleId);
        } else if (a.id && typeof a.latitude === 'number' && typeof a.longitude === 'number') {
          // Non-panic alerts: update live location + browser notification
          const key = a.deviceImei || a.vehicleId || a.id;
          setLiveLocations((prev) => ({
            ...prev,
            [key]: { imei: a.deviceImei ?? '', vehicleId: a.vehicleId, latitude: a.latitude!, longitude: a.longitude!, speed: a.speed ?? 0, plate: a.plate },
          }));
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const label = (a.alertType || 'alert').toUpperCase();
            new Notification(`⚠️ SilentEye - ${label}`, {
              body: `${a.plate || a.deviceImei || 'Vehículo'} · ${a.latitude?.toFixed(4)}, ${a.longitude?.toFixed(4)}`,
              tag: a.id,
            });
          }
        }
      }
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginAt');
    window.location.href = '/login';
  };

  if (!user) return <div className="min-h-screen bg-white flex items-center justify-center text-zinc-400">Cargando...</div>;

  const role = String(user.role || '').toLowerCase();
  if (role === 'citizen') {
    router.replace('/sos');
    return <div className="min-h-screen bg-white flex items-center justify-center text-zinc-400">Redirigiendo a SOS...</div>;
  }
  if (role === 'helper' || role === 'driver') {
    return <HelperDashboardLayout />;
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      {/* Floating SOS button */}
      <a
        href="/sos"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-red-600/25 hover:scale-105 active:scale-95 transition-all"
      >
        SOS
      </a>

      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-zinc-100 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <span className="text-sm font-bold tracking-tight">SilentEye</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-[13px] font-medium capitalize">{role}</span>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 md:p-6">
        <div className="lg:col-span-2">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden h-[400px] lg:h-[500px]">
            <MapView
              incidents={incidents}
              liveLocations={Object.values(liveLocations)}
              selectedId={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <h2 className="font-semibold text-[15px] mb-3">Incidentes activos</h2>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {incidents.filter((i) => i.status === 'active' || i.status === 'attending').length === 0 && (
                <li className="text-zinc-400 text-sm">Sin incidentes activos</li>
              )}
              {incidents
                .filter((i) => i.status === 'active' || i.status === 'attending')
                .map((inc) => (
                  <li
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedIncident === inc.id ? 'bg-red-50 border border-red-200' : 'bg-white border border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <span className="font-semibold text-red-600 text-sm">● {inc.plate || 'Sin placa'}</span>
                    <p className="text-zinc-500 text-[13px]">{inc.driver_name}</p>
                  </li>
                ))}
            </ul>
          </div>

          {role === 'admin' && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
              <Link
                href="/admin"
                className="flex items-center justify-between py-1 text-[13px] font-semibold text-zinc-900 hover:text-blue-600 transition-colors"
              >
                Panel de administración
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
