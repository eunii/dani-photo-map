export type SaveHistoryPhase = 'completed' | 'failed' | 'cancelled'

/** "사진 정리하기" 저장 실행 1회에 대한 기록. */
export interface SaveHistoryEntry {
  jobId: string
  startedAtIso: string
  completedAtIso: string
  sourceRoot: string
  outputRoot: string
  phase: SaveHistoryPhase
  message?: string
  copiedCount: number
  duplicateCount: number
  skippedExistingCount: number
  warningCount: number
  failureCount: number
}
