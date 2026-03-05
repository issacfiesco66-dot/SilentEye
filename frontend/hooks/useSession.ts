/**
 * SilentEye — useSession hook
 * Provides resilient auth state that survives app switches on mobile.
 * Re-reads session on visibilitychange so the app "wakes up" instantly.
 */

'use client';

import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { getSession, isTokenExpired, clearSession, type SessionUser, type Permissions } from '@/lib/session';

interface UseSessionOptions {
  /** Required permission key. Redirects to fallback if user lacks this permission. */
  requiredPermission?: keyof Permissions;
  /** Where to redirect if not authenticated (default: '/login') */
  loginPath?: string;
  /** Where to redirect if lacking permission (default: '/dashboard') */
  fallbackPath?: string;
}

interface UseSessionResult {
  token: string | null;
  user: SessionUser | null;
  permissions: Permissions | null;
  ready: boolean; // true once initial check is done
  logout: () => void;
}

export function useSession(opts?: UseSessionOptions): UseSessionResult {
  const loginPath = opts?.loginPath ?? '/login';
  const fallbackPath = opts?.fallbackPath ?? '/dashboard';
  const requiredPermission = opts?.requiredPermission;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const readSession = useCallback(() => {
    const session = getSession();
    if (!session || isTokenExpired(session.token)) {
      setToken(null);
      setUser(null);
      return null;
    }
    setToken(session.token);
    setUser(session.user);
    return session;
  }, []);

  // Initial auth check — useLayoutEffect to run before paint
  useLayoutEffect(() => {
    const session = readSession();
    if (!session) {
      window.location.href = loginPath;
      return;
    }

    // Permission check (backend-driven)
    if (requiredPermission && session.user.permissions) {
      if (!session.user.permissions[requiredPermission]) {
        window.location.href = fallbackPath;
        return;
      }
    }

    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-read session when app comes back from background
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const session = readSession();
        if (!session) {
          window.location.href = loginPath;
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [readSession, loginPath]);

  const logout = useCallback(() => {
    clearSession();
    window.location.href = loginPath;
  }, [loginPath]);

  const permissions = user?.permissions ?? null;

  return { token, user, permissions, ready, logout };
}
