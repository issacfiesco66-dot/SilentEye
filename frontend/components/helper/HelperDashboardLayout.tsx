'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HelperHeader, { type HelperStatus } from './HelperHeader';
import HelperIncidentCard from './HelperIncidentCard';
import HelperMapSection from './HelperMapSection';
import SinIncidentePlaceholder from './SinIncidentePlaceholder';
import DriverMyVehiclesMap from './DriverMyVehiclesMap';
import { useWebSocket } from '@/hooks/useWebSocket';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
}

interface Incident {
  id: string;
  vehicle_id?: string;
  imei?: string;
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
  speed?: number;
  plate?: string;
}


function computeHelperStatus(
  wsConnected: boolean,
  incident: Incident | null,
  lastLocationSentAt: number | null
): HelperStatus {
  if (!wsConnected) return 'offline';
  if (!incident) return 'disponible';
  if (incident.status === 'attending') return 'en_ruta';
  return 'asignado';
}

export default function HelperDashboardLayout() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [liveLocations, setLiveLocations] = useState<Record<string, Location>>({});
  const [loading, setLoading] = useState(true);
  const [lastLocationSentAt, setLastLocationSentAt] = useState<number | null>(null);
  const [helperLocation, setHelperLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Incidente activo: el primero que está active o attending
  const activeIncident = incidents.find(
    (i) => i.status === 'active' || i.status === 'attending'
  ) ?? null;

  const SESSION_MAX_HOURS = 8;

  // Protección de ruta: helper y driver (ambos usan este layout)
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
      const token = localStorage.getItem('token');
      if (!raw || !token) {
        window.location.href = '/login';
        return;
      }
      const u = JSON.parse(raw) as User;
      const role = String(u?.role || '').toLowerCase();
      if (role !== 'helper' && role !== 'driver') {
        window.location.href = '/dashboard';
        return;
      }
      setUser({ ...u, role });
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }, []);

  // Respaldo: si tras 1s sigue en loading pero hay datos válidos, forzar setUser
  useEffect(() => {
    const id = setTimeout(() => {
      setUser((current) => {
        if (current) return current;
        try {
          const raw = localStorage.getItem('user');
          const t = localStorage.getItem('token');
          if (!raw || !t) return null;
          const u = JSON.parse(raw) as User;
          const role = String(u?.role || '').toLowerCase();
          if (u?.id && (role === 'helper' || role === 'driver')) {
            return { ...u, role };
          }
        } catch {}
        return null;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, []);

  // Carga inicial: GET /api/incidents
  const fetchIncidents = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/incidents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setIncidents(data);
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchIncidents().finally(() => setLoading(false));
  }, [user, fetchIncidents]);

  // Refetch periódico cuando hay incidente activo (detectar resolución externa)
  useEffect(() => {
    if (!activeIncident) return;
    const id = setInterval(fetchIncidents, 30000);
    return () => clearInterval(id);
  }, [activeIncident?.id, fetchIncidents]);

  // WebSocket con reintentos (cold start Fly.io)
  const activeVehicleIdRef = useRef<string | null>(null);
  const activeIncidentImeiRef = useRef<string | null>(null);
  activeVehicleIdRef.current = activeIncident?.vehicle_id ?? null;
  activeIncidentImeiRef.current = activeIncident?.imei ?? null;

  const token = user && typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { connected: wsConnected } = useWebSocket({
    token,
    enabled: !!user && !!token,
    onMessage: (msg) => {
      const p = msg.payload;
      if (!p || typeof p !== 'object') return;

      const handlePanicLike = (incidentId: string, lat: number, lng: number, plate?: string, imei?: string, vehicleId?: string) => {
        setIncidents((prev) => {
          if (prev.some((i) => i.id === incidentId)) return prev;
          return [{
            id: incidentId,
            vehicle_id: vehicleId,
            imei,
            status: 'active',
            latitude: lat,
            longitude: lng,
            plate,
            driver_name: undefined,
            started_at: new Date().toISOString(),
          }, ...prev];
        });
        const key = vehicleId || imei || incidentId || 'unk';
        setLiveLocations((prev) => ({ ...prev, [key]: { vehicleId, imei, latitude: lat, longitude: lng, speed: 0, plate } }));
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 SilentEye - Pánico', { body: `Vehículo ${plate || 'Sin placa'}`, tag: incidentId });
        }
      };
      if (msg.type === 'panic' && (p as { incidentId?: string }).incidentId) {
        const panic = p as { incidentId: string; vehicleId?: string; imei?: string; latitude: number; longitude: number; plate?: string };
        handlePanicLike(panic.incidentId, panic.latitude, panic.longitude, panic.plate, panic.imei, panic.vehicleId);
      }
      if (msg.type === 'alert' && (p as { alertType?: string }).alertType) {
        const a = p as { id?: string; alertType?: string; latitude?: number; longitude?: number; plate?: string; deviceImei?: string; vehicleId?: string; speed?: number };
        if (a.alertType === 'panic' && a.id && typeof a.latitude === 'number' && typeof a.longitude === 'number') {
          handlePanicLike(a.id, a.latitude, a.longitude, a.plate, a.deviceImei, a.vehicleId);
        } else if (a.id && typeof a.latitude === 'number' && typeof a.longitude === 'number') {
          // Non-panic alerts: browser notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const label = (a.alertType || 'alert').toUpperCase();
            new Notification(`⚠️ SilentEye - ${label}`, {
              body: `${a.plate || a.deviceImei || 'Vehículo'} · ${a.latitude?.toFixed(4)}, ${a.longitude?.toFixed(4)}`,
              tag: a.id,
            });
          }
        }
      }

      if (msg.type === 'location') {
        const loc = p as { vehicleId?: string; imei?: string; latitude: number; longitude: number; speed?: number; plate?: string };
        const vid = activeVehicleIdRef.current;
        const aidImei = activeIncidentImeiRef.current;
        const key = loc.vehicleId || loc.imei || 'unk';
        if (vid != null || aidImei != null) {
          const matchByVehicle = vid != null && loc.vehicleId === vid;
          const matchByImei = aidImei != null && loc.imei === aidImei;
          if (!matchByVehicle && !matchByImei) return;
        }
        setLiveLocations((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            vehicleId: loc.vehicleId,
            imei: loc.imei,
            latitude: loc.latitude,
            longitude: loc.longitude,
            speed: loc.speed,
            plate: loc.plate,
          },
        }));
      }

      if (msg.type === 'incident_update' && (p as { incidentId?: string }).incidentId) {
        const upd = p as { incidentId: string; status?: string };
        setIncidents((prev) =>
          prev.map((i) =>
            i.id === upd.incidentId ? { ...i, status: upd.status ?? i.status } : i
          )
        );
      }
    },
  });

  const helperStatus = computeHelperStatus(wsConnected, activeIncident, lastLocationSentAt);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginAt');
    router.replace('/login');
  };

  const onIncidentCleared = () => {
    setIncidents((prev) => prev.filter((i) => i.id !== activeIncident?.id));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <span className="text-slate-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <HelperHeader status={helperStatus} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col p-4 gap-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Cargando...
          </div>
        ) : !activeIncident ? (
          user.role === 'driver' ? (
            <DriverMyVehiclesMap />
          ) : (
            <SinIncidentePlaceholder wsConnected={wsConnected} />
          )
        ) : (
          <>
            <HelperIncidentCard
              incident={activeIncident}
              helperLocation={helperLocation}
              vehicleLocation={
                liveLocations[activeIncident.vehicle_id!] ??
                liveLocations[activeIncident.imei!] ??
                Object.values(liveLocations).find(
                  (l) => l.plate === activeIncident.plate || l.imei === activeIncident.imei
                )
              }
              onStatusChange={fetchIncidents}
              onDecline={onIncidentCleared}
            />
            <HelperMapSection
              incident={activeIncident}
              vehicleLocation={
                liveLocations[activeIncident.vehicle_id!] ??
                liveLocations[activeIncident.imei!] ??
                Object.values(liveLocations).find(
                  (l) => l.plate === activeIncident.plate || l.imei === activeIncident.imei
                )
              }
              onLocationSent={() => setLastLocationSentAt(Date.now())}
              onHelperLocationChange={setHelperLocation}
            />
          </>
        )}
      </main>
    </div>
  );
}
