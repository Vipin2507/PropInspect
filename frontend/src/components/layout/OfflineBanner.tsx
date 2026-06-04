import { WifiOff } from 'lucide-react'
import { useSyncStore } from '../../store/syncStore'

export function OfflineBanner() {
  const isOnline = useSyncStore((s) => s.isOnline)
  if (isOnline) return null
  return (
    <div
      className="flex w-full items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white"
      role="alert"
    >
      <WifiOff size={16} className="shrink-0" />
      <span>
        You are offline. Changes will sync when connection is restored.
      </span>
    </div>
  )
}
