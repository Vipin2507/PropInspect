import { Capacitor } from '@capacitor/core'

/** True for raw IPv4/IPv6 hosts — SW registration fails on IP + self-signed certs. */
function isIpHostname(hostname: string): boolean {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return true
  if (hostname.includes(':') && !hostname.includes('.')) return true
  return false
}

/** Register PWA service worker only when the browser will accept it. */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  if (Capacitor.isNativePlatform()) return
  if (isIpHostname(window.location.hostname)) return

  try {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({
      immediate: true,
      onRegisterError(error: unknown) {
        console.warn('[PWA] Service worker registration skipped:', error)
      },
    })
  } catch {
    // PWA plugin not active in this build
  }
}
