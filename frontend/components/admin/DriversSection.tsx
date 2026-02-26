'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserRoleSelect from './UserRoleSelect';

const API = '';

interface DriversSectionProps {
  currentUserId?: string;
}

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  email?: string;
  is_active?: boolean;
}

interface Vehicle {
  id: string;
  plate: string;
  imei?: string;
  driver_id?: string;
  driver_name?: string;
}


export default function DriversSection({ currentUserId }: DriversSectionProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [driverForm, setDriverForm] = useState({ phone: '', name: '', email: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ phone: '', name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        email: driverForm.email || undefined,
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
      setDriverForm({ phone: '', name: '', email: '' });
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
      body: JSON.stringify({ name: editForm.name, phone: editForm.phone, email: editForm.email }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      router.replace('/login');
      return;
    }
    if (res.ok) {
      await load();
      setEditingUser(null);
    } else if (res.status === 404) {
      await load();
      setEditingUser(null);
      setError('El usuario ya no existe. Lista actualizada.');
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
    } else if (res.status === 404) {
      await load();
      setError('El usuario ya no existe. Lista actualizada.');
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
    } else if (res.status === 404) {
      await load();
      setError('El usuario ya no existe. Lista actualizada.');
    } else {
      setError(data.error || 'Error al bloquear/desbloquear');
    }
  };

  const getVehicleForDriver = (driverId: string) =>
    vehicles.find((v) => v.driver_id === driverId)?.plate;

  if (loading) {
    return <div className="p-6 text-zinc-400">Cargando conductores...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-zinc-900">Conductores</h2>
        <button
          type="button"
          onClick={() => { setShowForm(true); setError(''); }}
          className="px-4 py-2 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Nuevo conductor
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}


      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full border border-zinc-200 shadow-lg">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Nuevo conductor</h3>
            <form onSubmit={createDriver} className="space-y-3">
              <input
                required
                placeholder="Nombre completo"
                value={driverForm.name}
                onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
              <input
                required
                placeholder="Teléfono (ej. +51999999999)"
                value={driverForm.phone}
                onChange={(e) => setDriverForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
              <input
                placeholder="Email del conductor (para recibir OTP)"
                type="email"
                value={driverForm.email}
                onChange={(e) => setDriverForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
              <p className="text-zinc-400 text-xs">El conductor ingresará su IMEI y recibirá el OTP por email (gratis) o SMS.</p>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors">{saving ? 'Creando...' : 'Crear conductor'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-[13px] font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {drivers.length === 0 && !showForm ? (
        <p className="py-8 text-zinc-400 text-center text-sm">No hay conductores. Añade uno para asignar a vehículos.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drivers.map((d) => {
            const vehiclePlate = getVehicleForDriver(d.id);
            return (
              <div key={d.id} className="p-4 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900 text-sm truncate">{d.name}</span>
                      {d.is_active === false && <span className="flex-shrink-0 px-1.5 py-px text-[10px] font-semibold rounded bg-red-50 text-red-500 border border-red-100">Bloqueado</span>}
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5 truncate">{d.phone}{d.email ? ` · ${d.email}` : ''}</p>
                  </div>
                  <UserRoleSelect userId={d.id} currentRole={d.role} onRoleChange={(role) => handleRoleChange(d.id, role)} onDeleted={() => { load(); setError('El usuario ya no existe.'); }} currentUserId={currentUserId ?? undefined} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    {vehiclePlate
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-zinc-100 text-zinc-600 font-medium">{vehiclePlate}</span>
                      : <span className="px-2 py-0.5 text-[11px] rounded-md bg-amber-50 text-amber-500 border border-amber-100">Sin vehículo</span>
                    }
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditingUser(d); setEditForm({ name: d.name, phone: d.phone, email: d.email || '' }); }} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors" title="Editar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button onClick={() => blockUser(d)} className={`p-1.5 rounded-lg transition-colors ${d.is_active === false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`} title={d.is_active === false ? 'Desbloquear' : 'Bloquear'}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d.is_active === false ? <><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></> : <><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>}</svg>
                    </button>
                    <button onClick={() => deleteUser(d)} disabled={d.id === currentUserId} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors" title="Eliminar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {users.filter((u) => u.role !== 'driver').length > 0 && (
        <div className="mt-6">
          <h3 className="text-[13px] font-semibold text-zinc-400 mb-2">Otros usuarios</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {users
              .filter((u) => u.role !== 'driver')
              .map((u) => (
                <div key={u.id} className="p-4 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 text-sm truncate">{u.name}</span>
                        {u.is_active === false && <span className="flex-shrink-0 px-1.5 py-px text-[10px] font-semibold rounded bg-red-50 text-red-500 border border-red-100">Bloqueado</span>}
                      </div>
                      <p className="text-zinc-400 text-xs mt-0.5 truncate">{u.phone}{u.email ? ` · ${u.email}` : ''}</p>
                    </div>
                    <UserRoleSelect userId={u.id} currentRole={u.role} onRoleChange={(role) => handleRoleChange(u.id, role)} onDeleted={() => { load(); setError('El usuario ya no existe.'); }} currentUserId={currentUserId ?? undefined} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[11px] rounded-md bg-zinc-100 text-zinc-500 font-medium capitalize">{u.role}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditingUser(u); setEditForm({ name: u.name, phone: u.phone, email: u.email || '' }); }} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors" title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <button onClick={() => blockUser(u)} className={`p-1.5 rounded-lg transition-colors ${u.is_active === false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`} title={u.is_active === false ? 'Desbloquear' : 'Bloquear'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{u.is_active === false ? <><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></> : <><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>}</svg>
                      </button>
                      <button onClick={() => deleteUser(u)} disabled={u.id === currentUserId || u.role === 'admin'} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full border border-zinc-200 shadow-lg">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Editar usuario</h3>
            <form onSubmit={updateUser} className="space-y-3">
              <input
                required
                placeholder="Nombre"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
              <input
                required
                placeholder="Teléfono"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
              <input
                placeholder="Email (para OTP)"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors">{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-[13px] font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
