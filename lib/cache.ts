type CacheEntry<T> = { value: T; expiresAt: number };

const entries = new Map<string, CacheEntry<unknown>>();

export async function getOrSetCached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<{ value: T; cached: boolean }> {
  const now = Date.now();
  const existing = entries.get(key);
  if (existing && existing.expiresAt > now) return { value: existing.value as T, cached: true };
  const value = await loader();
  entries.set(key, { value, expiresAt: now + ttlMs });
  if (entries.size > 500) {
    for (const [entryKey, entry] of entries) if (entry.expiresAt <= now) entries.delete(entryKey);
  }
  return { value, cached: false };
}

export function clearAnalyticsCache() {
  entries.clear();
}
