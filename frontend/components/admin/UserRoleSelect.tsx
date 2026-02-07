'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const ROLES = [
  { value: 'driver', label: 'Conductor' },
  { value: 'helper', label: 'Helper' },
] as const;

export default function UserRoleSelect({
  userId,
  currentRole,
  onRoleChange,
  currentUserId,
}: {
  userId: string;
  currentRole: string;
  onRoleChange: (newRole: string) => void;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwnUser = currentUserId && userId === currentUserId;
  const disabled = loading || isOwnUser;

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

  if (currentRole === 'admin') {
    return <span className="text-slate-400 text-sm">Admin</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={ROLES.some((r) => r.value === currentRole) ? currentRole : 'driver'}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className="px-2 py-1 text-sm rounded bg-slate-700 border border-slate-600 disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {isOwnUser && (
        <span className="text-slate-500 text-xs">No puedes cambiar tu propio rol</span>
      )}
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
