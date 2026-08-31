import { create } from 'zustand'

import type { FileOutcomePayload, OrganizeJobStatus } from '@shared/types/preload'

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

/** 렌더러에 보여줄 실시간 로그는 최근 N개만 들고 있는다 (전체 기록은 메인 프로세스가 보유). */
const RENDERER_FILE_OUTCOME_LOG_LIMIT = 2000

interface OrganizeJobState {
  status: OrganizeJobStatus
  fileOutcomeLog: FileOutcomePayload[]
  setStatus: (status: OrganizeJobStatus) => void
  appendFileOutcome: (payload: FileOutcomePayload) => void
  setFileOutcomeLog: (log: FileOutcomePayload[]) => void
  clearFileOutcomeLog: () => void
}

export const useOrganizeJobStore = create<OrganizeJobState>((set) => ({
  status: idleStatus,
  fileOutcomeLog: [],
  setStatus: (status) => set({ status }),
  appendFileOutcome: (payload) =>
    set((state) => {
      const next = [...state.fileOutcomeLog, payload]

      return {
        fileOutcomeLog:
          next.length > RENDERER_FILE_OUTCOME_LOG_LIMIT
            ? next.slice(next.length - RENDERER_FILE_OUTCOME_LOG_LIMIT)
            : next
      }
    }),
  setFileOutcomeLog: (log) =>
    set({
      fileOutcomeLog: log.slice(
        Math.max(0, log.length - RENDERER_FILE_OUTCOME_LOG_LIMIT)
      )
    }),
  clearFileOutcomeLog: () => set({ fileOutcomeLog: [] })
}))
