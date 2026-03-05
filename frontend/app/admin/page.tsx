'use client';
/**
 * SilentEye — Plataforma de Seguridad Vehicular
 * Copyright (c) 2026 Christian Fiesco. All rights reserved.
 * PROPRIETARY AND CONFIDENTIAL — See LICENSE file for details.
 */

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
import { useSession } from '@/hooks/useSession';
import { useWebSocket } from '@/hooks/useWebSocket';
import { playAlarmSound, initAudioOnInteraction } from '@/lib/alarm';

type Tab = 'incidents' | 'alerts' | 'gps_activity' | 'map' | 'vehicles' | 'drivers';

export default function AdminPage() {
  const router = useRouter();
  const { token, user: sessionUser, ready: authReady, logout } = useSession({
    requiredPermission: 'viewAdminPanel',
    fallbackPath: '/dashboard',
  });
  const user = sessionUser;
  const [activeTab, setActiveTab] = useState<Tab>('incidents');

  const handleLogout = logout;

  // Global alarm: plays sound for panic/alert events on ANY tab
  useEffect(() => {
    initAudioOnInteraction();
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

  if (!authReady || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="text-zinc-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between">
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

      <div className="p-3 md:p-6 max-w-5xl mx-auto overflow-hidden">
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'incidents' && (
            <div className="bg-zinc-50 rounded-xl p-3 sm:p-6 border border-zinc-200">
              <IncidentesSection />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-zinc-50 rounded-xl p-3 sm:p-6 border border-zinc-200">
              <AlertsSection />
            </div>
          )}

          {activeTab === 'gps_activity' && (
            <div className="bg-zinc-50 rounded-xl p-3 sm:p-6 border border-zinc-200">
              <GpsActivitySection />
            </div>
          )}

          {activeTab === 'map' && (
            <div className="bg-zinc-50 rounded-xl p-3 sm:p-6 border border-zinc-200">
              <AdminMapView />
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="bg-zinc-50 rounded-xl p-3 sm:p-6 border border-zinc-200">
              <VehiclesSection />
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="bg-zinc-50 rounded-xl p-3 sm:p-6 border border-zinc-200">
              <DriversSection currentUserId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
