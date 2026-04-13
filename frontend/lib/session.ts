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
  dashboardType: 'admin' | 'fleet' | 'field' | 'sos';
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

/** Save session after login */
export function saveSession(token: string, user: SessionUser) {
  const userJson = JSON.stringify(user);
  // Primary: localStorage
  lsSet(TOKEN_KEY, token);
  lsSet(USER_KEY, userJson);
  lsSet(LOGIN_AT_KEY, String(Date.now()));
  // Backup: cookies
  setCookie(COOKIE_TOKEN, token);
  setCookie(COOKIE_USER, userJson);
}

/** Read session — tries localStorage first, falls back to cookie */
export function getSession(): { token: string; user: SessionUser } | null {
  // Try localStorage first
  let token = lsGet(TOKEN_KEY);
  let userRaw = lsGet(USER_KEY);

  // Fallback to cookie if localStorage is empty
  if (!token) token = getCookie(COOKIE_TOKEN);
  if (!userRaw) userRaw = getCookie(COOKIE_USER);

  if (!token || !userRaw) return null;

  let user: SessionUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null; // corrupted data — but do NOT clear storage
  }

  if (!user?.id || !user?.role) return null;

  // Re-sync: if localStorage was empty but cookie had data, restore localStorage
  if (!lsGet(TOKEN_KEY) && token) {
    lsSet(TOKEN_KEY, token);
    lsSet(USER_KEY, userRaw);
  }

  return { token, user };
}

/** Clear session (explicit logout only) */
export function clearSession() {
  lsRemove(TOKEN_KEY);
  lsRemove(USER_KEY);
  lsRemove(LOGIN_AT_KEY);
  deleteCookie(COOKIE_TOKEN);
  deleteCookie(COOKIE_USER);
}

/** Check if JWT is expired (client-side decode, no signature check) */
export function isTokenExpired(token: string): boolean {
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
