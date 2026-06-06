/**
 * useOfflineImages — resolves an array of server URL strings to
 * base64 data URIs when cached in IndexedDB, or the original URL when online.
 *
 * Usage:
 *   const srcs = useOfflineImages([img.thumbnailUrl, img.url])
 *   <img src={srcs[0] ?? srcs[1]} />
 */

import { useEffect, useState } from 'react'
import { resolveImageOffline } from '../utils/imageCache'

export function useOfflineImage(url: string | undefined | null): string | undefined {
  const [src, setSrc] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!url) { setSrc(undefined); return }
    if (url.startsWith('data:')) { setSrc(url); return }

    resolveImageOffline(url).then((resolved) => setSrc(resolved))
  }, [url])

  return src
}
