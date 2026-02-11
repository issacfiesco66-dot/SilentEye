'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Vehicle {
  id: string;
  plate: string;
  name?: string;
  imei: string;
  driver_id?: string;
  driver_name?: string;
}

function maskImei(imei: string): string {
  if (!imei || imei.length < 4) return '****';
  return '****' + imei.slice(-4);
}

export default function VehiclesSection() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; phone: string; role?: string }[]>([]);
  const [activeIncidentVehicleIds, setActiveIncidentVehicleIds] = useState<string[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plate: '', name: '', imei: '', driver_id: '' });
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
      const [vRes, uRes, incRes] = await Promise.all([
        fetch(`${API}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (vRes.status === 401 || uRes.status === 401 || incRes.status === 401) {
        router.replace('/login');
        return;
      }

      if (vRes.ok) setVehicles(await vRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (incRes.ok) {
        const incidents = await incRes.json();
        const ids = incidents
          .filter((i: { status: string }) => i.status === 'active' || i.status === 'attending')
          .map((i: { vehicle_id?: string }) => i.vehicle_id)
          .filter(Boolean) as string[];
        setActiveIncidentVehicleIds(ids);
      }
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/vehicles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plate: form.plate,
        name: form.name || undefined,
        imei: form.imei,
        driver_id: form.driver_id || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      router.replace('/login');
      return;
    }
    if (res.ok) {
      await load();
      setForm({ plate: '', name: '', imei: '', driver_id: '' });
      setShowForm(false);
    } else {
      setError(data.error || 'Error al crear vehículo');
    }
    setSaving(false);
  };

  const deleteVehicle = async (id: string) => {
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/vehicles/${id}`, {
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

  const updateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setError('');
    setSaving(true);
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API}/api/vehicles/${editingVehicle.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plate: form.plate || editingVehicle.plate,
        name: form.name ?? editingVehicle.name,
        imei: form.imei || editingVehicle.imei,
        driver_id: form.driver_id || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      router.replace('/login');
      return;
    }
    if (res.ok) {
      await load();
      setEditingVehicle(null);
      setForm({ plate: '', name: '', imei: '', driver_id: '' });
    } else {
      setError(data.error || 'Error al actualizar');
    }
    setSaving(false);
  };

  const hasActiveIncident = (vehicleId: string) => activeIncidentVehicleIds.includes(vehicleId);

  const sortedVehicles = [...vehicles].sort((a, b) => {
    const aActive = hasActiveIncident(a.id) ? 1 : 0;
    const bActive = hasActiveIncident(b.id) ? 1 : 0;
    return bActive - aActive;
  });

  if (loading) {
    return <div className="p-6 text-slate-400">Cargando vehículos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vehículos</h2>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500"
        >
          Nuevo vehículo
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={createVehicle} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
          <input
            required
            placeholder="Placa"
            value={form.plate}
            onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
          />
          <input
            placeholder="Nombre (opcional)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
          />
          <input
            required
            placeholder="IMEI (15 dígitos)"
            value={form.imei}
            onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
          />
          <select
            value={form.driver_id}
            onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
          >
            <option value="">Sin conductor</option>
            {drivers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50">{saving ? 'Creando...' : 'Crear'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-600 rounded-lg">Cancelar</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Placa</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Nombre</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Conductor</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">IMEI</th>
              <th className="text-left py-3 px-2 text-slate-400 font-medium text-sm">Estado</th>
              <th className="text-right py-3 px-2 text-slate-400 font-medium text-sm">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sortedVehicles.map((v) => (
              <tr key={v.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                <td className="py-3 px-2 font-medium">{v.plate}</td>
                <td className="py-3 px-2 text-slate-400">{v.name || '—'}</td>
                <td className="py-3 px-2 text-slate-400">{v.driver_name || 'Sin asignar'}</td>
                <td className="py-3 px-2 text-slate-500 font-mono text-sm">{maskImei(v.imei)}</td>
                <td className="py-3 px-2">
                  {hasActiveIncident(v.id) ? (
                    <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400 font-medium">
                      Incidente activo
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">—</span>
                  )}
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setEditingVehicle(v);
                        setForm({ plate: v.plate, name: v.name || '', imei: v.imei, driver_id: v.driver_id || '' });
                      }}
                      className="px-3 py-1.5 text-sm bg-slate-600 rounded-lg hover:bg-slate-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar vehículo ${v.plate}?`)) deleteVehicle(v.id);
                      }}
                      disabled={hasActiveIncident(v.id)}
                      className="px-3 py-1.5 text-sm bg-red-600/80 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={hasActiveIncident(v.id) ? 'No se puede eliminar con incidente activo' : 'Eliminar'}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vehicles.length === 0 && !showForm && (
        <p className="p-6 text-slate-500 text-center">No hay vehículos</p>
      )}

      {editingVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Editar vehículo</h3>
            <form onSubmit={updateVehicle} className="space-y-3">
              <input
                required
                placeholder="Placa"
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              />
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              />
              <input
                required
                placeholder="IMEI"
                value={form.imei}
                onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              />
              <select
                value={form.driver_id}
                onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600"
              >
                <option value="">Sin conductor</option>
                {drivers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                ))}
              </select>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setEditingVehicle(null)} className="px-4 py-2 bg-slate-600 rounded-lg">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
