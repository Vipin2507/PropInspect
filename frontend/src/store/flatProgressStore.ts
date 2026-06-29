import { create } from 'zustand'

interface FlatProgressStore {
  /** Live completion % keyed by flat id (updated on auto-save). */
  overrides: Record<string, number>
  setProgress: (flatId: string, completionPct: number) => void
  clearAll: () => void
}

export const useFlatProgressStore = create<FlatProgressStore>((set) => ({
  overrides: {},
  setProgress: (flatId, completionPct) =>
    set((s) => ({
      overrides: { ...s.overrides, [flatId]: completionPct },
    })),
  clearAll: () => set({ overrides: {} }),
}))
