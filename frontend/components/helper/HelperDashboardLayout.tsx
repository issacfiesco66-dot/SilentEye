'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HelperHeader, { type HelperStatus } from './HelperHeader';
import HelperIncidentCard from './HelperIncidentCard';
import HelperMapSection from './HelperMapSection';
import SinIncidentePlaceholder from './SinIncidentePlaceholder';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
}

interface Incident {
  id: string;
  vehicle_id?: string;
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
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastLocationSentAt, setLastLocationSentAt] = useState<number | null>(null);
  const [helperLocation, setHelperLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Incidente activo: el primero que está active o attending
  const activeIncident = incidents.find(
    (i) => i.status === 'active' || i.status === 'attending'
  ) ?? null;

  const helperStatus = computeHelperStatus(wsConnected, activeIncident, lastLocationSentAt);

  // Protección de ruta: solo helper
  useEffect(() => {
    const raw = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!raw || !token) {
      router.replace('/login');
      return;
    }
    const u = JSON.parse(raw) as User;
    if (u.role !== 'helper') {
      router.replace('/dashboard');
      return;
    }
    setUser(u);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [router]);

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

  // WebSocket (solo mensajes del incidente activo)
  const activeVehicleIdRef = useRef<string | null>(null);
  activeVehicleIdRef.current = activeIncident?.vehicle_id ?? null;

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => {};

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const p = msg.payload;
        if (!p || typeof p !== 'object') return;

        if (msg.type === 'panic' && p.incidentId) {
          setIncidents((prev) => {
            if (prev.some((i) => i.id === p.incidentId)) return prev;
            return [
              {
                id: p.incidentId,
                vehicle_id: p.vehicleId,
                status: 'active',
                latitude: p.latitude,
                longitude: p.longitude,
                plate: p.plate,
                driver_name: undefined,
                started_at: new Date().toISOString(),
              },
              ...prev,
            ];
          });
          setLiveLocations((prev) => ({
            ...prev,
            [p.vehicleId || p.incidentId || 'unk']: {
              vehicleId: p.vehicleId,
              latitude: p.latitude,
              longitude: p.longitude,
              speed: 0,
              plate: p.plate,
            },
          }));
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('🚨 SilentEye - Pánico', {
              body: `Vehículo ${p.plate || 'Sin placa'}`,
              tag: p.incidentId,
            });
          }
        }

        if (msg.type === 'location' && p.vehicleId) {
          const vid = activeVehicleIdRef.current;
          if (vid != null && p.vehicleId !== vid) return;
          setLiveLocations((prev) => ({
            ...prev,
            [p.vehicleId]: {
              ...prev[p.vehicleId],
              vehicleId: p.vehicleId,
              latitude: p.latitude,
              longitude: p.longitude,
              speed: p.speed,
              plate: p.plate,
            },
          }));
        }

        if (msg.type === 'incident_update' && p.incidentId) {
          setIncidents((prev) =>
            prev.map((i) =>
              i.id === p.incidentId ? { ...i, status: p.status ?? i.status } : i
            )
          );
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
      setWsConnected(false);
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
          <SinIncidentePlaceholder wsConnected={wsConnected} />
        ) : (
          <>
            <HelperIncidentCard
              incident={activeIncident}
              helperLocation={helperLocation}
              vehicleLocation={
                activeIncident.vehicle_id
                  ? liveLocations[activeIncident.vehicle_id]
                  : Object.values(liveLocations).find(
                      (l) => l.plate === activeIncident.plate
                    )
              }
              onStatusChange={fetchIncidents}
              onDecline={onIncidentCleared}
            />
            <HelperMapSection
              incident={activeIncident}
              vehicleLocation={
                activeIncident.vehicle_id
                  ? liveLocations[activeIncident.vehicle_id]
                  : Object.values(liveLocations).find(
                      (l) => l.plate === activeIncident.plate
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
