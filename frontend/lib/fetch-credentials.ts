/**
 * SilentEye — global fetch patch that ensures every API request carries
 * the HttpOnly auth cookie.
 *
 * Why this exists: there are dozens of `fetch('/api/...')` call sites
 * across the app. Wrapping each one to set `credentials: 'include'` is a
 * sweeping change that's easy to get wrong. Instead, we patch the global
 * `fetch` once on client mount: any request whose URL is /api/* (and
 * doesn't already specify credentials) gets credentials:'include' added.
 *
 * Effects:
 *   • Cookie-based auth: the HttpOnly `jwt` cookie is sent automatically.
 *   • Legacy Bearer auth: untouched. Both can coexist during migration.
 *   • Non-API requests (third-party CDNs, map tiles, etc.): untouched.
 *
 * The patch is idempotent — calling installFetchCredentials() twice is a
 * no-op. It is safe under React strict mode and HMR.
 */

const PATCH_FLAG = '__silenteyeFetchPatched';

interface PatchedWindow extends Window {
  [PATCH_FLAG]?: boolean;
}

function isApiPath(input: RequestInfo | URL): boolean {
  try {
    if (typeof input === 'string') {
      // Relative '/api/...' or absolute on same origin
      if (input.startsWith('/api/')) return true;
      if (input.startsWith('http')) {
        const u = new URL(input);
        return u.pathname.startsWith('/api/');
      }
      return false;
    }
    if (input instanceof URL) return input.pathname.startsWith('/api/');
    if (input instanceof Request) {
      try {
        const u = new URL(input.url);
        return u.pathname.startsWith('/api/');
      } catch {
        return input.url.startsWith('/api/');
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function installFetchCredentials(): void {
  if (typeof window === 'undefined') return;
  const w = window as PatchedWindow;
  if (w[PATCH_FLAG]) return;
  w[PATCH_FLAG] = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isApiPath(input)) {
      return originalFetch(input, init);
    }
    // For API requests, ensure credentials:'include' is set unless the
    // caller explicitly opted out (e.g. credentials:'omit').
    const next: RequestInit = init ? { ...init } : {};
    if (next.credentials === undefined) {
      next.credentials = 'include';
    }
    return originalFetch(input, next);
  };

  // eslint-disable-next-line no-console
  console.info('[fetch-patch] installed — /api/* requests now send credentials');
}
