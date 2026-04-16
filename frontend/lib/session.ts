/**
 * SilentEye — Session persistence layer
 * Dual storage: localStorage (primary) + cookie (backup)
 * Survives iOS memory kills, app switches, and localStorage purges.
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const LOGIN_AT_KEY = 'loginAt';
const COOKIE_TOKEN = 'se_token';
const COOKIE_USER = 'se_user';
const COOKIE_MAX_AGE = 24 * 3600; // 24h — aligned with JWT expiry (was 30d)

export interface Permissions {
  viewAdminPanel: boolean;
  manageUsers: boolean;
  manageAllVehicles: boolean;
  viewOwnVehicles: boolean;
  manageGeofences: boolean;
  manageFleet: boolean;
  respondIncidents: boolean;
  viewGpsActivity: boolean;
  viewAlerts: boolean;
  triggerPanic: boolean;
  /** Field verification registry — Phase 2 */
  submitFieldReports?: boolean;
  reviewFieldReports?: boolean;
  matchMissingProfiles?: boolean;
  dashboardType: 'admin' | 'fleet' | 'field' | 'sos' | 'verificador';
}

export interface SessionUser {
  id: string;
  phone?: string;
  name?: string;
  role: string;
  email?: string;
  permissions?: Permissions;
}

// ── Cookie helpers ──

function setCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
  // Secure + SameSite=Strict always; token cookie should not be readable by JS ideally,
  // but since we need it for Bearer header, we keep it accessible but tightly scoped.
  const isSecure = typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' || process.env.NODE_ENV === 'production');
  const secure = isSecure ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

// ── Safe localStorage ──

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch { /* storage full or unavailable */ }
}

function lsRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// ── Public API ──

/** Save session after login.
 *
 * In dual-mode the backend returns the JWT in the body and we mirror it
 * in localStorage + a JS-readable cookie (legacy). When the backend has
 * STRIP_TOKEN_FROM_BODY enabled, `token` is undefined here and only the
 * `user` object is persisted — the actual credential lives in the
 * HttpOnly `jwt` cookie that JS cannot see, and is sent automatically by
 * the global fetch credentials patch.
 */
export function saveSession(token: string | undefined, user: SessionUser) {
  const userJson = JSON.stringify(user);
  // User profile is always stored locally (no secrets in it).
  lsSet(USER_KEY, userJson);
  lsSet(LOGIN_AT_KEY, String(Date.now()));
  setCookie(COOKIE_USER, userJson);
  // Token mirror is only kept when the backend still ships it. In strict
  // cookie-only mode we deliberately leave localStorage empty so an XSS
  // payload finds nothing to steal.
  if (typeof token === 'string' && token.length > 0) {
    lsSet(TOKEN_KEY, token);
    setCookie(COOKIE_TOKEN, token);
  } else {
    // Defensive: clear any stale token from a previous (dual-mode) login.
    lsRemove(TOKEN_KEY);
    deleteCookie(COOKIE_TOKEN);
  }
}

/** Read session — tries localStorage first, falls back to cookies.
 *
 * Returns a session object even when the JS-visible token is empty (the
 * cookie-only / strict mode case). Callers that previously did
 * `Authorization: Bearer ${session.token}` will produce an empty header,
 * which the backend silently ignores and the cookie takes over via the
 * global fetch credentials patch.
 */
export function getSession(): { token: string; user: SessionUser } | null {
  // Try localStorage first
  let token = lsGet(TOKEN_KEY);
  let userRaw = lsGet(USER_KEY);

  // Fallback to cookies if localStorage is empty
  if (!token) token = getCookie(COOKIE_TOKEN);
  if (!userRaw) userRaw = getCookie(COOKIE_USER);

  // Without a user profile we have nothing — even cookie-only mode mirrors
  // the user object locally so the UI can render before the first /me call.
  if (!userRaw) return null;

  let user: SessionUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null; // corrupted data — but do NOT clear storage
  }

  if (!user?.id || !user?.role) return null;

  // Re-sync: if localStorage was empty but cookie had data, restore localStorage
  if (!lsGet(USER_KEY) && userRaw) {
    lsSet(USER_KEY, userRaw);
  }
  if (token && !lsGet(TOKEN_KEY)) {
    lsSet(TOKEN_KEY, token);
  }

  // In cookie-only mode `token` is empty — the HttpOnly cookie is the
  // real credential and is attached automatically to /api/* requests by
  // the global fetch patch.
  return { token: token || '', user };
}

/** Clear session (explicit logout only) */
export function clearSession() {
  // Best-effort server-side revocation. Fire-and-forget so logout stays
  // responsive even if the backend is unreachable. Sends both the legacy
  // Bearer token (if present in localStorage) AND the HttpOnly cookie via
  // credentials:'include' so the server can revoke whichever it has.
  const token = lsGet(TOKEN_KEY) || getCookie(COOKIE_TOKEN);
  if (typeof window !== 'undefined') {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      // Use keepalive so the request survives page navigation after logout.
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
        keepalive: true,
      }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  }
  lsRemove(TOKEN_KEY);
  lsRemove(USER_KEY);
  lsRemove(LOGIN_AT_KEY);
  deleteCookie(COOKIE_TOKEN);
  deleteCookie(COOKIE_USER);
}

/** Check if JWT is expired (client-side decode, no signature check).
 *
 * Returns `false` when the token is empty — that's the cookie-only mode
 * where the JWT lives in an HttpOnly cookie that JavaScript cannot read.
 * In that case the server is the source of truth: any 401 from a
 * subsequent /api call will trigger the normal logout path.
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return false; // cookie-only mode — defer to server
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false; // no expiry claim
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
