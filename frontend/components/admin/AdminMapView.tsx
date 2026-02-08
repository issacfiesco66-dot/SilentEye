'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import IncidentDetail from './IncidentDetail';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
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
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch inicial: incidentes, vehículos y últimas posiciones GPS
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const load = async () => {
      try {
        const [incRes, vRes, posRes] = await Promise.all([
          fetch(`${API}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/gps/latest-positions`, { headers: { Authorization: `Bearer ${token}` } }),
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
      } catch {
        setError('Error al cargar datos');
      }
    };

    load();
  }, [router]);

  // WebSocket: tiempo real (JWT en query string para autenticación)
  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!rawUser || !token) return;

    const u = JSON.parse(rawUser);
    if (u.role !== 'admin') return;

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    ws.onerror = () => {};

    ws.onopen = () => setWsConnected(true);

    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const p = msg.payload;
        if (!p || typeof p !== 'object') return;

        if (msg.type === 'location') {
          const key = p.imei || p.vehicleId || 'unk';
          setLiveVehicles((prev) => ({
            ...prev,
            [key]: {
              vehicleId: p.vehicleId,
              imei: p.imei,
              latitude: Number(p.latitude),
              longitude: Number(p.longitude),
              speed: p.speed,
              plate: p.plate,
            },
          }));
        }

        if (msg.type === 'panic') {
          setActiveIncidents((prev) => {
            if (prev.some((i) => i.id === p.incidentId)) return prev;
            return [
              {
                id: p.incidentId,
                status: 'active',
                latitude: Number(p.latitude),
                longitude: Number(p.longitude),
                plate: p.plate,
              },
              ...prev,
            ];
          });
          setLiveVehicles((prev) => ({
            ...prev,
            [p.imei || p.vehicleId || 'unk']: {
              vehicleId: p.vehicleId,
              imei: p.imei,
              latitude: Number(p.latitude),
              longitude: Number(p.longitude),
              speed: 0,
              plate: p.plate,
            },
          }));
        }
      } catch {
        // Ignorar mensajes malformados
      }
    };

    return () => {
      ws.close();
      setWsConnected(false);
    };
  }, []);

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
