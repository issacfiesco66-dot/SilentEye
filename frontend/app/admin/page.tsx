'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminTabs from '@/components/admin/AdminTabs';
import IncidentesSection from '@/components/admin/IncidentesSection';
import AlertsSection from '@/components/admin/AlertsSection';
import AdminMapView from '@/components/admin/AdminMapView';
import VehiclesSection from '@/components/admin/VehiclesSection';
import DriversSection from '@/components/admin/DriversSection';

type Tab = 'incidents' | 'alerts' | 'map' | 'vehicles' | 'drivers';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('incidents');

  const SESSION_MAX_HOURS = 8;

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <span className="text-slate-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Dashboard
        </Link>
        <h1 className="font-bold">Admin</h1>
      </header>

      <div className="p-4 max-w-5xl mx-auto">
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'incidents' && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <IncidentesSection />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <AlertsSection />
            </div>
          )}

          {activeTab === 'map' && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <AdminMapView />
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <VehiclesSection />
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <DriversSection currentUserId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
