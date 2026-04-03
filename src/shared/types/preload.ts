export interface AppInfo {
  name: string
  version: string
}

export interface DirectorySelectionOptions {
  title: string
  buttonLabel: string
}

export interface ScanPhotoLibraryRequest {
  sourceRoot: string
  outputRoot: string
}

export interface MapGroupSummary {
  id: string
  title: string
  photoCount: number
  latitude: number
  longitude: number
}

export type ScanPhotoLibraryIssueSeverity = 'warning' | 'error'

export type ScanPhotoLibraryIssueStage =
  | 'metadata-read'
  | 'hash'
  | 'region-resolve'
  | 'copy'
  | 'thumbnail'

export interface ScanPhotoLibraryIssue {
  code: string
  severity: ScanPhotoLibraryIssueSeverity
  stage: ScanPhotoLibraryIssueStage
  sourcePath: string
  photoId?: string
  outputRelativePath?: string
  destinationPath?: string
  message: string
}

export interface ScanPhotoLibrarySummary {
  scannedCount: number
  duplicateCount: number
  keptCount: number
  groupCount: number
  warningCount: number
  failureCount: number
  issues: ScanPhotoLibraryIssue[]
  mapGroups: MapGroupSummary[]
}

export interface PreloadBridge {
  getAppInfo: () => Promise<AppInfo>
  ping: () => Promise<string>
  selectDirectory: (
    options: DirectorySelectionOptions
  ) => Promise<string | null>
  scanPhotoLibrary: (
    request: ScanPhotoLibraryRequest
  ) => Promise<ScanPhotoLibrarySummary>
}
