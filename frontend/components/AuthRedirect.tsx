'use client';

import { useLayoutEffect } from 'react';
import { getSession, isTokenExpired } from '@/lib/session';

/**
 * If the user is already logged in, redirect them to their permission-appropriate page.
 * Renders nothing — just performs the redirect check before paint.
 */
export default function AuthRedirect() {
  useLayoutEffect(() => {
    const session = getSession();
    if (!session || isTokenExpired(session.token)) return;

    const dashType = session.user.permissions?.dashboardType;
    if (dashType === 'sos') {
      window.location.replace('/sos');
    } else if (dashType) {
      window.location.replace('/dashboard');
    }
  }, []);

  return null;
}
