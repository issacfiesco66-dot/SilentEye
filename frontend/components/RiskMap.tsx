'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { Layer, PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stateRisk, getRiskBand } from '@/lib/risk-zones';

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528];
const MEXICO_BOUNDS: [[number, number], [number, number]] = [
  [14.4, -118.4],
  [32.7, -86.7],
];

// Match by state_code (geojson uses number 1-32, our data uses string "01"-"32")
const riskByCode = new Map<number, (typeof stateRisk)[number]>(
  stateRisk.map((s) => [parseInt(s.code, 10), s]),
);

function colorForBand(band: ReturnType<typeof getRiskBand>): string {
  return { alto: '#dc2626', medio: '#f59e0b', bajo: '#10b981' }[band];
}

function styleFor(feature?: Feature<Geometry, { state_code: number }>): PathOptions {
  const code = feature?.properties?.state_code;
  if (typeof code !== 'number') return {};
  const info = riskByCode.get(code);
  if (!info) return {};
  const band = getRiskBand(info.risk_score);
  return {
    fillColor: colorForBand(band),
    fillOpacity: 0.55,
    color: '#ffffff',
    weight: 1.5,
    opacity: 1,
  };
}

export default function RiskMap() {
  const router = useRouter();
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/data/mexico-states.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: FeatureCollection) => {
        if (active) setData(json);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => { active = false; };
  }, []);

  function onEachFeature(feature: Feature<Geometry, { state_code: number; state_name: string }>, layer: Layer) {
    const code = feature.properties.state_code;
    const info = riskByCode.get(code);
    if (!info) return;

    const band = getRiskBand(info.risk_score);
    const bandLabel = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }[band];

    layer.bindTooltip(
      `<div style="font-family:system-ui;font-size:12px;line-height:1.4">
         <div style="font-weight:700;color:#18181b">${info.name}</div>
         <div style="color:#71717a;font-size:11px">Score ${info.risk_score}/100 · Riesgo ${bandLabel}</div>
         <div style="color:#2563eb;font-size:11px;font-weight:600;margin-top:2px">Click para ver detalle →</div>
       </div>`,
      { sticky: true, direction: 'top', opacity: 0.95 },
    );

    layer.on({
      mouseover: (e) => {
        const target = e.target as { setStyle: (s: PathOptions) => void };
        target.setStyle({ fillOpacity: 0.85, weight: 2.5 });
      },
      mouseout: (e) => {
        const target = e.target as { setStyle: (s: PathOptions) => void };
        target.setStyle({ fillOpacity: 0.55, weight: 1.5 });
      },
      click: () => {
        router.push(`/zonas-riesgo/${info.slug}`);
      },
    });
  }

  if (error) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-zinc-100 rounded-xl text-zinc-500 text-sm">
        No se pudo cargar el mapa. Continúa explorando los estados abajo.
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-zinc-200">
      <MapContainer
        center={MEXICO_CENTER}
        zoom={5}
        minZoom={4}
        maxZoom={7}
        maxBounds={MEXICO_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        {data && (
          <GeoJSON
            data={data}
            style={styleFor}
            onEachFeature={(f, l) => onEachFeature(f as Feature<Geometry, { state_code: number; state_name: string }>, l)}
          />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-zinc-200 px-3 py-2.5 text-[11px] z-[400]">
        <div className="font-bold text-zinc-700 mb-1.5 uppercase tracking-wider text-[10px]">Riesgo SESNSP</div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#dc2626', opacity: 0.55 }} />
          <span className="text-zinc-600">Alto (≥70)</span>
        </div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#f59e0b', opacity: 0.55 }} />
          <span className="text-zinc-600">Medio (40-69)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#10b981', opacity: 0.55 }} />
          <span className="text-zinc-600">Bajo (&lt;40)</span>
        </div>
      </div>

      {!data && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/80 backdrop-blur-sm z-[450]">
          <div className="text-zinc-500 text-sm">Cargando mapa…</div>
        </div>
      )}
    </div>
  );
}
