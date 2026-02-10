'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import IncidentDetail from './IncidentDetail';
import { useWebSocket } from '@/hooks/useWebSocket';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const LIMA_CENTER = { longitude: -77.0428, latitude: -12.0464 };

const MapboxMap = dynamic(() => import('../MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-300">
      Cargando mapa…
    </div>
  ),
});

interface VehicleLocation {
  vehicleId?: string;
  imei?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  plate?: string;
}

interface Incident {
  id: string;
  status: string;
  latitude: number;
  longitude: number;
  plate?: string;
}

export default function AdminMapView() {
  const router = useRouter();
  const [liveVehicles, setLiveVehicles] = useState<Record<string, VehicleLocation>>({});
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string }[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [centerOnIncidentId, setCenterOnIncidentId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  }, []);

  // Función para cargar posiciones GPS (usada en fetch inicial y polling)
  const loadPositions = async (token: string) => {
    const posRes = await fetch(`${API}/api/gps/latest-positions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (posRes.ok) {
      const positions = await posRes.json();
      const initial: Record<string, VehicleLocation> = {};
      for (const p of positions) {
        const key = p.imei || p.vehicleId || 'unk';
        initial[key] = {
          vehicleId: p.vehicleId,
          imei: p.imei,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          speed: p.speed,
          plate: p.plate,
        };
      }
      setLiveVehicles((prev) => ({ ...initial, ...prev }));
    }
  };

  // Fetch inicial + polling cada 5s para actualizar ubicaciones más rápido
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const load = async () => {
      try {
        const [incRes, vRes] = await Promise.all([
          fetch(`${API}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (incRes.status === 401 || incRes.status === 403) {
          router.replace('/login');
          return;
        }
        if (vRes.status === 401 || vRes.status === 403) {
          router.replace('/login');
          return;
        }

        if (incRes.ok) {
          const incidents = await incRes.json();
          const active = incidents.filter(
            (i: Incident) => i.status === 'active' || i.status === 'attending'
          );
          setActiveIncidents(active);
        }
        if (vRes.ok) {
          const v = await vRes.json();
          setVehicles(v);
        }
        await loadPositions(token);
      } catch {
        setError('Error al cargar datos');
      }
    };

    load();

    // Polling cada 5s para reflejar ubicaciones más rápido (complementa WebSocket)
    const interval = setInterval(() => loadPositions(token), 5000);
    return () => clearInterval(interval);
  }, [router]);

  // WebSocket: tiempo real con reintentos (cold start Fly.io)
  const { connected: wsConnected } = useWebSocket({
    token,
    enabled: !!token,
    onMessage: (msg) => {
      const p = msg.payload;
      if (!p || typeof p !== 'object') return;

      if (msg.type === 'location') {
        const key = (p as { imei?: string; vehicleId?: string }).imei || (p as { vehicleId?: string }).vehicleId || 'unk';
        setLiveVehicles((prev) => ({
          ...prev,
          [key]: {
            vehicleId: (p as { vehicleId?: string }).vehicleId,
            imei: (p as { imei?: string }).imei,
            latitude: Number((p as { latitude?: number }).latitude),
            longitude: Number((p as { longitude?: number }).longitude),
            speed: (p as { speed?: number }).speed,
            plate: (p as { plate?: string }).plate,
          },
        }));
      }

      const handlePanicLike = (incidentId: string, lat: number, lng: number, plate?: string, imei?: string, vehicleId?: string) => {
        setActiveIncidents((prev) => {
          if (prev.some((i) => i.id === incidentId)) return prev;
          return [{ id: incidentId, status: 'active', latitude: lat, longitude: lng, plate }, ...prev];
        });
        const key = imei || vehicleId || 'unk';
        setLiveVehicles((prev) => ({ ...prev, [key]: { vehicleId, imei, latitude: lat, longitude: lng, speed: 0, plate } }));
      };
      if (msg.type === 'panic') {
        const panic = p as { incidentId: string; latitude: number; longitude: number; plate?: string; imei?: string; vehicleId?: string };
        handlePanicLike(panic.incidentId, panic.latitude, panic.longitude, panic.plate, panic.imei, panic.vehicleId);
      }
      if (msg.type === 'alert' && (p as { alertType?: string }).alertType === 'panic') {
        const a = p as { id?: string; latitude?: number; longitude?: number; plate?: string; deviceImei?: string; vehicleId?: string };
        if (a.id && typeof a.latitude === 'number' && typeof a.longitude === 'number') {
          handlePanicLike(a.id, a.latitude, a.longitude, a.plate, a.deviceImei, a.vehicleId);
        }
      }
    },
  });

  const handleStatusChange = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((incidents: Incident[]) => {
        const active = incidents.filter(
          (i) => i.status === 'active' || i.status === 'attending'
        );
        setActiveIncidents(active);
      })
      .catch(() => {});
    setSelectedIncidentId(null);
  };

  const handleCenterOnIncident = () => {
    if (selectedIncidentId) {
      setCenterOnIncidentId(selectedIncidentId);
      setTimeout(() => setCenterOnIncidentId(null), 500);
    }
  };

  if (!TOKEN) {
    return (
      <div className="h-[450px] flex flex-col items-center justify-center bg-slate-800 rounded-xl border border-slate-700 text-slate-400">
        <p>Añade NEXT_PUBLIC_MAPBOX_TOKEN para ver el mapa</p>
        <p className="text-sm mt-2">
          Vehículos: {Object.keys(liveVehicles).length} · Incidentes activos: {activeIncidents.length}
        </p>
      </div>
    );
  }

  const liveLocationsList = Object.values(liveVehicles);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-sm font-medium ${
            wsConnected ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          {wsConnected ? '● WebSocket conectado' : '○ WebSocket desconectado'}
        </span>
        <div className="flex items-center gap-2">
          {selectedIncidentId && (
            <button
              onClick={handleCenterOnIncident}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-600 hover:bg-slate-500"
            >
              Centrar en incidente
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="h-[450px] rounded-xl overflow-hidden border border-slate-700">
        <MapboxMap
          token={TOKEN}
          incidents={activeIncidents}
          liveLocations={liveLocationsList}
          selectedId={selectedIncidentId}
          onSelectIncident={setSelectedIncidentId}
          centerOnIncidentId={centerOnIncidentId}
        />
      </div>

      <p className="text-slate-500 text-xs">
        Vehículos en vivo: {Object.keys(liveVehicles).length} · Incidentes activos: {activeIncidents.length}
      </p>

      {selectedIncidentId && (
        <IncidentDetail
          incidentId={selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
