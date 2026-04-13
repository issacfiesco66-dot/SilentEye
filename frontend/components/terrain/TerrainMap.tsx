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

interface TerrainMapProps {
  center: [number, number]; // [lat, lng]
  radiusKm: number;
  layers: TerrainLayer[];
  activeLayer: string | null;
  opacity: number;
  pois: POI[];
  onMapClick?: (lat: number, lng: number) => void;
  comparisonMode: boolean;
  beforeLayer: string | null;
  afterLayer: string | null;
  splitPosition: number; // 0-100
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
  onMapClick,
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
