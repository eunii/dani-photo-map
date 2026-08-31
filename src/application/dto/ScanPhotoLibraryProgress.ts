export type ScanPhotoLibraryProgressPayload =
  | { kind: 'prepare'; completed: number; total: number }
  | { kind: 'fileFlowComplete'; completed: number; total: number }

export type FileOutcomeStatus =
  | 'saved'
  | 'duplicate'
  | 'existing-output-duplicate'
  | 'failed'

export interface FileOutcomePayload {
  sourcePath: string
  sourceFileName: string
  status: FileOutcomeStatus
  photoId?: string
  outputRelativePath?: string
  /** 'failed'일 때만 채워짐 — 실패 원인 메시지. */
  message?: string
}

export interface ScanPhotoLibraryExecuteOptions {
  onScanProgress?: (payload: ScanPhotoLibraryProgressPayload) => void
  onFileOutcome?: (payload: FileOutcomePayload) => void
}
