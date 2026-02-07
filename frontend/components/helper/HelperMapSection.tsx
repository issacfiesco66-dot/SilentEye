'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const LOCATION_THROTTLE_MS = 15000; // 15s (evitar rate limit 100/15min)
const LOCATION_MIN_METERS = 50;

const MapboxMap = dynamic(() => import('../MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
      Cargando mapa…
    </div>
  ),
});

interface Incident {
  id: string;
  vehicle_id?: string;
  status?: string;
  latitude: number;
  longitude: number;
  plate?: string;
}

interface Location {
  latitude: number;
  longitude: number;
  vehicleId?: string;
  plate?: string;
}

interface HelperMapSectionProps {
  incident: Incident;
  vehicleLocation?: Location | null;
  helperLocation?: { latitude: number; longitude: number } | null;
  onLocationSent?: () => void;
  onHelperLocationChange?: (loc: { latitude: number; longitude: number }) => void;
}

export default function HelperMapSection({
  incident,
  vehicleLocation,
  onLocationSent,
  onHelperLocationChange,
}: HelperMapSectionProps) {
  const [localHelperLoc, setLocalHelperLoc] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [geoReady, setGeoReady] = useState(false);
  const [centerKey, setCenterKey] = useState(0);
  const lastSentRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const sendingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  const vehicleCoords = vehicleLocation ?? {
    latitude: incident.latitude,
    longitude: incident.longitude,
  };

  const incidentsForMap = [
    {
      id: incident.id,
      latitude: vehicleCoords.latitude,
      longitude: vehicleCoords.longitude,
      plate: incident.plate,
      status: incident.status ?? 'active',
    },
  ];

  const liveLocationsForMap = vehicleLocation
    ? [
        {
          ...vehicleCoords,
          vehicleId: incident.vehicle_id,
          plate: incident.plate,
        },
      ]
    : [];

  const centerOnIncident = useCallback(() => {
    setCenterKey((k) => k + 1);
  }, []);

  // Geolocalización + envío a POST /helpers/location
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoReady(true);
      return;
    }

    const sendLocation = (lat: number, lng: number) => {
      if (sendingRef.current) return;
      const now = Date.now();
      const last = lastSentRef.current;
      if (last) {
        const elapsed = now - last.ts;
        const dist =
          6371000 *
          Math.acos(
            Math.min(
              1,
              Math.max(
                -1,
                Math.cos((lat * Math.PI) / 180) *
                  Math.cos((last.lat * Math.PI) / 180) *
                  Math.cos((lng * Math.PI) / 180 - (last.lng * Math.PI) / 180) +
                  Math.sin((lat * Math.PI) / 180) *
                    Math.sin((last.lat * Math.PI) / 180)
              )
            )
          );
        if (elapsed < LOCATION_THROTTLE_MS && dist < LOCATION_MIN_METERS) return;
      }

      const token = localStorage.getItem('token');
      if (!token) return;

      sendingRef.current = true;
      lastSentRef.current = { lat, lng, ts: now };

      fetch(`${API}/api/helpers/location`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
          } else if (res.ok) {
            onLocationSent?.();
          }
        })
        .catch(() => {})
        .finally(() => {
          sendingRef.current = false;
        });

      const loc = { latitude: lat, longitude: lng };
      setLocalHelperLoc(loc);
      onHelperLocationChange?.(loc);
    };

    const onPos = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const loc = { latitude: lat, longitude: lng };
      setLocalHelperLoc(loc);
      onHelperLocationChange?.(loc);
      setGeoReady(true);
      sendLocation(lat, lng);
    };

    const onErr = () => setGeoReady(true);

    const id = navigator.geolocation.watchPosition(
      onPos,
      onErr,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [onLocationSent]);

  return (
    <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden bg-slate-800 border border-slate-700 relative">
      {!geoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 z-10">
          <span className="text-slate-400">Obteniendo ubicación…</span>
        </div>
      )}
      {MAPBOX_TOKEN ? (
        <>
          <MapboxMap
            key={`helper-map-${centerKey}`}
            token={MAPBOX_TOKEN}
            incidents={incidentsForMap}
            liveLocations={liveLocationsForMap}
            selectedId={incident.id}
            onSelectIncident={() => {}}
            centerOnIncidentId={incident.id}
          />
          <button
            onClick={centerOnIncident}
            className="absolute bottom-4 left-4 z-10 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm shadow border border-slate-600"
          >
            Centrar
          </button>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4">
          <p>Mapa no configurado</p>
          <p className="text-sm mt-2">
            Vehículo: {vehicleCoords.latitude.toFixed(5)}, {vehicleCoords.longitude.toFixed(5)}
          </p>
          {localHelperLoc && (
            <p className="text-sm">
              Tú: {localHelperLoc.latitude.toFixed(5)}, {localHelperLoc.longitude.toFixed(5)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
