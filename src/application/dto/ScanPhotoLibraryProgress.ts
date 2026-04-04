export type ScanPhotoLibraryProgressPayload =
  | { kind: 'prepare'; completed: number; total: number }
  | { kind: 'fileFlowComplete'; completed: number; total: number }

export interface ScanPhotoLibraryExecuteOptions {
  onScanProgress?: (payload: ScanPhotoLibraryProgressPayload) => void
}
