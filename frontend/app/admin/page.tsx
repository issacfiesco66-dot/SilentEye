'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/admin/AdminTabs';
import IncidentesSection from '@/components/admin/IncidentesSection';
import AlertsSection from '@/components/admin/AlertsSection';
import AdminMapView from '@/components/admin/AdminMapView';
import VehiclesSection from '@/components/admin/VehiclesSection';
import DriversSection from '@/components/admin/DriversSection';
import GpsActivitySection from '@/components/admin/GpsActivitySection';
import { useWebSocket } from '@/hooks/useWebSocket';
import { playAlarmSound, initAudioOnInteraction } from '@/utils/alarm';

type Tab = 'incidents' | 'alerts' | 'gps_activity' | 'map' | 'vehicles' | 'drivers';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('incidents');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginAt');
    window.location.href = '/login';
  };

  const [token, setToken] = useState<string | null>(null);
  const SESSION_MAX_HOURS = 720; // 30 days — session ends on manual logout or JWT expiry

  // Global alarm: plays sound for panic/alert events on ANY tab
  useEffect(() => {
    initAudioOnInteraction();
    setToken(typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  }, []);

  useWebSocket({
    token,
    enabled: !!token,
    onMessage: useCallback((msg: { type: string; payload: unknown }) => {
      if (msg.type === 'panic' || msg.type === 'alert') {
        playAlarmSound();
      }
    }, []),
  });

  useEffect(() => {
    const loginAt = localStorage.getItem('loginAt');
    if (loginAt) {
      const elapsed = Date.now() - parseInt(loginAt, 10);
      if (elapsed > SESSION_MAX_HOURS * 60 * 60 * 1000) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginAt');
        router.replace('/login');
        return;
      }
    }
    const raw = localStorage.getItem('user');
    const t = localStorage.getItem('token');
    if (!raw || !t) {
      router.replace('/login');
      return;
    }
    const u = JSON.parse(raw);
    if (u.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="text-zinc-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-zinc-100 px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Dashboard
        </Link>
        <span className="text-sm font-bold tracking-tight">Administración</span>
        <button
          onClick={handleLogout}
          className="text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors"
        >
          Salir
        </button>
      </header>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'incidents' && (
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
              <IncidentesSection />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
              <AlertsSection />
            </div>
          )}

          {activeTab === 'gps_activity' && (
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
              <GpsActivitySection />
            </div>
          )}

          {activeTab === 'map' && (
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
              <AdminMapView />
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
              <VehiclesSection />
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
              <DriversSection currentUserId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
