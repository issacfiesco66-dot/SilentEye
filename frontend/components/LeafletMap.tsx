'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fallback: centro de México
const MEXICO_CENTER: [number, number] = [19.4326, -99.1332];

// Custom icon factories
function createIcon(color: string, size: number, borderColor = 'white') {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid ${borderColor};box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createIncidentIcon(selected: boolean) {
  const size = selected ? 36 : 30;
  const bg = selected ? '#dc2626' : '#ef4444';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:${selected ? 18 : 16}px;cursor:pointer;box-shadow:0 2px 8px rgba(220,38,38,0.4);transform:${selected ? 'scale(1.15)' : 'scale(1)'};transition:transform 0.2s;">🚨</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

const userIcon = createIcon('#2563eb', 18);
const vehicleIcon = createIcon('#10b981', 22);

interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  plate?: string;
  status?: string;
}

interface Location {
  imei?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  plate?: string;
}

// Sub-component to handle map imperative actions (flyTo, etc.)
function MapController({
  center,
  zoom,
  flyToTarget,
  onFlyDone,
}: {
  center: [number, number];
  zoom: number;
  flyToTarget: { lat: number; lng: number; zoom: number } | null;
  onFlyDone: () => void;
}) {
  const map = useMap();
  const initialRef = useRef(false);

  useEffect(() => {
    if (!initialRef.current) {
      initialRef.current = true;
      map.setView(center, zoom);
    }
  }, []);

  useEffect(() => {
    if (flyToTarget) {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom, { duration: 1 });
      onFlyDone();
    }
  }, [flyToTarget, map, onFlyDone]);

  return null;
}

export default function LeafletMap({
  incidents,
  liveLocations,
  selectedId,
  onSelectIncident,
  centerOnIncidentId,
  routeLine,
}: {
  incidents: Incident[];
  liveLocations: Location[];
  selectedId: string | null;
  onSelectIncident: (id: string | null) => void;
  centerOnIncidentId?: string | null;
  routeLine?: [number, number][];
}) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geoReady, setGeoReady] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const hasFlyedToDataRef = useRef(false);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGeoReady(true);
        if (!hasFlyedToDataRef.current) {
          setFlyToTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 13 });
        }
      },
      () => { setGeoReady(true); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
    const fallbackTimer = setTimeout(() => setGeoReady(true), 3000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const centerOnMe = useCallback(() => {
    if (userLocation) {
      setFlyToTarget({ lat: userLocation[0], lng: userLocation[1], zoom: 14 });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          setFlyToTarget({ lat: loc[0], lng: loc[1], zoom: 14 });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [userLocation]);

  const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'attending');
  const hasData = activeIncidents.length > 0 || liveLocations.length > 0;

  // Auto-center on first data arrival
  useEffect(() => {
    if (!hasData) return;
    const target = activeIncidents[0] || liveLocations[0];
    if (target && !hasFlyedToDataRef.current) {
      hasFlyedToDataRef.current = true;
      setFlyToTarget({ lat: target.latitude, lng: target.longitude, zoom: 14 });
    }
  }, [hasData, activeIncidents, liveLocations]);

  // Center on specific incident
  useEffect(() => {
    if (centerOnIncidentId) {
      const inc = activeIncidents.find((i) => i.id === centerOnIncidentId);
      if (inc) {
        setFlyToTarget({ lat: inc.latitude, lng: inc.longitude, zoom: 15 });
      }
    }
  }, [centerOnIncidentId, activeIncidents]);

  // Initial center priority: active incident > live location > user > Mexico
  const center: [number, number] = activeIncidents[0]
    ? [activeIncidents[0].latitude, activeIncidents[0].longitude]
    : liveLocations[0]
      ? [liveLocations[0].latitude, liveLocations[0].longitude]
      : userLocation ?? MEXICO_CENTER;

  const initialZoom = hasData ? 14 : userLocation ? 13 : 5;

  // Convert routeLine from [lng, lat] to [lat, lng] for Leaflet
  const leafletRouteLine: [number, number][] | undefined = routeLine?.map(
    ([lng, lat]) => [lat, lng] as [number, number]
  );

  return (
    <div className="relative w-full h-full">
      {!geoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 z-[1000] text-slate-300">
          Obteniendo ubicación...
        </div>
      )}
      <button
        onClick={centerOnMe}
        className="absolute bottom-4 right-4 z-[1000] px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm shadow border border-slate-600"
        title="Centrar en mi ubicación"
      >
        Mi ubicación
      </button>
      <MapContainer
        center={center}
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController
          center={center}
          zoom={initialZoom}
          flyToTarget={flyToTarget}
          onFlyDone={() => setFlyToTarget(null)}
        />

        {/* User location */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon} />
        )}

        {/* Active incidents */}
        {activeIncidents.map((inc) => (
          <Marker
            key={`inc-${inc.id}`}
            position={[inc.latitude, inc.longitude]}
            icon={createIncidentIcon(selectedId === inc.id)}
            eventHandlers={{ click: () => onSelectIncident(inc.id) }}
          />
        ))}

        {/* Route line */}
        {leafletRouteLine && leafletRouteLine.length >= 2 && (
          <Polyline
            positions={leafletRouteLine}
            pathOptions={{
              color: '#2563eb',
              weight: 3,
              dashArray: '8 8',
              opacity: 0.8,
            }}
          />
        )}

        {/* Live vehicle locations */}
        {liveLocations.map((loc, idx) => (
          <Marker
            key={`loc-${loc.imei || loc.vehicleId || idx}`}
            position={[loc.latitude, loc.longitude]}
            icon={vehicleIcon}
          />
        ))}
      </MapContainer>
    </div>
  );
}
