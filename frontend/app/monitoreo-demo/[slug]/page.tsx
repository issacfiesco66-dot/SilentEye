'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import 'leaflet/dist/leaflet.css';

interface ProspectData {
  folio: string;
  razonSocial: string;
  ubicacionPatio: string | null;
  latitud: number | null;
  longitud: number | null;
  tipoTransporte: string;
  vistasDemo: number;
  statusSeguridad: string;
  createdAt: string;
}

// Simulated fuel data points
const FUEL_DATA = [92, 89, 87, 84, 82, 80, 78, 76, 73, 71, 69, 68, 65, 63, 61, 60, 58, 57, 55, 54];

export default function MonitoreoDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [prospect, setProspect] = useState<ProspectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [engineOff, setEngineOff] = useState(false);
  const [showEngineAlert, setShowEngineAlert] = useState(false);
  const [vehiclePos, setVehiclePos] = useState({ lat: 0, lng: 0 });
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);
  const [speed, setSpeed] = useState(62);
  const [fuelIndex, setFuelIndex] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const trailLineRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const API = process.env.NEXT_PUBLIC_API_URL || '';

  // Fetch prospect data
  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/prospects/demo/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject('No encontrado'))
      .then((data: ProspectData) => {
        setProspect(data);
        const lat = data.latitud || 19.0414;
        const lng = data.longitud || -98.2063;
        setVehiclePos({ lat, lng });
        setTrail([{ lat, lng }]);
      })
      .catch(() => setError('Prospecto no encontrado'))
      .finally(() => setLoading(false));
  }, [slug, API]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!prospect || !mapRef.current || mapInstanceRef.current) return;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;

      const lat = prospect.latitud || 19.0414;
      const lng = prospect.longitud || -98.2063;

      const map = L.map(mapRef.current!, { zoomControl: false }).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      // Vehicle icon
      const vehicleIcon = L.divIcon({
        className: '',
        html: `<div style="width:36px;height:36px;background:#1d4ed8;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h2m10 0h2M2 9l2-6h12l2 6M2 9h16v8H2z"/></svg>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map);
      const trailLine = L.polyline([[lat, lng]], { color: '#3b82f6', weight: 3, opacity: 0.6 }).addTo(map);

      // Geofence circle
      L.circle([lat, lng], { radius: 500, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.08, weight: 1.5, dashArray: '6 4' }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      trailLineRef.current = trailLine;
    };

    loadMap();
  }, [prospect]);

  // Simulate vehicle movement
  const moveVehicle = useCallback(() => {
    if (engineOff) return;
    setVehiclePos(prev => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.0003 + Math.random() * 0.0004;
      const newLat = prev.lat + Math.sin(angle) * dist;
      const newLng = prev.lng + Math.cos(angle) * dist;
      return { lat: newLat, lng: newLng };
    });
    setSpeed(Math.floor(45 + Math.random() * 35));
    setFuelIndex(prev => (prev + 1) % FUEL_DATA.length);
  }, [engineOff]);

  useEffect(() => {
    intervalRef.current = setInterval(moveVehicle, 2000);
    return () => clearInterval(intervalRef.current);
  }, [moveVehicle]);

  // Update map marker position
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([vehiclePos.lat, vehiclePos.lng]);
    setTrail(prev => {
      const next = [...prev, vehiclePos].slice(-60);
      if (trailLineRef.current) {
        trailLineRef.current.setLatLngs(next.map(p => [p.lat, p.lng]));
      }
      return next;
    });
  }, [vehiclePos]);

  // Engine kill simulation
  const handleEngineKill = () => {
    setEngineOff(true);
    setShowEngineAlert(true);
    setSpeed(0);
    setTimeout(() => setShowEngineAlert(false), 5000);
  };

  const handleEngineRestart = () => {
    setEngineOff(false);
    setSpeed(45 + Math.floor(Math.random() * 30));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Cargando sistema de monitoreo...</p>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>
          </div>
          <p className="text-zinc-300 font-bold">Unidad no encontrada</p>
          <p className="text-zinc-500 text-sm mt-1">Verifique el enlace proporcionado</p>
        </div>
      </div>
    );
  }

  const fuel = FUEL_DATA[fuelIndex];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-tight">SilentEye</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Sistema de Monitoreo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${engineOff ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${engineOff ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
            {engineOff ? 'MOTOR DETENIDO' : 'EN LÍNEA'}
          </span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-57px)]">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full min-h-[400px]" />

          {/* Speed overlay */}
          <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur rounded-xl px-4 py-3 border border-zinc-700">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Velocidad</p>
            <p className="text-2xl font-black tabular-nums">{speed} <span className="text-sm font-normal text-zinc-400">km/h</span></p>
          </div>

          {/* Engine alert overlay */}
          {showEngineAlert && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/95 backdrop-blur rounded-2xl px-8 py-6 text-center animate-pulse z-[1000]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="mx-auto mb-3"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4m0 4h.01"/></svg>
              <p className="text-xl font-black">PARO DE MOTOR EJECUTADO</p>
              <p className="text-red-100 text-sm mt-1">Motor del vehículo detenido remotamente</p>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="lg:w-[380px] bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Company Info */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Empresa Monitoreada</p>
              <p className="text-lg font-bold">{prospect.razonSocial}</p>
              {prospect.ubicacionPatio && <p className="text-sm text-zinc-400 mt-1">{prospect.ubicacionPatio}</p>}
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[11px] font-bold rounded-full">{prospect.tipoTransporte}</span>
                <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-[11px] font-bold rounded-full">Folio: {prospect.folio}</span>
              </div>
            </div>

            {/* Status */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <p className="text-emerald-400 font-bold text-sm">Estatus: Protegido por Silent Eye</p>
              </div>
              <p className="text-zinc-500 text-[12px] leading-relaxed">Esta unidad cuenta con monitoreo GPS en tiempo real, geocercas activas y respuesta inmediata ante eventos de seguridad.</p>
            </div>

            {/* Engine Kill Button */}
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Control Remoto del Vehículo</p>
              {!engineOff ? (
                <button
                  onClick={handleEngineKill}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>
                  Simular Paro de Motor
                </button>
              ) : (
                <button
                  onClick={handleEngineRestart}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  Reactivar Motor
                </button>
              )}
            </div>

            {/* Fuel Chart */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Control de Combustible</p>
                <span className="text-sm font-bold text-amber-400">{fuel}%</span>
              </div>
              {/* Bar chart */}
              <div className="flex items-end gap-[3px] h-20">
                {FUEL_DATA.slice(0, 15).map((val, i) => {
                  const isCurrent = i === fuelIndex % 15;
                  const h = (val / 100) * 100;
                  const color = val > 60 ? 'bg-emerald-500' : val > 30 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className={`${color} rounded-sm transition-all duration-500 ${isCurrent ? 'opacity-100' : 'opacity-40'}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-zinc-600">Hace 30 min</span>
                <span className="text-[10px] text-zinc-600">Ahora</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Km hoy</p>
                <p className="text-lg font-black tabular-nums">{(124 + fuelIndex * 3).toFixed(0)}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Geocercas</p>
                <p className="text-lg font-black text-emerald-400">3 activas</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Alertas</p>
                <p className="text-lg font-black text-amber-400">0</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Vistas</p>
                <p className="text-lg font-black tabular-nums">{prospect.vistasDemo}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-blue-400 font-bold text-sm mb-1">Proteja toda su flota</p>
              <p className="text-zinc-400 text-[12px] leading-relaxed mb-3">Active el monitoreo real para todos sus vehículos. Rastreo GPS en tiempo real, paro de motor remoto, control de combustible y alertas 24/7.</p>
              <a
                href="https://wa.me/525610669353?text=Hola%2C+vi+el+demo+de+monitoreo+de+Silent+Eye+y+quiero+informes+para+mi+flota.+Folio:+{prospect.folio}"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.475A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.168 0-4.19-.588-5.932-1.614l-.425-.252-2.742.876.877-2.689-.277-.44A9.77 9.77 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818S21.818 6.578 21.818 12s-4.396 9.818-9.818 9.818z"/></svg>
                Solicitar informes por WhatsApp
              </a>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-zinc-600 pt-2">
              SilentEye © {new Date().getFullYear()} — Sistema de Seguridad Patrimonial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
