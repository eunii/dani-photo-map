import { create } from 'zustand'

import type { OrganizeJobStatus } from '@shared/types/preload'

const idleStatus: OrganizeJobStatus = {
  jobId: null,
  phase: 'idle',
  mode: null,
  updatedAtIso: new Date(0).toISOString(),
  isCancelRequested: false,
  progress: {
    completed: 0,
    total: 0
  }
}

interface OrganizeJobState {
  status: OrganizeJobStatus
  setStatus: (status: OrganizeJobStatus) => void
}

export const useOrganizeJobStore = create<OrganizeJobState>((set) => ({
  status: idleStatus,
  setStatus: (status) => set({ status })
}))
