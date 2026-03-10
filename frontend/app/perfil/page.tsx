'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';
import { saveSession, getSession } from '@/lib/session';

const API = '';

export default function PerfilPage() {
  const router = useRouter();
  const { token, user, ready, logout } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail((user as any).email || '');
    }
  }, [user]);

  // Fetch full profile from /me to get email
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setName(data.name || '');
          setEmail(data.email || '');
        }
      })
      .catch(() => {});
  }, [token]);

  const updateProfile = async () => {
    setProfileLoading(true);
    setProfileMsg('');
    setProfileError('');
    try {
      const res = await fetch(`${API}/api/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');
      setProfileMsg('Perfil actualizado correctamente');
      // Update local session with new data
      const session = getSession();
      if (session) {
        const updatedUser = { ...session.user, name: data.name, email: data.email, permissions: data.permissions };
        saveSession(session.token, updatedUser);
      }
    } catch (e: unknown) {
      setProfileError((e as Error).message);
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async () => {
    setPwMsg('');
    setPwError('');
    if (!newPassword || newPassword.length < 6) {
      setPwError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${API}/api/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');
      setPwMsg('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      setPwError((e as Error).message);
    } finally {
      setPwLoading(false);
    }
  };

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="text-zinc-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Volver
        </Link>
        <span className="text-sm font-bold tracking-tight">Mi Perfil</span>
        <button onClick={logout} className="text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors">
          Salir
        </button>
      </header>

      <div className="max-w-lg mx-auto p-6 space-y-8">
        {/* Profile info */}
        <section className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-1">Información personal</h2>
          <p className="text-[13px] text-zinc-400 mb-6">Actualiza tu nombre y correo electrónico</p>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Teléfono</label>
              <input
                type="text"
                value={user.phone || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-500 text-[15px] cursor-not-allowed"
              />
              <p className="text-[12px] text-zinc-400 mt-1">El teléfono no se puede cambiar</p>
            </div>
          </div>

          {profileMsg && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
              <span className="text-[13px] text-emerald-700 font-medium">{profileMsg}</span>
            </div>
          )}
          {profileError && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span className="text-[13px] text-red-600">{profileError}</span>
            </div>
          )}

          <button
            onClick={updateProfile}
            disabled={profileLoading}
            className="mt-4 w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {profileLoading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </section>

        {/* Change password */}
        <section className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-1">Cambiar contraseña</h2>
          <p className="text-[13px] text-zinc-400 mb-6">Actualiza tu contraseña de acceso</p>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
              <p className="text-[12px] text-zinc-400 mt-1">Déjalo vacío si aún no tienes contraseña</p>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-zinc-700 mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                onKeyDown={(e) => e.key === 'Enter' && changePassword()}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-300 text-[15px] focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          {pwMsg && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="m5 12 5 5L20 7"/></svg>
              <span className="text-[13px] text-emerald-700 font-medium">{pwMsg}</span>
            </div>
          )}
          {pwError && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span className="text-[13px] text-red-600">{pwError}</span>
            </div>
          )}

          <button
            onClick={changePassword}
            disabled={pwLoading}
            className="mt-4 w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            {pwLoading ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </section>
      </div>
    </div>
  );
}
