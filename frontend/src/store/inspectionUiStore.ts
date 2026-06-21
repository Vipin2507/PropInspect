import { create } from 'zustand'

type SaveState = 'idle' | 'saving' | 'saved'

export const useInspectionUiStore = create<{
  saveState: SaveState
  setSaveState: (s: SaveState) => void
}>((set) => ({
  saveState: 'idle',
  setSaveState: (saveState) => set({ saveState }),
}))
