/**
 * imageCache.ts
 *
 * Downloads server images and stores them as base64 in IndexedDB (imageBlobs store).
 * On read, returns base64 if cached, otherwise returns the resolved URL.
 * This makes images available offline in Capacitor Android WebView
 * where service workers cannot intercept native fetch requests.
 */

import { getDb } from './db'
import { resolveMediaUrl } from './api'

/** Download an image URL and store its base64 in IndexedDB. */
export async function cacheImage(serverUrl: string | undefined | null): Promise<void> {
  if (!serverUrl) return
  // Skip if already a data URI or external URL not from our server
  if (serverUrl.startsWith('data:')) return

  const key = serverUrl  // use server path as key, e.g. /uploads/xxx/yyy.jpg

  try {
    const db = await getDb()
    // Skip if already cached
    const existing = await db.get('imageBlobs', key)
    if (existing) return

    const fullUrl = resolveMediaUrl(serverUrl)
    if (!fullUrl) return

    const response = await fetch(fullUrl)
    if (!response.ok) return

    const blob = await response.blob()
    const base64 = await blobToBase64(blob)
    await db.put('imageBlobs', { url: key, base64 })
  } catch {
    // Network offline or image unreachable — skip silently
  }
}

/** Resolve a server image URL to a base64 data URI if cached, otherwise the full URL. */
export async function resolveImageOffline(serverUrl: string | undefined | null): Promise<string | undefined> {
  if (!serverUrl) return undefined
  if (serverUrl.startsWith('data:')) return serverUrl

  try {
    const db = await getDb()
    const cached = await db.get('imageBlobs', serverUrl)
    if (cached?.base64) return cached.base64
  } catch { /* ignore */ }

  // Not in cache — return resolved URL (will only work online)
  return resolveMediaUrl(serverUrl) ?? undefined
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
