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

export interface LoadLibraryIndexRequest {
  outputRoot: string
}

export interface UpdatePhotoGroupRequest {
  outputRoot: string
  groupId: string
  title: string
  companions: string[]
  notes?: string
  representativePhotoId?: string
}

export interface MapGroupSummary {
  id: string
  title: string
  photoCount: number
  latitude: number
  longitude: number
}

export interface GroupPhotoSummary {
  id: string
  sourceFileName: string
  capturedAtIso?: string
  capturedAtSource?: string
  thumbnailRelativePath?: string
  outputRelativePath?: string
  hasGps: boolean
}

export interface GroupDetail {
  id: string
  groupKey: string
  title: string
  displayTitle: string
  photoCount: number
  photoIds: string[]
  representativePhotoId?: string
  representativeThumbnailRelativePath?: string
  representativeGps?: {
    latitude: number
    longitude: number
  }
  companions: string[]
  notes?: string
  photos: GroupPhotoSummary[]
}

export interface LibraryIndexView {
  generatedAt: string
  outputRoot: string
  groups: GroupDetail[]
  mapGroups: MapGroupSummary[]
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
  loadLibraryIndex: (
    request: LoadLibraryIndexRequest
  ) => Promise<LibraryIndexView | null>
  scanPhotoLibrary: (
    request: ScanPhotoLibraryRequest
  ) => Promise<ScanPhotoLibrarySummary>
  updatePhotoGroup: (
    request: UpdatePhotoGroupRequest
  ) => Promise<LibraryIndexView>
}
