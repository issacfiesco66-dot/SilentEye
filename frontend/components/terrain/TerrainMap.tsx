'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface TerrainLayer {
  name: string;
  tileUrl: string;
  type: string;
}

interface POI {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

interface Anomaly {
  id: number;
  latitude: number;
  longitude: number;
  areaM2: number;
  severity: number;
  type: 'vegetation_loss' | 'soil_exposure' | 'both';
  ndviChange: number;
  bsiChange: number;
  saviChange?: number;
}

// Forensic explanations for map popups (Spanish — primary language)
const FORENSIC_POPUP: Record<string, { icon: string; title: string; why: string; lookFor: string }> = {
  vegetation_loss: {
    icon: '🌿',
    title: 'Pérdida de vegetación',
    why: 'Al excavar se remueve la vegetación. El satélite detecta este cambio incluso si se intentó cubrir.',
    lookFor: 'Buscar: vegetación aplastada, diferente al entorno, montículos.',
  },
  soil_exposure: {
    icon: '🟤',
    title: 'Suelo expuesto',
    why: 'Tierra removida refleja luz diferente al suelo natural. Señal de excavación.',
    lookFor: 'Buscar: parches de tierra suelta, color diferente, hundimientos.',
  },
  both: {
    icon: '⚠️',
    title: 'Vegetación removida + suelo expuesto',
    why: 'Señal MÁS FUERTE: patrón clásico de excavación reciente. Priorizar.',
    lookFor: 'Buscar: tierra suelta sin vegetación, marcas de herramientas.',
  },
};

interface TerrainMapProps {
  center: [number, number]; // [lat, lng]
  radiusKm: number;
  layers: TerrainLayer[];
  activeLayer: string | null;
  opacity: number;
  pois: POI[];
  anomalies: Anomaly[];
  onMapClick?: (lat: number, lng: number) => void;
  onSelectAnomaly?: (anomaly: Anomaly) => void;
  comparisonMode: boolean;
  beforeLayer: string | null;
  afterLayer: string | null;
  splitPosition: number; // 0-100
}

// Anomaly marker icon — pulsing circle with severity color
function createAnomalyIcon(severity: number) {
  const color = severity >= 70 ? '#dc2626' : severity >= 40 ? '#f59e0b' : '#eab308';
  const size = severity >= 70 ? 32 : severity >= 40 ? 26 : 22;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;position:relative;">
      <div style="position:absolute;inset:0;background:${color};border-radius:50%;opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:4px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      </div>
      <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0}}</style>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// POI marker icon
function createPoiIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:#f59e0b;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8Z"/></svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

/** Handles map click events */
function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Handles comparison clip mask for split view */
function ComparisonClip({ splitPosition }: { splitPosition: number }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const overlayPanes = container.querySelectorAll('.leaflet-overlay-pane, .leaflet-tile-pane');
    // Apply clip to the second overlay layer
    const tilePane = container.querySelector('.leaflet-tile-pane');
    if (tilePane) {
      const children = tilePane.children;
      // The last tile layer gets clipped to the right portion
      if (children.length >= 3) {
        const afterTile = children[children.length - 1] as HTMLElement;
        afterTile.style.clipPath = `inset(0 0 0 ${splitPosition}%)`;
      }
    }
  }, [map, splitPosition]);

  return null;
}

/** Controls map view changes */
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      map.setView(center, zoom);
      initialized.current = true;
    }
  }, [map, center, zoom]);

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);

  return null;
}

