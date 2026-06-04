import { create } from 'zustand'
import type { SyncStatus } from '../types'

interface SyncStore {
  isOnline: boolean
  status: SyncStatus
  pendingCount: number
  lastSyncAt: number | null
  setOnline: (v: boolean) => void
  setStatus: (s: SyncStatus) => void
  setPendingCount: (n: number) => void
  setLastSyncAt: (t: number) => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  status: 'idle',
  pendingCount: 0,
  lastSyncAt: null,
  setOnline: (isOnline) => set({ isOnline }),
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}))
