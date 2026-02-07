'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserRoleSelect from './UserRoleSelect';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface DriversSectionProps {
  currentUserId?: string;
}

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
}

interface Vehicle {
  id: string;
  plate: string;
  driver_id?: string;
}

export default function DriversSection({ currentUserId }: DriversSectionProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ phone: '', name: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const drivers = users.filter((u) => u.role === 'driver');

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
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      setUsers((prev) => [...prev, data]);
      setDriverForm({ phone: '', name: '' });
      setShowForm(false);
    } else {
      setError(data.error || 'Error al crear conductor');
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
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
          onClick={() => { setShowForm(!showForm); setError(''); }}
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

      {showForm && (
        <form onSubmit={createDriver} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
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
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500">Crear conductor</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-600 rounded-lg">Cancelar</button>
          </div>
        </form>
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
                    <td className="py-3 px-2 text-slate-400 capitalize">{d.role}</td>
                    <td className="py-3 px-2 text-right">
                      <UserRoleSelect
                        userId={d.id}
                        currentRole={d.role}
                        onRoleChange={(role) => handleRoleChange(d.id, role)}
                        currentUserId={currentUserId ?? undefined}
                      />
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
                  </div>
                  <UserRoleSelect
                    userId={u.id}
                    currentRole={u.role}
                    onRoleChange={(role) => handleRoleChange(u.id, role)}
                    currentUserId={currentUserId ?? undefined}
                  />
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
