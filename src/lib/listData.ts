const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
export type PublicListResource = 'products' | 'categories' | 'rooms' | 'blog-posts' | 'blog-categories';

interface CachedList<T> {
  savedAt: number;
  items: T[];
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readCachedList<T>(key: string): T[] | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedList<T>;
    if (!Array.isArray(cached.items) || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return cached.items;
  } catch {
    return null;
  }
}

export function writeCachedList<T>(key: string, items: T[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), items }));
  } catch {
    // Ignore quota and private-mode failures; snapshots still cover first load.
  }
}

export async function fetchSnapshotList<T>(path: string): Promise<T[]> {
  const res = await fetch(path, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`snapshot ${path} returned ${res.status}`);

  const json = await res.json();
  if (Array.isArray(json)) return json as T[];
  if (Array.isArray(json?.items)) return json.items as T[];
  return [];
}

function shouldUsePublicListFunction() {
  if (typeof window === 'undefined') return false;
  return !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export async function fetchPublicList<T>(
  resource: PublicListResource,
  localFallback?: () => Promise<T[]>,
): Promise<T[]> {
  if (shouldUsePublicListFunction()) {
    const res = await fetch(`/.netlify/functions/public-list?resource=${encodeURIComponent(resource)}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`public-list ${resource} returned ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json)) return json as T[];
    if (Array.isArray(json?.items)) return json.items as T[];
    return [];
  }

  if (localFallback) return localFallback();
  throw new Error(`public-list ${resource} unavailable on local dev`);
}

export async function withRetry<T>(request: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise(resolve => window.setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('request failed');
}
