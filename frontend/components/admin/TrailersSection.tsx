'use client';
/**
 * SilentEye — Admin: Logística Blindada (trailers).
 *
 * Lista de trailers (vehículos con metadata de carga), estado en vivo
 * (ubicación + adherencia a ruta + zona de riesgo) y feed de alertas
 * generadas por el motor de reglas (off-route, paradas sospechosas,
 * entrada a zona roja).
 */
import { useEffect, useState, useCallback } from 'react';

interface Trailer {
  id: string;
  plate: string;
  imei: string;
  name?: string | null;
  cargo_type: string | null;
  capacity_kg: number | null;
  trailer_plates: string | null;
  has_temperature_sensor: boolean;
  fleet_owner_id: string | null;
  notes: string | null;
  created_at: string;
}

interface RiskZone {
  id: string;
  name: string;
  category: string;
  risk_score: number;
  source: string;
}

interface Status {
  location: { latitude: number; longitude: number; speed: number; timestamp_at: string };
  risk: { score: number; zones: RiskZone[] };
  adherence: {
    on_route: boolean;
    distance_m: number;
    buffer_m: number;
    route: { id: string; name: string | null; status: string } | null;
  };
}

interface Alert {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  resolved: boolean;
  created_at: string;
}

const CARGO_LABEL: Record<string, string> = {
  refrigerated: 'Refrigerado',
  dry: 'Seco',
  tanker: 'Tanque',
  flatbed: 'Plataforma',
  container: 'Contenedor',
  auto_carrier: 'Auto-transporte',
  other: 'Otro',
};

const ALERT_LABEL: Record<string, string> = {
  off_route: 'Fuera de ruta',
  risk_zone_entry: 'Entró a zona de riesgo',
  suspicious_stop: 'Parada sospechosa',
  route_deviation: 'Desviación',
  temperature_anomaly: 'Anomalía térmica',
  satellite_anomaly_detected: 'Anomalía satelital',
  eta_breach: 'ETA excedido',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

export default function TrailersSection() {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Trailer | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadTrailers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trailers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTrailers(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatusAndAlerts = useCallback(async (trailerId: string) => {
    setStatusLoading(true);
    setStatus(null);
    setAlerts([]);
    try {
      const [statusRes, alertsRes] = await Promise.all([
        fetch(`/api/trailers/${trailerId}/status`),
        fetch(`/api/trailers/${trailerId}/alerts?limit=20`),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch {
      /* ignore — partial data is fine */
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => { loadTrailers(); }, [loadTrailers]);

  useEffect(() => {
    if (!selected) return;
    loadStatusAndAlerts(selected.id);
    const interval = setInterval(() => loadStatusAndAlerts(selected.id), 30_000);
    return () => clearInterval(interval);
  }, [selected, loadStatusAndAlerts]);

  if (loading) return <div className="text-zinc-500 text-sm">Cargando trailers…</div>;
  if (error) return <div className="text-red-600 text-sm">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Logística Blindada</h2>
          <p className="text-sm text-zinc-500">Trailers monitoreados con análisis de ruta, zonas de riesgo y validación satelital.</p>
        </div>
        <button onClick={loadTrailers} className="text-xs text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded border border-zinc-200">
          Actualizar
        </button>
      </div>

      {trailers.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center">
          <p className="font-semibold text-zinc-900 mb-2">Aún no hay trailers registrados</p>
          <p className="text-sm text-zinc-500">
            Asigna metadata de carga a un vehículo Teltonika existente con <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs">POST /api/trailers</code> (vehicle_id requerido).
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">{trailers.length} trailers</p>
            </div>
            <ul className="divide-y divide-zinc-100 max-h-[600px] overflow-auto">
              {trailers.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelected(t)}
                    className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition ${selected?.id === t.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-900">{t.plate}</span>
                      {t.cargo_type && (
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                          {CARGO_LABEL[t.cargo_type] || t.cargo_type}
                        </span>
                      )}
                    </div>
                    {t.name && <div className="text-xs text-zinc-500 mt-0.5">{t.name}</div>}
                    <div className="text-[11px] text-zinc-400 mt-1 font-mono">{t.imei}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center text-zinc-500">
                Selecciona un trailer para ver su estado en tiempo real y alertas.
              </div>
            ) : (
              <>
                <div className="bg-white border border-zinc-200 rounded-lg p-5">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">{selected.plate}</h3>
                      <p className="text-xs text-zinc-500">{selected.imei}</p>
                    </div>
                    {selected.cargo_type && (
                      <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded">
                        {CARGO_LABEL[selected.cargo_type]}
                        {selected.capacity_kg && ` · ${selected.capacity_kg} kg`}
                      </span>
                    )}
                  </div>

                  {statusLoading && !status ? (
                    <div className="text-sm text-zinc-500 py-4">Consultando estado…</div>
                  ) : status ? (
                    <div className="grid sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Ubicación</p>
                        <p className="font-mono text-zinc-900">
                          {status.location.latitude.toFixed(5)}, {status.location.longitude.toFixed(5)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {status.location.speed} km/h · {new Date(status.location.timestamp_at).toLocaleTimeString('es-MX')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Zona de riesgo</p>
                        <p className={`font-bold ${status.risk.score >= 70 ? 'text-red-600' : status.risk.score >= 40 ? 'text-amber-600' : 'text-green-600'}`}>
                          {status.risk.score}/100
                        </p>
                        {status.risk.zones[0] && (
                          <p className="text-xs text-zinc-500 mt-1">{status.risk.zones[0].name}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Adherencia</p>
                        {status.adherence.route ? (
                          <>
                            <p className={`font-bold ${status.adherence.on_route ? 'text-green-600' : 'text-red-600'}`}>
                              {status.adherence.on_route ? 'En ruta' : 'Desviado'}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {status.adherence.distance_m}m del trazo (buffer {status.adherence.buffer_m}m)
                            </p>
                          </>
                        ) : (
                          <p className="text-zinc-500">Sin ruta planeada</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500 py-4">Sin datos GPS recientes para este trailer.</div>
                  )}
                </div>

                <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">Alertas recientes</p>
                    <span className="text-xs text-zinc-500">{alerts.filter((a) => !a.resolved).length} sin resolver</span>
                  </div>
                  {alerts.length === 0 ? (
                    <div className="p-6 text-sm text-zinc-500 text-center">Sin alertas registradas.</div>
                  ) : (
                    <ul className="divide-y divide-zinc-100 max-h-96 overflow-auto">
                      {alerts.map((a) => (
                        <li key={a.id} className="px-5 py-3 flex items-start gap-3">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${SEVERITY_COLORS[a.severity]} flex-shrink-0`}>
                            {a.severity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-900 font-medium">{ALERT_LABEL[a.alert_type] || a.alert_type}</p>
                            {a.message && <p className="text-xs text-zinc-500 mt-0.5">{a.message}</p>}
                            <p className="text-[11px] text-zinc-400 mt-1">
                              {new Date(a.created_at).toLocaleString('es-MX')}
                              {a.resolved && ' · Resuelto'}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
