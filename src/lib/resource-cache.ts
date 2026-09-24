/**
 * Module-level cache so that multiple components (TopMainCards, MyTask, etc.)
 * calling fetchCurrentResource() for the same user never hit the backend more
 * than once per session.  A pending-promise map also deduplicates concurrent
 * in-flight requests (e.g. React StrictMode double-invocation).
 */
import { loadResource } from '@/services/resource-management/resource-service';

type CacheEntry = { key: string; data: any | null };

let _cache: CacheEntry | null = null;
const _pending = new Map<string, Promise<any | null>>();

function buildKey(email: string, companyId: number | null): string {
  return `${email}:${companyId ?? 0}`;
}

/**
 * Fetch (or return from cache) the resource record for the current user.
 * Safe to call from multiple components simultaneously — only one HTTP
 * request will ever be in flight for a given email+company combination.
 */
export async function fetchCurrentResource(
  email: string,
  companyId: number | null,
): Promise<any | null> {
  const key = buildKey(email, companyId);

  // Cache hit
  if (_cache?.key === key) return _cache.data;

  // Dedup in-flight requests
  if (_pending.has(key)) return _pending.get(key)!;

  const filters: any[] = [{ field: 'email', value: email, matchMode: 'equals' }];
  if (companyId && companyId !== 0) {
    filters.push({ field: 'companyId', value: companyId, matchMode: 'equals' });
  }

  const promise = loadResource({ filters, rows: 1 })
    .then((res: any) => {
      const data = res?.data?.[0] ?? null;
      _cache = { key, data };
      _pending.delete(key);
      return data;
    })
    .catch(() => {
      _pending.delete(key);
      return null;
    });

  _pending.set(key, promise);
  return promise;
}

/** Call on logout to invalidate the cache for the next user. */
export function clearResourceCache(): void {
  _cache = null;
  _pending.clear();
}

