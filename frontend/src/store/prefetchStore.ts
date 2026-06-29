import { create } from 'zustand'

type PrefetchStatus = 'idle' | 'loading' | 'ready' | 'error'

interface PrefetchStore {
  status: PrefetchStatus
  setStatus: (status: PrefetchStatus) => void
}

export const usePrefetchStore = create<PrefetchStore>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}))
