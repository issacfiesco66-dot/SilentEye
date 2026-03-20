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

// Fuel line data: normal → sudden extraction drop → slow recovery
const FUEL_NORMAL = [94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80];
const FUEL_EXTRACTION = [80, 62, 44, 38, 35, 34, 33, 33, 34, 34, 35, 36, 37, 38, 39];

export default function MonitoreoDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [prospect, setProspect] = useState<ProspectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [engineOff, setEngineOff] = useState(false);
  const [showEngineAlert, setShowEngineAlert] = useState(false);
  const [vehiclePos, setVehiclePos] = useState({ lat: 0, lng: 0 });
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);
  const [speed, setSpeed] = useState(72);
  const [tick, setTick] = useState(0);
  const [fuelAlert, setFuelAlert] = useState(false);
  const [riskUnits, setRiskUnits] = useState(3);
  // Panic button demo state
  const [panicActive, setPanicActive] = useState(false);
  const [panicPhase, setPanicPhase] = useState(0); // 0=idle,1=sos,2=radius,3=drivers,4=responding,5=tracking
  const [panicLog, setPanicLog] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const trailLineRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const panicCircleRef = useRef<any>(null);
  const panicDriverMarkersRef = useRef<any[]>([]);
  const panicDriverIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

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
        setRiskUnits(2 + Math.floor(Math.random() * 4));
      })
      .catch(() => setError('Prospecto no encontrado'))
      .finally(() => setLoading(false));
  }, [slug, API]);

  // Initialize Leaflet map with dark tiles
  useEffect(() => {
    if (!prospect || !mapRef.current || mapInstanceRef.current) return;

    const loadMap = async () => {
      const L = (await import('leaflet')).default;

      const lat = prospect.latitud || 19.0414;
      const lng = prospect.longitud || -98.2063;

      const map = L.map(mapRef.current!, { zoomControl: false }).setView([lat, lng], 15);
      // Dark map tiles for command center look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Danger zone (red, pulsing)
      L.circle([lat + 0.006, lng - 0.004], {
        radius: 300, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12,
        weight: 1.5, dashArray: '4 6',
      }).addTo(map);
      L.circle([lat - 0.003, lng + 0.007], {
        radius: 250, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08,
        weight: 1, dashArray: '4 6',
      }).addTo(map);

      // Safe geofence (green)
      L.circle([lat, lng], {
        radius: 600, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.05,
        weight: 1.5, dashArray: '8 4',
      }).addTo(map);

      // Vehicle icon — neon pulse
      const vehicleIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative">
          <div style="position:absolute;top:-6px;left:-6px;width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,0.15);animation:pulse 2s infinite"></div>
          <div style="width:36px;height:36px;background:#000;border:2px solid #22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(34,197,94,0.4)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M5 17h2m10 0h2M2 9l2-6h12l2 6M2 9h16v8H2z"/></svg>
          </div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon: vehicleIcon }).addTo(map);
      const trailLine = L.polyline([[lat, lng]], { color: '#22c55e', weight: 2, opacity: 0.5 }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      trailLineRef.current = trailLine;

      // Force Leaflet to recalculate container size (fixes blank map in flex layouts)
      setTimeout(() => map.invalidateSize(), 200);
    };

    loadMap();
  }, [prospect]);

  // Simulate vehicle movement
  const moveVehicle = useCallback(() => {
    if (engineOff) return;
    setVehiclePos(prev => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.0003 + Math.random() * 0.0005;
      return { lat: prev.lat + Math.sin(angle) * dist, lng: prev.lng + Math.cos(angle) * dist };
    });
    setSpeed(Math.floor(48 + Math.random() * 40));
    setTick(prev => prev + 1);
  }, [engineOff]);

  useEffect(() => {
    intervalRef.current = setInterval(moveVehicle, 1800);
    return () => clearInterval(intervalRef.current);
  }, [moveVehicle]);

  // Trigger fuel extraction alert after 15 ticks
  useEffect(() => {
    if (tick === 15 && !fuelAlert) {
      setFuelAlert(true);
    }
  }, [tick, fuelAlert]);

  // Update map marker
  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([vehiclePos.lat, vehiclePos.lng]);
    setTrail(prev => {
      const next = [...prev, vehiclePos].slice(-80);
      if (trailLineRef.current) trailLineRef.current.setLatLngs(next.map(p => [p.lat, p.lng]));
      return next;
    });
  }, [vehiclePos]);

  // Engine kill
  const handleEngineKill = () => {
    setEngineOff(true);
    setShowEngineAlert(true);
    setSpeed(0);
    setTimeout(() => setShowEngineAlert(false), 6000);
  };

  const handleEngineRestart = () => {
    setEngineOff(false);
    setSpeed(55);
  };

  // ── Panic Button Demo ──
  const handlePanic = async () => {
    if (panicActive) return;
    setPanicActive(true);
    setPanicLog([]);
    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;
    if (!map) return;

    const baseLat = vehiclePos.lat;
    const baseLng = vehiclePos.lng;

    // Phase 1: SOS sent
    setPanicPhase(1);
    setPanicLog(['Chofer presionó botón de PÁNICO']);

    setTimeout(() => {
      // Phase 2: 3km radius expanding
      setPanicPhase(2);
      setPanicLog(prev => [...prev, 'Alerta SOS transmitida — escaneando radio de 3 km...']);
      const circle = L.circle([baseLat, baseLng], {
        radius: 3000, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.06,
        weight: 2, dashArray: '6 4',
      }).addTo(map);
      panicCircleRef.current = circle;
      map.flyTo([baseLat, baseLng], 13, { duration: 1.5 });
    }, 1200);

    setTimeout(() => {
      // Phase 3: Nearby drivers appear
      setPanicPhase(3);
      const drivers = [
        { lat: baseLat + 0.012, lng: baseLng - 0.008, name: 'Carlos M.', dist: '1.2 km' },
        { lat: baseLat - 0.009, lng: baseLng + 0.015, name: 'Roberto S.', dist: '1.8 km' },
        { lat: baseLat + 0.018, lng: baseLng + 0.005, name: 'Javier L.', dist: '2.1 km' },
        { lat: baseLat - 0.015, lng: baseLng - 0.012, name: 'Miguel R.', dist: '2.6 km' },
      ];
      setPanicLog(prev => [...prev, `4 conductores detectados en radio de 3 km`]);

      drivers.forEach((d, i) => {
        setTimeout(() => {
          const driverIcon = L.divIcon({
            className: '',
            html: `<div style="position:relative">
              <div style="position:absolute;top:-4px;left:-4px;width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.2);animation:pulse 1.5s infinite"></div>
              <div style="width:28px;height:28px;background:#000;border:2px solid #f59e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px rgba(245,158,11,0.3)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([d.lat, d.lng], { icon: driverIcon }).addTo(map);
          marker.bindTooltip(`<strong>${d.name}</strong><br/>${d.dist}`, { permanent: false, className: 'leaflet-tooltip-dark' });
          panicDriverMarkersRef.current.push(marker);
          setPanicLog(prev => [...prev, `${d.name} notificado (${d.dist})`]);
        }, i * 500);
      });

      // Phase 4: Drivers responding
      setTimeout(() => {
        setPanicPhase(4);
        setPanicLog(prev => [...prev, 'Carlos M. aceptó — EN CAMINO']);
        setTimeout(() => {
          setPanicLog(prev => [...prev, 'Roberto S. aceptó — EN CAMINO']);
        }, 800);
      }, 2500);

      // Phase 5: Real-time tracking active, drivers converge
      setTimeout(() => {
        setPanicPhase(5);
        setPanicLog(prev => [...prev, 'SEGUIMIENTO EN TIEMPO REAL ACTIVO — 2 conductores acercándose']);

        // Animate drivers moving toward vehicle
        const moveDrivers = () => {
          panicDriverMarkersRef.current.forEach((m, i) => {
            if (i > 1) return; // only first 2 converge
            const pos = m.getLatLng();
            const dlat = (baseLat - pos.lat) * 0.08;
            const dlng = (baseLng - pos.lng) * 0.08;
            m.setLatLng([pos.lat + dlat, pos.lng + dlng]);
          });
        };
        const moveInterval = setInterval(moveDrivers, 1500);
        panicDriverIntervalsRef.current.push(moveInterval);
      }, 5000);
    }, 3000);
  };

  const handlePanicReset = () => {
    setPanicActive(false);
    setPanicPhase(0);
    setPanicLog([]);
    const map = mapInstanceRef.current;
    if (map && panicCircleRef.current) {
      map.removeLayer(panicCircleRef.current);
      panicCircleRef.current = null;
    }
    panicDriverMarkersRef.current.forEach(m => { if (map) map.removeLayer(m); });
    panicDriverMarkersRef.current = [];
    panicDriverIntervalsRef.current.forEach(i => clearInterval(i));
    panicDriverIntervalsRef.current = [];
    if (map) map.flyTo([vehiclePos.lat, vehiclePos.lng], 15, { duration: 1 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-green-400/60 text-xs uppercase tracking-[4px] font-bold">Iniciando protocolo de monitoreo...</p>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>
          </div>
          <p className="text-red-400 font-black text-lg">PROTOCOLO NO ENCONTRADO</p>
          <p className="text-zinc-600 text-xs mt-2 uppercase tracking-wider">Verifique el enlace proporcionado por Silent Eye</p>
        </div>
      </div>
    );
  }

  const fuelData = fuelAlert ? FUEL_EXTRACTION : FUEL_NORMAL;
  const currentFuel = fuelData[Math.min(tick % 15, 14)];

  return (
    <div className="min-h-screen bg-black text-white select-none">
      {/* ── Command Center Header ── */}
      <header className="bg-black/90 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-2.5 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black border border-green-500/40 rounded-lg flex items-center justify-center" style={{ boxShadow: '0 0 12px rgba(34,197,94,0.15)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <p className="text-[13px] font-black tracking-tight text-white">SILENT EYE</p>
            <p className="text-[9px] text-green-500/60 uppercase tracking-[3px] font-bold">Centro de Comando</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[10px] text-zinc-600 font-mono tabular-nums">{new Date().toLocaleTimeString('es-MX')}</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
            engineOff
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'bg-green-500/10 text-green-400 border border-green-500/30'
          }`} style={{ boxShadow: engineOff ? '0 0 15px rgba(239,68,68,0.15)' : '0 0 15px rgba(34,197,94,0.15)' }}>
            <span className={`w-2 h-2 rounded-full ${engineOff ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
            {engineOff ? 'Motor Bloqueado' : 'Transmitiendo'}
          </span>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-53px)]">
        {/* ── Full-screen Map ── */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-[50vh] lg:h-full" style={{ minHeight: '400px' }} />

          {/* Top-left: Speed + risk units overlay */}
          <div className="absolute top-4 left-4 z-[500] space-y-3">
            <div className="bg-black/80 backdrop-blur-xl rounded-xl px-5 py-3 border border-zinc-800" style={{ boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
              <p className="text-[9px] text-zinc-600 uppercase tracking-[2px] font-bold mb-1">Velocidad</p>
              <p className="text-3xl font-black tabular-nums" style={{ color: speed > 80 ? '#ef4444' : '#22c55e' }}>
                {speed} <span className="text-sm font-normal text-zinc-600">km/h</span>
              </p>
            </div>
            <div className="bg-black/80 backdrop-blur-xl rounded-xl px-5 py-3 border border-red-500/20" style={{ boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}>
              <p className="text-[9px] text-zinc-600 uppercase tracking-[2px] font-bold mb-1">Unidades en Zona de Riesgo</p>
              <p className="text-2xl font-black text-red-400 tabular-nums">{riskUnits}</p>
            </div>
          </div>

          {/* Engine kill fullscreen overlay */}
          {showEngineAlert && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[1000]">
              <div className="text-center max-w-md px-6">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-red-500 flex items-center justify-center animate-pulse" style={{ boxShadow: '0 0 60px rgba(239,68,68,0.4)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><rect x="8" y="8" width="8" height="8" rx="1" fill="#ef4444"/></svg>
                </div>
                <p className="text-3xl font-black text-red-500 tracking-tight">UNIDAD DETENIDA</p>
                <p className="text-lg text-red-400/60 mt-2 font-bold">GPS BLOQUEADO — MOTOR APAGADO REMOTAMENTE</p>
                <div className="mt-6 inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-5 py-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Señal de bloqueo activa</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Side Panel — Command Center ── */}
        <div className="lg:w-[400px] bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800/50 overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Company header */}
            <div className="bg-black rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-[9px] text-green-500/60 uppercase tracking-[3px] font-bold">Protocolo Activo</p>
              </div>
              <p className="text-xl font-black text-white leading-tight">{prospect.razonSocial}</p>
              {prospect.ubicacionPatio && <p className="text-sm text-zinc-500 mt-1">{prospect.ubicacionPatio}</p>}
              <div className="flex items-center gap-2 mt-3">
                <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[10px] font-black rounded-md border border-green-500/20">{prospect.tipoTransporte}</span>
                <span className="px-2.5 py-1 bg-zinc-900 text-zinc-400 text-[10px] font-bold rounded-md border border-zinc-800 font-mono">{prospect.folio}</span>
              </div>
            </div>

            {/* Status: Blindaje Digital */}
            <div className="rounded-xl p-4 border" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(0,0,0,0.8) 100%)', borderColor: 'rgba(34,197,94,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center border border-green-500/30" style={{ boxShadow: '0 0 10px rgba(34,197,94,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <p className="text-green-400 font-black text-sm">Blindaje Digital Activo</p>
              </div>
              <p className="text-zinc-600 text-[11px] leading-relaxed">Monitoreo GPS en tiempo real, paro de motor remoto, geocercas activas, control de combustible y respuesta inmediata 24/7.</p>
            </div>

            {/* ── GIANT ENGINE KILL BUTTON ── */}
            <div className="pt-1">
              <p className="text-[9px] text-zinc-600 uppercase tracking-[2px] font-bold mb-3 text-center">Control Remoto del Vehículo</p>
              {!engineOff ? (
                <button
                  onClick={handleEngineKill}
                  className="w-full group relative overflow-hidden rounded-2xl transition-all active:scale-[0.97]"
                  style={{ boxShadow: '0 0 40px rgba(239,68,68,0.2)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-red-600 to-red-800 opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                  <div className="relative px-6 py-6 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center bg-black/20">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>
                    </div>
                    <span className="text-white font-black text-lg tracking-wide">PROBAR PARO DE MOTOR</span>
                    <span className="text-red-200/60 text-[10px] font-bold uppercase tracking-widest">Detener vehículo remotamente</span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleEngineRestart}
                  className="w-full group relative overflow-hidden rounded-2xl transition-all active:scale-[0.97]"
                  style={{ boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-green-600 to-green-800 opacity-90" />
                  <div className="relative px-6 py-5 flex flex-col items-center gap-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    <span className="text-white font-black text-base tracking-wide">REACTIVAR MOTOR</span>
                  </div>
                </button>
              )}
            </div>

            {/* ── PANIC BUTTON DEMO ── */}
            <div className="pt-1">
              <p className="text-[9px] text-zinc-600 uppercase tracking-[2px] font-bold mb-3 text-center">Botón de Pánico — Función Exclusiva</p>
              {!panicActive ? (
                <button
                  onClick={handlePanic}
                  className="w-full group relative overflow-hidden rounded-2xl transition-all active:scale-[0.97]"
                  style={{ boxShadow: '0 0 40px rgba(245,158,11,0.2)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500 to-amber-700 opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                  <div className="relative px-6 py-5 flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full border-4 border-white/20 flex items-center justify-center bg-black/20">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <span className="text-white font-black text-base tracking-wide">PROBAR BOTÓN DE PÁNICO</span>
                    <span className="text-amber-200/60 text-[10px] font-bold uppercase tracking-widest">Simular alerta SOS del chofer</span>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Panic status indicator */}
                  <div className={`rounded-xl p-4 border transition-all ${
                    panicPhase >= 5
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-amber-500/5 border-amber-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                        panicPhase >= 5 ? 'bg-green-500' : 'bg-amber-500'
                      }`} />
                      <p className={`font-black text-sm ${
                        panicPhase >= 5 ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        {panicPhase === 1 && 'ENVIANDO SOS...'}
                        {panicPhase === 2 && 'ESCANEANDO CONDUCTORES CERCANOS...'}
                        {panicPhase === 3 && 'NOTIFICANDO CONDUCTORES...'}
                        {panicPhase === 4 && 'CONDUCTORES RESPONDIENDO...'}
                        {panicPhase >= 5 && 'SEGUIMIENTO EN TIEMPO REAL ACTIVO'}
                      </p>
                    </div>

                    {/* How it works explanation */}
                    <div className="bg-black/40 rounded-lg p-3 mb-3 border border-zinc-800">
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        <span className="text-amber-400 font-black">¿Cómo funciona?</span> Cuando un chofer presiona el botón de pánico (físico en el GPS o desde la app), Silent Eye envía una alerta instantánea a <span className="text-white font-bold">todos los conductores de su flota en un radio de 3 km</span>. Los conductores cercanos reciben la ubicación exacta y pueden dar seguimiento en tiempo real, acudiendo al lugar de inmediato.
                      </p>
                    </div>

                    {/* Real-time log */}
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                      {panicLog.map((log, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            log.includes('ACTIVO') ? 'bg-green-500'
                              : log.includes('EN CAMINO') || log.includes('aceptó') ? 'bg-green-400'
                              : log.includes('PÁNICO') ? 'bg-red-500'
                              : 'bg-amber-400'
                          }`} />
                          <p className={`text-[11px] font-bold ${
                            log.includes('ACTIVO') ? 'text-green-400'
                              : log.includes('EN CAMINO') || log.includes('aceptó') ? 'text-green-400/80'
                              : log.includes('PÁNICO') ? 'text-red-400'
                              : 'text-amber-400/80'
                          }`}>
                            {log}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feature highlights */}
                  {panicPhase >= 5 && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: '🛡️', label: 'Botón físico', desc: 'En el GPS del vehículo' },
                        { icon: '📡', label: 'Radio 3 km', desc: 'Alerta a conductores cercanos' },
                        { icon: '📍', label: 'Tiempo real', desc: 'Seguimiento GPS en vivo' },
                        { icon: '⚡', label: 'Respuesta', desc: 'Ayuda en menos de 5 min' },
                      ].map(f => (
                        <div key={f.label} className="bg-black rounded-lg p-2.5 border border-zinc-800 text-center">
                          <p className="text-base mb-0.5">{f.icon}</p>
                          <p className="text-[10px] text-white font-black">{f.label}</p>
                          <p className="text-[9px] text-zinc-600">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handlePanicReset}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[11px] font-bold transition-colors border border-zinc-800"
                  >
                    Reiniciar simulación
                  </button>
                </div>
              )}
            </div>

            {/* ── Fuel Chart with extraction alert ── */}
            <div className={`rounded-xl p-4 border transition-all ${fuelAlert ? 'bg-red-500/5 border-red-500/30' : 'bg-black border-zinc-800'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-zinc-600 uppercase tracking-[2px] font-bold">Control de Combustible</p>
                <span className={`text-sm font-black tabular-nums ${currentFuel < 50 ? 'text-red-400' : 'text-green-400'}`}>{currentFuel}%</span>
              </div>
              {fuelAlert && (
                <div className="flex items-center gap-2 mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping flex-shrink-0" />
                  <p className="text-red-400 text-[11px] font-black">Posible extracción detectada (huachicoleo)</p>
                </div>
              )}
              {/* SVG line chart */}
              <div className="relative h-24 mt-2">
                <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={100 - y} x2="300" y2={100 - y} stroke={fuelAlert && y < 50 ? '#ef444420' : '#27272a'} strokeWidth="0.5" />
                  ))}
                  {/* Danger zone fill */}
                  {fuelAlert && (
                    <rect x="0" y="50" width="300" height="50" fill="rgba(239,68,68,0.05)" />
                  )}
                  {/* Fuel line */}
                  <polyline
                    fill="none"
                    stroke={fuelAlert ? '#ef4444' : '#22c55e'}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    points={fuelData.map((v, i) => `${(i / 14) * 300},${100 - v}`).join(' ')}
                  />
                  {/* Current point glow */}
                  <circle
                    cx={(Math.min(tick % 15, 14) / 14) * 300}
                    cy={100 - currentFuel}
                    r="4"
                    fill={fuelAlert ? '#ef4444' : '#22c55e'}
                    opacity="0.8"
                  />
                  <circle
                    cx={(Math.min(tick % 15, 14) / 14) * 300}
                    cy={100 - currentFuel}
                    r="8"
                    fill={fuelAlert ? '#ef4444' : '#22c55e'}
                    opacity="0.2"
                  />
                </svg>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-700 font-mono">-30 min</span>
                <span className="text-[9px] text-zinc-700 font-mono">Ahora</span>
              </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Km hoy', value: `${124 + tick * 3}`, color: 'text-white' },
                { label: 'Geocercas', value: '3', color: 'text-green-400', sub: 'activas' },
                { label: 'Alertas', value: fuelAlert ? '1' : '0', color: fuelAlert ? 'text-red-400' : 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="bg-black rounded-xl p-3 border border-zinc-800 text-center">
                  <p className="text-[8px] text-zinc-600 uppercase tracking-[2px] font-bold mb-1">{s.label}</p>
                  <p className={`text-lg font-black tabular-nums ${s.color}`}>{s.value}</p>
                  {s.sub && <p className="text-[9px] text-zinc-700">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* ── CTA — Urgency ── */}
            <div className="rounded-2xl p-5 border border-zinc-700 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
              <p className="text-white font-black text-base mb-1 relative">Proteja toda su flota hoy</p>
              <p className="text-zinc-500 text-[11px] leading-relaxed mb-4 relative">Sus unidades podrían estar operando sin blindaje digital. Active el monitoreo real: paro de motor, control de combustible y geocercas para todos sus vehículos.</p>
              <a
                href={`https://wa.me/525610669353?text=${encodeURIComponent(`Hola, vi el protocolo de monitoreo de Silent Eye y quiero blindaje digital para mi flota. Folio: ${prospect.folio}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-sm transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 30px rgba(34,197,94,0.3)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.475A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                Contactar Asesor de Seguridad
              </a>
              <p className="text-center text-[9px] text-zinc-700 mt-3 relative uppercase tracking-wider">Un asesor está pendiente de su conexión</p>
            </div>

            {/* Footer */}
            <p className="text-center text-[9px] text-zinc-800 pt-2 font-mono">
              SILENT EYE &copy; {new Date().getFullYear()} &mdash; SEGURIDAD PATRIMONIAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
