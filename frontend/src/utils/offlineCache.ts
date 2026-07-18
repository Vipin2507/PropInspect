/** Small helpers for localStorage-backed offline caches. */

export function readLsCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeLsCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* quota */ }
}

/** Stable cache key from optional filter params. */
export function cacheKey(prefix: string, params: Record<string, string | boolean | undefined> = {}): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
  return parts.length ? `${prefix}:${parts.join('&')}` : prefix
}