export default function TerrainMap({
  center,
  radiusKm,
  layers,
  activeLayer,
  opacity,
  pois,
  anomalies,
  onMapClick,
  onSelectAnomaly,
  comparisonMode,
  beforeLayer,
  afterLayer,
  splitPosition,
}: TerrainMapProps) {
  const poiIcon = createPoiIcon();

  const zoom = radiusKm <= 1 ? 15 : radiusKm <= 3 ? 14 : radiusKm <= 5 ? 13 : 12;

  // Find active tile layer URLs
  const activeTile = layers.find((l) => l.name === activeLayer);
  const beforeTile = layers.find((l) => l.name === beforeLayer);
  const afterTile = layers.find((l) => l.name === afterLayer);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapController center={center} zoom={zoom} />

        {/* Base tile */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />

        {/* Analysis overlay — single layer mode */}
        {!comparisonMode && activeTile && (
          <TileLayer
            key={activeTile.name}
            url={activeTile.tileUrl}
            opacity={opacity}
            maxZoom={20}
          />
        )}

        {/* Comparison mode — two layers */}
        {comparisonMode && beforeTile && (
          <TileLayer
            key={`before-${beforeTile.name}`}
            url={beforeTile.tileUrl}
            opacity={opacity}
            maxZoom={20}
          />
        )}
        {comparisonMode && afterTile && (
          <TileLayer
            key={`after-${afterTile.name}`}
            url={afterTile.tileUrl}
            opacity={opacity}
            maxZoom={20}
          />
        )}
        {comparisonMode && <ComparisonClip splitPosition={splitPosition} />}

        {/* Analysis radius circle */}
        {radiusKm > 0 && (
          <Circle
            center={center}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#f59e0b',
              weight: 2,
              fillColor: '#f59e0b',
              fillOpacity: 0.05,
              dashArray: '6 4',
            }}
          />
        )}

        {/* Center marker */}
        <Marker
          position={center}
          icon={L.divIcon({
            className: '',
            html: `<div style="width:12px;height:12px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          })}
        />

        {/* POI markers */}
        {pois.map((poi) => (
          <Marker key={poi.id} position={[poi.latitude, poi.longitude]} icon={poiIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{poi.name}</p>
                {poi.notes && <p className="text-zinc-500 mt-1">{poi.notes}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Anomaly markers */}
        {anomalies.map((a) => {
          const info = FORENSIC_POPUP[a.type] || FORENSIC_POPUP.soil_exposure;
          const sevLabel = a.severity >= 70 ? 'ALTA' : a.severity >= 40 ? 'MEDIA' : 'BAJA';
          const sevColor = a.severity >= 70 ? '#dc2626' : a.severity >= 40 ? '#d97706' : '#ca8a04';
          return (
            <Marker
              key={`anomaly-${a.id}`}
              position={[a.latitude, a.longitude]}
              icon={createAnomalyIcon(a.severity)}
              eventHandlers={{ click: () => onSelectAnomaly?.(a) }}
            >
              <Popup maxWidth={280} minWidth={220}>
                <div style={{ fontSize: '11px', lineHeight: '1.5', fontFamily: 'system-ui, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{info.icon}</span>
                    <span style={{ fontWeight: 700, color: '#1f2937' }}>#{a.id} {info.title}</span>
                  </div>
                  <div style={{ background: sevColor, color: '#fff', display: 'inline-block', padding: '1px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, marginBottom: '6px' }}>
                    {sevLabel} — {a.severity}/100
                  </div>
                  <p style={{ color: '#374151', margin: '4px 0' }}>
                    <strong>¿Por qué buscar aquí?</strong><br/>
                    {info.why}
                  </p>
                  <p style={{ color: '#92400e', background: '#fffbeb', padding: '4px 6px', borderRadius: '4px', margin: '4px 0', fontSize: '10px' }}>
                    🔍 {info.lookFor}
                  </p>
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '4px', marginTop: '6px', color: '#6b7280', fontSize: '10px' }}>
                    <p>Área: {a.areaM2 >= 10000 ? `${(a.areaM2 / 10000).toFixed(1)} ha` : `${a.areaM2} m²`}
                    {a.areaM2 < 500 ? ' (compatible con fosa individual)' : a.areaM2 < 10000 ? ' (zona de actividad)' : ''}</p>
                    <p style={{ fontFamily: 'monospace', marginTop: '2px' }}>📍 {a.latitude.toFixed(6)}, {a.longitude.toFixed(6)}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Map click handler */}
        {onMapClick && <ClickHandler onClick={onMapClick} />}
      </MapContainer>

      {/* Comparison divider line */}
      {comparisonMode && beforeTile && afterTile && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-[999] pointer-events-none"
          style={{ left: `${splitPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3l-5 9 5 9" /><path d="M16 3l5 9-5 9" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
