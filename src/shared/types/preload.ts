import type { MissingGpsCategory } from '@domain/entities/Photo'

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
  groupMetadataOverrides?: Array<{
    groupKey: string
    title: string
    companions: string[]
    notes?: string
  }>
  pendingGroupAssignments?: Array<{
    groupKey: string
    targetGroupId: string
  }>
  pendingCustomGroupSplits?: Array<{
    groupKey: string
    splitId: string
    title: string
    photoIds: string[]
  }>
}

export interface LoadLibraryIndexRequest {
  outputRoot: string
}

export interface PreviewPendingOrganizationRequest {
  sourceRoot: string
  outputRoot: string
}

export type LibraryIndexLoadSource = 'merged' | 'fallback'

export interface UpdatePhotoGroupRequest {
  outputRoot: string
  groupId: string
  title: string
  companions: string[]
  notes?: string
  representativePhotoId?: string
}

export interface MovePhotosToGroupRequest {
  outputRoot: string
  sourceGroupId: string
  destinationGroupId: string
  photoIds: string[]
}

export interface MapGroupSummary {
  id: string
  title: string
  photoCount: number
  latitude: number
  longitude: number
  representativeThumbnailRelativePath?: string
}

export interface GroupPhotoSummary {
  id: string
  sourceFileName: string
  capturedAtIso?: string
  capturedAtSource?: string
  thumbnailRelativePath?: string
  outputRelativePath?: string
  hasGps: boolean
  missingGpsCategory?: MissingGpsCategory
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

export interface LoadLibraryIndexResult {
  index: LibraryIndexView | null
  source: LibraryIndexLoadSource | null
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
  copiedCount: number
  skippedExistingCount: number
  groupCount: number
  warningCount: number
  failureCount: number
  issues: ScanPhotoLibraryIssue[]
  mapGroups: MapGroupSummary[]
}

export interface PendingOrganizationPreviewPhoto {
  id: string
  sourcePath: string
  sourceFileName: string
  capturedAtIso?: string
  hasGps: boolean
  missingGpsCategory?: MissingGpsCategory
  previewDataUrl?: string
}

export interface PendingOrganizationAssignmentCandidate {
  id: string
  title: string
  displayTitle: string
  photoCount: number
  representativeGps: {
    latitude: number
    longitude: number
  }
}

export type PendingOrganizationAssignmentMode =
  | 'new-group'
  | 'auto-capture'
  | 'manual-existing-group'

export interface PendingOrganizationPreviewGroup {
  groupKey: string
  displayTitle: string
  suggestedTitles: string[]
  photoCount: number
  missingGpsCategory?: MissingGpsCategory
  assignmentMode: PendingOrganizationAssignmentMode
  existingGroupCandidates: PendingOrganizationAssignmentCandidate[]
  representativeGps?: {
    latitude: number
    longitude: number
  }
  representativePhotos: PendingOrganizationPreviewPhoto[]
}

export interface PreviewPendingOrganizationResult {
  scannedCount: number
  pendingPhotoCount: number
  skippedExistingCount: number
  groups: PendingOrganizationPreviewGroup[]
}

export interface PreloadBridge {
  getAppInfo: () => Promise<AppInfo>
  ping: () => Promise<string>
  selectDirectory: (
    options: DirectorySelectionOptions
  ) => Promise<string | null>
  loadLibraryIndex: (
    request: LoadLibraryIndexRequest
  ) => Promise<LoadLibraryIndexResult>
  previewPendingOrganization: (
    request: PreviewPendingOrganizationRequest
  ) => Promise<PreviewPendingOrganizationResult>
  scanPhotoLibrary: (
    request: ScanPhotoLibraryRequest
  ) => Promise<ScanPhotoLibrarySummary>
  updatePhotoGroup: (
    request: UpdatePhotoGroupRequest
  ) => Promise<LibraryIndexView>
  movePhotosToGroup: (
    request: MovePhotosToGroupRequest
  ) => Promise<LibraryIndexView>
}
