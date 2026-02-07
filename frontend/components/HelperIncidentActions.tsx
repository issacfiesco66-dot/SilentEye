'use client';

import { useState } from 'react';

interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  plate?: string;
  driver_name?: string;
  status?: string;
}

interface Location {
  imei?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  plate?: string;
}

const EMERGENCY_NUMBER = '911';
const GOOGLE_MAPS_URL = 'https://www.google.com/maps?q=';

export default function HelperIncidentActions({
  incident,
  liveLocations,
}: {
  incident: Incident;
  liveLocations: Location[];
}) {
  const liveLoc = liveLocations.find((loc) => loc.plate === incident.plate);
  const lat = liveLoc?.latitude ?? incident.latitude;
  const lng = liveLoc?.longitude ?? incident.longitude;
  const isLive = !!liveLoc;

  const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  const googleMapsLink = `${GOOGLE_MAPS_URL}${lat},${lng}`;
  const fullReport = `Pánico vehicular - Placa: ${incident.plate || 'N/A'} - Ubicación: ${coordsText} - ${googleMapsLink}`;
  const [copied, setCopied] = useState(false);

  const copyLocation = async () => {
    try {
      await navigator.clipboard.writeText(fullReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(coordsText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        alert('No se pudo copiar. Usa: ' + coordsText);
      }
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-panic">🚨 Seguimiento activo</h3>
      <p className="text-slate-300 text-sm">
        {incident.plate || 'Sin placa'} • {incident.driver_name || 'Conductor'}
      </p>
      <p className="text-slate-400 text-xs">
        {isLive ? '📍 Ubicación en tiempo real' : '📍 Última posición reportada'}
      </p>
      <p className="text-slate-500 text-xs font-mono">{coordsText}</p>

      <div className="flex flex-col gap-2 pt-2">
        <a
          href={`tel:${EMERGENCY_NUMBER}`}
          className="flex items-center justify-center gap-2 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium"
        >
          📞 Llamar al {EMERGENCY_NUMBER}
        </a>
        <button
          onClick={copyLocation}
          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-white font-medium ${
            copied ? 'bg-green-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {copied ? '✓ Copiado' : '📋 Copiar ubicación exacta'}
        </button>
        <a
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium"
        >
          🗺️ Abrir en Google Maps
        </a>
      </div>
    </div>
  );
}
