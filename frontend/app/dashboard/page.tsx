'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MapView from '@/components/MapView';
import HelperDashboardLayout from '@/components/helper/HelperDashboardLayout';
import { useWebSocket } from '@/hooks/useWebSocket';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface User {
  id: string;
  phone: string;
  name: string;
  role: 'driver' | 'helper' | 'admin';
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
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
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
      if (msg.type === 'panic' && msg.payload) {
        const p = msg.payload as { incidentId: string; latitude: number; longitude: number; plate?: string; imei?: string; vehicleId?: string };
        setIncidents((prev) => {
          if (prev.some((i) => i.id === p.incidentId)) return prev;
          return [
            {
              id: p.incidentId,
              status: 'active',
              latitude: p.latitude,
              longitude: p.longitude,
              plate: p.plate,
              started_at: new Date().toISOString(),
            },
            ...prev,
          ];
        });
        setLiveLocations((prev) => ({
          ...prev,
          [p.imei || p.vehicleId || 'unk']: {
            imei: p.imei ?? '',
            vehicleId: p.vehicleId,
            latitude: p.latitude,
            longitude: p.longitude,
            speed: 0,
            plate: p.plate,
          },
        }));
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 SilentEye - Pánico', {
            body: `Vehículo ${p.plate || 'Sin placa'} - Ubicación: ${p.latitude?.toFixed(5)}, ${p.longitude?.toFixed(5)}`,
            tag: p.incidentId,
          });
        }
      }
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginAt');
    router.replace('/login');
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  const role = String(user.role || '').toLowerCase();
  if (role === 'helper' || role === 'driver') {
    return <HelperDashboardLayout />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">SilentEye</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm capitalize">{role}</span>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white text-sm"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-xl overflow-hidden h-[400px] lg:h-[500px]">
            <MapView
              incidents={incidents}
              liveLocations={Object.values(liveLocations)}
              selectedId={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">Incidentes activos</h2>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {incidents.filter((i) => i.status === 'active' || i.status === 'attending').length === 0 && (
                <li className="text-slate-500 text-sm">Sin incidentes activos</li>
              )}
              {incidents
                .filter((i) => i.status === 'active' || i.status === 'attending')
                .map((inc) => (
                  <li
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc.id)}
                    className={`p-3 rounded-lg cursor-pointer ${
                      selectedIncident === inc.id ? 'bg-panic/20 border border-panic' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <span className="font-medium text-panic">🚨 {inc.plate || 'Sin placa'}</span>
                    <p className="text-slate-400 text-sm">{inc.driver_name}</p>
                  </li>
                ))}
            </ul>
          </div>

          {role === 'admin' && (
            <div className="bg-slate-800 rounded-xl p-4">
              <Link
                href="/admin"
                className="block py-2 text-blue-400 hover:text-blue-300"
              >
                Panel de administración →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
