'use client';
/**
 * SilentEye — Vista del verificador de campo.
 *
 * Permite a un usuario con rol "verificador" crear nuevos reportes
 * de hallazgo y ver el historial de su team. No expone los controles
 * administrativos (matches, notificación a familia) — esos son del
 * admin del colectivo.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';
import FieldReportForm from '@/components/field-registry/FieldReportForm';
import {
  fieldReportsApi,
  CATEGORY_LABEL,
  STATUS_LABEL,
  type FieldReport,
} from '@/lib/field-registry-api';

export default function VerificadorPage() {
  const { user, ready, logout } = useSession({
    requiredPermission: 'submitFieldReports',
    fallbackPath: '/dashboard',
  });
  const [view, setView] = useState<'list' | 'create'>('list');
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await fieldReportsApi.list({ limit: 100 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="text-zinc-400">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 text-[13px] font-medium">
          ← Dashboard
        </Link>
        <span className="text-sm font-bold">Verificación de campo</span>
        <button onClick={logout} className="text-zinc-400 hover:text-zinc-600 text-[13px] font-medium">
          Salir
        </button>
      </header>

      <div className="p-3 md:p-6 max-w-3xl mx-auto">
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Mis hallazgos</h1>
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-zinc-900 text-white text-[13px] font-semibold rounded-md"
              >
                + Nuevo hallazgo
              </button>
            </div>

            {error && <div className="text-[13px] text-red-700 bg-red-50 p-2 rounded mb-3">{error}</div>}
            {loading && <p className="text-[13px] text-zinc-500">Cargando…</p>}
            {!loading && reports.length === 0 && (
              <div className="bg-zinc-50 rounded-xl p-6 text-center border border-zinc-200">
                <p className="text-[14px] text-zinc-600">Sin reportes todavía.</p>
                <p className="text-[12px] text-zinc-400 mt-1">
                  Cuando encuentres algo relevante en campo, usa el botón "Nuevo hallazgo".
                </p>
              </div>
            )}

            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className="bg-white border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[14px]">{CATEGORY_LABEL[r.category]}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-500 truncate">
                        {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)} · {new Date(r.report_date).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {view === 'create' && (
          <FieldReportForm
            onCreated={() => { setView('list'); load(); }}
            onCancel={() => setView('list')}
          />
        )}
      </div>
    </div>
  );
}
