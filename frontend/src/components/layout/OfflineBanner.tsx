import { WifiOff } from 'lucide-react'
import { useSyncStore } from '../../store/syncStore'

export function OfflineBanner() {
  const isOnline = useSyncStore((s) => s.isOnline)
  if (isOnline) return null
  return (
    <div
      className="flex w-full shrink-0 items-center justify-center gap-2 bg-amber-500 px-4 py-2.5 text-center text-sm font-semibold text-white"
      role="alert"
      aria-live="polite"
    >
      <WifiOff size={15} className="shrink-0" aria-hidden="true" />
      <span>Offline — changes will sync when connection is restored.</span>
    </div>
  )
}
