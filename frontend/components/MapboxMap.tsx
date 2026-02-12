'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { Marker } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Fallback absoluto: centro de México (solo si geolocalización falla Y no hay datos)
const MEXICO_CENTER = { longitude: -99.1332, latitude: 19.4326 };

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

export default function MapboxMap({
  token,
  incidents,
  liveLocations,
  selectedId,
  onSelectIncident,
  centerOnIncidentId,
}: {
  token: string;
  incidents: Incident[];
  liveLocations: Location[];
  selectedId: string | null;
  onSelectIncident: (id: string | null) => void;
  centerOnIncidentId?: string | null;
}) {
  const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(null);
  const [geoReady, setGeoReady] = useState(false);
  const mapRef = useRef<MapRef>(null);
  const hasFlyedToDataRef = useRef(false);

  // Obtener geolocalización del browser al montar
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
        setUserLocation(loc);
        setGeoReady(true);
        // Si el mapa ya está montado y no hay datos, centrar en usuario
        if (mapRef.current && !hasFlyedToDataRef.current) {
          mapRef.current.flyTo({ center: [loc.longitude, loc.latitude], zoom: 13, duration: 1000 });
        }
      },
      () => { setGeoReady(true); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
    // Si geolocalización tarda mucho, mostrar mapa de todas formas
    const fallbackTimer = setTimeout(() => setGeoReady(true), 3000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const centerOnMe = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({ center: [userLocation.longitude, userLocation.latitude], zoom: 14, duration: 1000 });
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
          setUserLocation(loc);
          mapRef.current?.flyTo({ center: [loc.longitude, loc.latitude], zoom: 14, duration: 1000 });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [userLocation]);

  const activeIncidents = incidents.filter((i) => i.status === 'active' || i.status === 'attending');
  const hasData = activeIncidents.length > 0 || liveLocations.length > 0;

  // Cuando llegan incidentes/vehículos nuevos via WebSocket, centrar el mapa automáticamente
  useEffect(() => {
    if (!mapRef.current || !hasData) return;
    const target = activeIncidents[0] || liveLocations[0];
    if (target && !hasFlyedToDataRef.current) {
      hasFlyedToDataRef.current = true;
      mapRef.current.flyTo({ center: [target.longitude, target.latitude], zoom: 14, duration: 1000 });
    }
  }, [hasData, activeIncidents, liveLocations]);

  useEffect(() => {
    if (centerOnIncidentId && mapRef.current) {
      const inc = activeIncidents.find((i) => i.id === centerOnIncidentId);
      if (inc) {
        mapRef.current.flyTo({ center: [inc.longitude, inc.latitude], zoom: 15, duration: 1000 });
      }
    }
  }, [centerOnIncidentId, activeIncidents]);

  // Prioridad de centro inicial: incidente activo > vehículo en vivo > geolocalización del usuario > CDMX
  const center = activeIncidents[0]
    ? { longitude: activeIncidents[0].longitude, latitude: activeIncidents[0].latitude }
    : liveLocations[0]
      ? { longitude: liveLocations[0].longitude, latitude: liveLocations[0].latitude }
      : userLocation ?? MEXICO_CENTER;

  return (
    <div className="relative w-full h-full">
      {!geoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 z-20 text-slate-300">
          Obteniendo ubicación...
        </div>
      )}
      <button
        onClick={centerOnMe}
        className="absolute bottom-4 right-4 z-10 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm shadow border border-slate-600"
        title="Centrar en mi ubicación"
      >
        Mi ubicación
      </button>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          ...center,
          zoom: hasData ? 14 : userLocation ? 13 : 5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {userLocation && (
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="center">
            <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg" title="Tu ubicación" />
          </Marker>
        )}
        {activeIncidents.map((inc) => (
          <Marker
            key={`inc-${inc.id}`}
            longitude={inc.longitude}
            latitude={inc.latitude}
            anchor="bottom"
            onClick={() => onSelectIncident(inc.id)}
          >
            <div
              className={`cursor-pointer w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                selectedId === inc.id ? 'bg-red-600 scale-125' : 'bg-red-500 hover:bg-red-600'
              }`}
              title={inc.plate || 'Incidente'}
            >
              🚨
            </div>
          </Marker>
        ))}
        {liveLocations.map((loc, idx) => (
          <Marker
            key={`loc-${loc.imei || loc.vehicleId || idx}`}
            longitude={loc.longitude}
            latitude={loc.latitude}
            anchor="center"
          >
            <div
              className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg animate-pulse"
              title={`${loc.plate || 'Vehículo'} ${loc.speed != null ? `• ${loc.speed} km/h` : ''}`}
            >
              <span className="sr-only">Vehículo en vivo</span>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
