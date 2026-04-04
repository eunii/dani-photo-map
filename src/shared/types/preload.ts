import type { ScanPhotoLibraryProgressPayload } from '@application/dto/ScanPhotoLibraryProgress'
import type {
  ExistingOutputSkipDetail,
  InBatchDuplicateDetail
} from '@application/dto/ScanPhotoLibraryResult'
import type { MissingGpsCategory } from '@domain/entities/Photo'

export type { ScanPhotoLibraryProgressPayload }
export type { ExistingOutputSkipDetail, InBatchDuplicateDetail }

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
  defaultTitleManualPhotoIds?: Array<{
    photoId: string
    title: string
  }>
  /** When set, only these preview group keys are copied to output in this scan (Organize wizard). */
  copyGroupKeysInThisRun?: string[]
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
  photoIds: string[]
  /** 단일 소스(지도 그룹 상세 등). 생략 시 `photoIds`로 소스 그룹을 자동 분해합니다. */
  sourceGroupId?: string
  /** `newGroup`과 동시에 사용하지 않습니다. */
  destinationGroupId?: string
  /** 기존 목적지 대신 새 그룹을 만들고 그쪽으로 모읍니다. */
  newGroup?: {
    title: string
  }
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
  inBatchDuplicateDetails: InBatchDuplicateDetail[]
  existingOutputSkipDetails: ExistingOutputSkipDetail[]
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
  /** 예상 출력 상대 경로 (그룹 표시명 기반 명명). */
  outputRelativePath?: string
}

export interface PendingOrganizationAssignmentCandidate {
  id: string
  title: string
  displayTitle: string
  photoCount: number
  /** Present when the output group has a GPS-backed representative (map / move target). */
  representativeGps?: {
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
  pathToFileUrl: (absolutePath: string) => string
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
  onScanPhotoLibraryProgress: (
    handler: (payload: ScanPhotoLibraryProgressPayload) => void
  ) => () => void
  updatePhotoGroup: (
    request: UpdatePhotoGroupRequest
  ) => Promise<LibraryIndexView>
  movePhotosToGroup: (
    request: MovePhotosToGroupRequest
  ) => Promise<LibraryIndexView>
}
