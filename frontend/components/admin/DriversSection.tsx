'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import UserRoleSelect from './UserRoleSelect';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const MapboxMap = dynamic(() => import('../MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-700 text-slate-300">
      Cargando mapa…
    </div>
  ),
});

interface DriversSectionProps {
  currentUserId?: string;
}

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  is_active?: boolean;
}

interface Vehicle {
  id: string;
  plate: string;
  imei?: string;
  driver_id?: string;
  driver_name?: string;
}

interface GpsPosition {
  imei?: string;
  vehicleId?: string;
  plate?: string;
  latitude: number;
  longitude: number;
  speed?: number;
}

export default function DriversSection({ currentUserId }: DriversSectionProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ phone: '', name: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ phone: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [positions, setPositions] = useState<GpsPosition[]>([]);

  const drivers = users.filter((u) => u.role === 'driver');

  const loadPositions = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API}/api/gps/latest-positions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
      }
    } catch {
      // Silently ignore position errors
    }
  }, []);

  const load = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [uRes, vRes] = await Promise.all([
        fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (uRes.status === 401 || vRes.status === 401) {
        router.replace('/login');
        return;
      }
      if (uRes.ok) setUsers(await uRes.json());
      if (vRes.ok) setVehicles(await vRes.json());
      await loadPositions(token);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Actualizar posiciones GPS cada 5 segundos
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const interval = setInterval(() => loadPositions(token), 5000);
    return () => clearInterval(interval);
  }, [loadPositions]);

  // Posiciones de vehículos con conductor asignado, enriquecidas con nombre del conductor
  const liveLocationsForMap = positions
    .filter((p) => {
      const v = vehicles.find((ve) => ve.id === p.vehicleId || (ve.imei && ve.imei === p.imei));
      return v?.driver_id != null;
    })
    .map((p) => {
      const v = vehicles.find((ve) => ve.id === p.vehicleId || (ve.imei && ve.imei === p.imei));
      const plate = p.plate || v?.plate || 'Sin placa';
      const label = v?.driver_name ? `${v.driver_name} · ${plate}` : plate;
      return { ...p, plate: label };
    });

  const createDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: driverForm.phone,
        name: driverForm.name,
        role: 'driver',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      router.replace('/login');
      return;
    }
    if (res.ok) {
      await load();
      setDriverForm({ phone: '', name: '' });
      setShowForm(false);
    } else {
      setError(data.error || 'Error al crear conductor');
    }
    setSaving(false);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: editForm.name, phone: editForm.phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      router.replace('/login');
      return;
    }
    if (res.ok) {
      await load();
      setEditingUser(null);
    } else {
      setError(data.error || 'Error al actualizar');
    }
    setSaving(false);
  };

  const deleteUser = async (u: User) => {
    if (!confirm(`¿Eliminar usuario ${u.name}?`)) return;
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/users/${u.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      router.replace('/login');
      return;
    }
    if (res.ok) {
      await load();
    } else {
      setError(data.error || 'Error al eliminar');
    }
  };

  const blockUser = async (u: User) => {
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/users/${u.id}/block`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      router.replace('/login');
      return;
    }
    if (res.ok) {
      await load();
    } else {
      setError(data.error || 'Error al bloquear/desbloquear');
    }
  };

  const getVehicleForDriver = (driverId: string) =>
    vehicles.find((v) => v.driver_id === driverId)?.plate;

  if (loading) {
    return <div className="p-6 text-slate-400">Cargando conductores...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Conductores</h2>
        <button
          type="button"
          onClick={() => { setShowForm(true); setError(''); }}
          className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500"
        >
          Nuevo conductor
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-slate-700">
        <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">Mapa de conductores y vehículos GPS</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ubicación en tiempo real de los vehículos asignados a conductores ({liveLocationsForMap.length} en mapa)
          </p>
        </div>
        <div className="h-[350px] bg-slate-800/50">
          {MAPBOX_TOKEN ? (
            <MapboxMap
              token={MAPBOX_TOKEN}
              incidents={[]}
              liveLocations={liveLocationsForMap}
              selectedId={null}
              onSelectIncident={() => {}}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4">
              <p>Configura NEXT_PUBLIC_MAPBOX_TOKEN para ver el mapa</p>
              <p className="text-sm mt-2">
                Vehículos con conductor: {liveLocationsForMap.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Nuevo conductor</h3>
            <form onSubmit={createDriver} className="space-y-3">
              <input
                required
                placeholder="Nombre completo"
                value={driverForm.name}
                onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              />
              <input
                required
                placeholder="Teléfono (ej. +51999999999)"
                value={driverForm.phone}
                onChange={(e) => setDriverForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              />
              <p className="text-slate-500 text-xs">El conductor usará este teléfono para iniciar sesión con OTP.</p>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50">{saving ? 'Creando...' : 'Crear conductor'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-600 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Nombre</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Teléfono</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Vehículo</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Rol</th>
              <th className="text-right py-3 px-2 text-slate-400 font-medium text-sm">Acción</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 && !showForm ? (
              <tr>
                <td colSpan={5} className="py-8 text-slate-500 text-center">
                  No hay conductores. Añade uno para asignar a vehículos.
                </td>
              </tr>
            ) : (
              drivers.map((d) => {
                const vehiclePlate = getVehicleForDriver(d.id);
                const hasNoVehicle = !vehiclePlate;
                return (
                  <tr key={d.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                    <td className="py-3 px-2 font-medium">{d.name}</td>
                    <td className="py-3 px-2 text-slate-400">{d.phone}</td>
                    <td className="py-3 px-2">
                      {hasNoVehicle ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                          Sin vehículo
                        </span>
                      ) : (
                        <span className="text-slate-400">{vehiclePlate}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-slate-400 capitalize">{d.role}</span>
                      {d.is_active === false && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">Bloqueado</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => {
                            setEditingUser(d);
                            setEditForm({ name: d.name, phone: d.phone });
                          }}
                          className="px-2 py-1 text-sm bg-slate-600 rounded hover:bg-slate-500"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => blockUser(d)}
                          className={`px-2 py-1 text-sm rounded ${d.is_active === false ? 'bg-emerald-600/80 hover:bg-emerald-600' : 'bg-amber-600/80 hover:bg-amber-600'}`}
                        >
                          {d.is_active === false ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button
                          onClick={() => deleteUser(d)}
                          disabled={d.id === currentUserId}
                          className="px-2 py-1 text-sm bg-red-600/80 rounded hover:bg-red-600 disabled:opacity-50"
                          title={d.id === currentUserId ? 'No puedes eliminarte a ti mismo' : 'Eliminar'}
                        >
                          Eliminar
                        </button>
                        <UserRoleSelect
                          userId={d.id}
                          currentRole={d.role}
                          onRoleChange={(role) => handleRoleChange(d.id, role)}
                          currentUserId={currentUserId ?? undefined}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {users.filter((u) => u.role !== 'driver').length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Otros usuarios</h3>
          <ul className="space-y-2">
            {users
              .filter((u) => u.role !== 'driver')
              .map((u) => (
                <li
                  key={u.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                >
                  <div>
                    <span className="font-medium">{u.name}</span>
                    <p className="text-slate-500 text-sm">{u.phone}</p>
                    {u.is_active === false && (
                      <span className="text-xs text-red-400">Bloqueado</span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => { setEditingUser(u); setEditForm({ name: u.name, phone: u.phone }); }}
                      className="px-2 py-1 text-sm bg-slate-600 rounded hover:bg-slate-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => blockUser(u)}
                      className={`px-2 py-1 text-sm rounded ${u.is_active === false ? 'bg-emerald-600/80' : 'bg-amber-600/80'}`}
                    >
                      {u.is_active === false ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      disabled={u.id === currentUserId || u.role === 'admin'}
                      className="px-2 py-1 text-sm bg-red-600/80 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                    <UserRoleSelect
                      userId={u.id}
                      currentRole={u.role}
                      onRoleChange={(role) => handleRoleChange(u.id, role)}
                      currentUserId={currentUserId ?? undefined}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Editar usuario</h3>
            <form onSubmit={updateUser} className="space-y-3">
              <input
                required
                placeholder="Nombre"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              />
              <input
                required
                placeholder="Teléfono"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              />
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-slate-600 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
