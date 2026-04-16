'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/hooks/useLocale';

const API = '';

/**
 * Rol descriptions shown in the admin user table.
 *
 * Semantics (documented here to avoid future confusion):
 *
 *  driver       — Tiene vehículo con GPS registrado. Puede ayudar a otros
 *                 conductores y helpers (tiene auto). Responde incidentes.
 *
 *  helper       — Ayudante/socorrista profesional. Conduce a diario y
 *                 responde emergencias vehiculares como rol principal.
 *
 *  citizen      — Usuario SOS: anda a pie o sin vehículo. Puede activar
 *                 pánico, NO puede responder incidentes ajenos.
 *
 *  fleet_owner  — Propietario de flota. Gestiona vehículos y conductores
 *                 de su flotilla.
 *
 *  verificador  — Miembro de colectivo de búsqueda. Hace trabajo de campo
 *                 forense (registro de hallazgos). No responde incidentes
 *                 vehiculares.
 *
 *  admin        — Acceso total. Solo otro admin puede cambiar este rol.
 */
const ROLE_OPTIONS = [
  { value: 'citizen',     label: 'Ciudadano / SOS (a pie)' },
  { value: 'driver',      label: 'Conductor (vehículo + GPS)' },
  { value: 'helper',      label: 'Ayudante/Socorrista' },
  { value: 'fleet_owner', label: 'Propietario de flota' },
  { value: 'verificador', label: 'Verificador de campo (colectivo)' },
] as const;

type AssignableRole = typeof ROLE_OPTIONS[number]['value'];

export default function UserRoleSelect({
  userId,
  currentRole,
  onRoleChange,
  onDeleted,
  currentUserId,
}: {
  userId: string;
  currentRole: string;
  onRoleChange: (newRole: string) => void;
  onDeleted?: () => void;
  currentUserId?: string;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwnUser = currentUserId && userId === currentUserId;
  const disabled = loading || !!isOwnUser;

  // If the current role isn't in our assignable list (e.g. 'admin'),
  // we show a static label — admins can't be changed by this control.
  if (currentRole === 'admin') {
    return <span className="text-zinc-400 text-sm">{t.admin.users.roles.admin}</span>;
  }

  // Pick the display value — fall back to 'citizen' (never silently show
  // 'driver' for a user that might actually be something else).
  const displayValue: AssignableRole =
    ROLE_OPTIONS.some((r) => r.value === currentRole)
      ? (currentRole as AssignableRole)
      : 'citizen';

  const handleChange = async (role: string) => {
    if (role === currentRole || isOwnUser) return;
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      if (res.status === 401 || res.status === 403) {
        router.replace('/login');
        return;
      }
      if (res.ok) {
        onRoleChange(role);
      } else if (res.status === 404 && onDeleted) {
        onDeleted();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al cambiar rol');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className="px-2 py-1 text-[13px] rounded bg-white border border-zinc-200 text-zinc-900 disabled:opacity-50 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {isOwnUser && (
        <span className="text-zinc-400 text-xs">No puedes cambiar tu propio rol</span>
      )}
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  );
}
