'use client';

import { useLayoutEffect } from 'react';
import { getSession, isTokenExpired } from '@/lib/session';

/**
 * If the user is already logged in, redirect them to their role-appropriate page.
 * Renders nothing — just performs the redirect check before paint.
 */
export default function AuthRedirect() {
  useLayoutEffect(() => {
    const session = getSession();
    if (!session || isTokenExpired(session.token)) return; // not logged in — stay on landing

    const role = session.user.role?.toLowerCase();
    if (role === 'citizen') {
      window.location.replace('/sos');
    } else if (role === 'admin' || role === 'helper' || role === 'driver') {
      window.location.replace('/dashboard');
    }
  }, []);

  return null;
}
