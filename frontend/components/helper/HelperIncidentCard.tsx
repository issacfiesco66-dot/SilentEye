'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const EMERGENCY_NUMBER = '911';
const GOOGLE_MAPS_URL = 'https://www.google.com/maps?q=';

interface Incident {
  id: string;
  status: string;
  latitude: number;
  longitude: number;
  plate?: string;
  driver_name?: string;
  started_at: string;
}

interface Location {
  latitude: number;
  longitude: number;
  plate?: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'hace un momento';
  if (diffMin === 1) return 'hace 1 min';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  return h === 1 ? 'hace 1 h' : `hace ${h} h`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface HelperIncidentCardProps {
  incident: Incident;
  vehicleLocation?: Location | null;
  helperLocation?: { latitude: number; longitude: number } | null;
  onStatusChange: () => void;
  onDecline: () => void;
}

export default function HelperIncidentCard({
  incident,
  vehicleLocation,
  helperLocation,
  onStatusChange,
  onDecline,
}: HelperIncidentCardProps) {
  const [loading, setLoading] = useState<'going' | 'decline' | null>(null);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const lat = vehicleLocation?.latitude ?? incident.latitude;
  const lng = vehicleLocation?.longitude ?? incident.longitude;
  const distanceKm =
    helperLocation && vehicleLocation
      ? haversineKm(
          helperLocation.latitude,
          helperLocation.longitude,
          lat,
          lng
        )
      : null;
  const googleMapsLink = `${GOOGLE_MAPS_URL}${lat},${lng}`;

  const handleVoyEnCamino = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading('going');
    try {
      const res = await fetch(`${API}/api/incidents/${incident.id}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'attending' }),
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      if (res.ok) onStatusChange();
    } finally {
      setLoading(null);
    }
  };

  const handleNoPuedoAtender = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading('decline');
    try {
      const res = await fetch(`${API}/api/incidents/${incident.id}/followers/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        setShowDeclineConfirm(false);
        onDecline();
      }
    } finally {
      setLoading(null);
    }
  };

  const canAct = loading === null;
  const isAttending = incident.status === 'attending';

  return (
    <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
        </span>
        <h2 className="font-bold text-red-600 text-sm">PANIC</h2>
      </div>
      <p className="font-semibold text-zinc-900">{incident.plate || 'Sin placa'}</p>
      <p className="text-zinc-500 text-[13px]">{incident.driver_name || 'Conductor'}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-[13px] text-zinc-400">
        <span>{timeAgo(incident.started_at)}</span>
        {distanceKm != null && (
          <span>• ~{distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}</span>
        )}
        {vehicleLocation && <span>• Ubicación en vivo</span>}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {!isAttending && (
          <button
            onClick={handleVoyEnCamino}
            disabled={!canAct}
            className="w-full py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 font-semibold text-white text-sm transition-colors"
          >
            {loading === 'going' ? 'Enviando...' : 'Voy en camino'}
          </button>
        )}
        <a
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-center font-semibold text-zinc-900 text-sm transition-colors"
        >
          Abrir en Google Maps
        </a>
        <a
          href={`tel:${EMERGENCY_NUMBER}`}
          className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-center font-semibold text-white text-sm transition-colors"
        >
          Llamar emergencia
        </a>
        {!showDeclineConfirm ? (
          <button
            onClick={() => setShowDeclineConfirm(true)}
            disabled={!canAct}
            className="w-full py-3 rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50 disabled:opacity-50 text-[13px] transition-colors"
          >
            No puedo atender
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeclineConfirm(false)}
              disabled={!canAct}
              className="flex-1 py-2 rounded-lg border border-zinc-200 text-zinc-400 text-[13px]"
            >
              Cancelar
            </button>
            <button
              onClick={handleNoPuedoAtender}
              disabled={!canAct}
              className="flex-1 py-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 text-[13px] font-medium disabled:opacity-50 transition-colors"
            >
              {loading === 'decline' ? '...' : 'Confirmar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
