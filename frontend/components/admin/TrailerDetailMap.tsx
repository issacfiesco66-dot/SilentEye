'use client';
/**
 * SilentEye — Trailer detail map.
 *
 * Visualiza posición actual + ruta planeada + zonas de riesgo (overlay
 * de polígonos color-codeados por score) + alertas pinpointed. Usa el
 * mismo OpenStreetMap tile server que el resto de la app.
 *
 * El componente recibe los datos pre-fetched por el padre (TrailersSection).
 * No hace fetches por su cuenta — eso mantiene el componente puro y
 * permite que el padre orqueste el refresh cycle.
 */

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icons under Next.js — without this the
// default marker-icon.png 404s because webpack rewrites the URL paths.
// Pinning to unpkg avoids needing to copy the assets into /public.
type IconDefault = L.Icon.Default & { _getIconUrl?: () => string };
delete (L.Icon.Default.prototype as IconDefault)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface CurrentLocation {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp_at: string;
}

interface PlannedRoute {
  id: string;
  name: string | null;
  origin_lat: number; origin_lng: number;
  destination_lat: number; destination_lng: number;
  path: { type: string; coordinates: [number, number][] } | null;   // GeoJSON LineString (lng, lat)
  buffer_meters: number;
  status: string;
}

interface RiskZone {
  id: string;
  name: string;
  category: string;
  risk_score: number;
  source: string;
  zone: { type: string; coordinates: [number, number][][] };         // GeoJSON Polygon (lng, lat)
}

interface AlertPin {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  created_at: string;
}

interface Props {
  currentLocation: CurrentLocation | null;
  plannedRoute: PlannedRoute | null;
  riskZones: RiskZone[];
  alerts: AlertPin[];
}

const ALERT_LABEL: Record<string, string> = {
  off_route: 'Fuera de ruta',
  risk_zone_entry: 'Entró a zona de riesgo',
  suspicious_stop: 'Parada sospechosa',
  route_deviation: 'Desviación',
  temperature_anomaly: 'Anomalía térmica',
  satellite_anomaly_detected: 'Anomalía satelital',
  eta_breach: 'ETA excedido',
};

function FitBounds({ currentLocation, plannedRoute }: Pick<Props, 'currentLocation' | 'plannedRoute'>) {
  const map = useMap();
  useEffect(() => {
    if (!currentLocation && !plannedRoute) return;
    const points: L.LatLngTuple[] = [];
    if (currentLocation) points.push([currentLocation.latitude, currentLocation.longitude]);
    if (plannedRoute) {
      points.push([plannedRoute.origin_lat, plannedRoute.origin_lng]);
      points.push([plannedRoute.destination_lat, plannedRoute.destination_lng]);
    }
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, currentLocation, plannedRoute]);
  return null;
}

function riskColor(score: number): string {
  if (score >= 70) return '#dc2626';
  if (score >= 40) return '#f59e0b';
  return '#fbbf24';
}

function severityColor(s: AlertPin['severity']): string {
  return s === 'critical' ? '#dc2626' : s === 'warning' ? '#f59e0b' : '#3b82f6';
}

export default function TrailerDetailMap({ currentLocation, plannedRoute, riskZones, alerts }: Props) {
  const center: [number, number] = useMemo(() => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (plannedRoute) return [plannedRoute.origin_lat, plannedRoute.origin_lng];
    return [19.4326, -99.1332];                     // CDMX fallback
  }, [currentLocation, plannedRoute]);

  // Convert GeoJSON [lng, lat] → Leaflet [lat, lng].
  const routePolyline = useMemo<L.LatLngTuple[] | null>(() => {
    if (!plannedRoute) return null;
    if (plannedRoute.path?.coordinates?.length) {
      return plannedRoute.path.coordinates.map((c) => [c[1], c[0]] as L.LatLngTuple);
    }
    return [
      [plannedRoute.origin_lat, plannedRoute.origin_lng],
      [plannedRoute.destination_lat, plannedRoute.destination_lng],
    ];
  }, [plannedRoute]);

  const alertPins = alerts.filter((a) => a.latitude != null && a.longitude != null);

  return (
    <MapContainer center={center} zoom={11} className="h-[450px] w-full rounded-lg z-0" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds currentLocation={currentLocation} plannedRoute={plannedRoute} />

      {riskZones.map((z) => {
        if (!z.zone || z.zone.type !== 'Polygon' || !z.zone.coordinates?.[0]) return null;
        const positions = z.zone.coordinates[0].map((c) => [c[1], c[0]] as L.LatLngTuple);
        const color = riskColor(z.risk_score);
        return (
          <Polygon key={z.id} positions={positions} pathOptions={{ color, fillColor: color, fillOpacity: 0.18, weight: 2 }}>
            <Popup>
              <div className="text-xs">
                <p className="font-semibold mb-1">{z.name}</p>
                <p>Score: <strong style={{ color }}>{z.risk_score}/100</strong></p>
                <p>Categoría: {z.category}</p>
                <p>Fuente: {z.source}</p>
              </div>
            </Popup>
          </Polygon>
        );
      })}

      {routePolyline && (
        <Polyline
          positions={routePolyline}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            dashArray: plannedRoute?.path ? undefined : '6, 6',  // dashed for synthesized straight line
            opacity: 0.85,
          }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{plannedRoute?.name || 'Ruta planeada'}</p>
              <p>Estado: {plannedRoute?.status}</p>
              <p>Buffer: {plannedRoute?.buffer_meters}m</p>
            </div>
          </Popup>
        </Polyline>
      )}

      {plannedRoute && (
        <>
          <Circle
            center={[plannedRoute.origin_lat, plannedRoute.origin_lng]}
            radius={150}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.6 }}
          >
            <Popup><strong>Origen</strong></Popup>
          </Circle>
          <Circle
            center={[plannedRoute.destination_lat, plannedRoute.destination_lng]}
            radius={150}
            pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.6 }}
          >
            <Popup><strong>Destino</strong></Popup>
          </Circle>
        </>
      )}

      {currentLocation && (
        <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">Posición actual</p>
              <p>{currentLocation.speed} km/h</p>
              <p>{new Date(currentLocation.timestamp_at).toLocaleString('es-MX')}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {alertPins.map((a) => {
        const color = severityColor(a.severity);
        return (
          <Circle
            key={a.id}
            center={[a.latitude as number, a.longitude as number]}
            radius={120}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
          >
            <Popup>
              <div className="text-xs max-w-[220px]">
                <p className="font-semibold">{ALERT_LABEL[a.alert_type] || a.alert_type}</p>
                <p style={{ color }}>{a.severity.toUpperCase()}</p>
                {a.message && <p className="mt-1">{a.message}</p>}
                <p className="text-zinc-500 mt-1">{new Date(a.created_at).toLocaleString('es-MX')}</p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </MapContainer>
  );
}
