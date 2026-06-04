import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectStore {
  projectId: string | null
  towerId: string | null
  floorId: string | null
  setProjectId: (id: string | null) => void
  setTowerId: (id: string | null) => void
  setFloorId: (id: string | null) => void
  resetFilters: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projectId: null,
      towerId: null,
      floorId: null,
      setProjectId: (projectId) => set({ projectId, towerId: null, floorId: null }),
      setTowerId: (towerId) => set({ towerId, floorId: null }),
      setFloorId: (floorId) => set({ floorId }),
      resetFilters: () => set({ projectId: null, towerId: null, floorId: null }),
    }),
    { name: 'snagdesk-filters' }
  )
)
