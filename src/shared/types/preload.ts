import type { ScanPhotoLibraryProgressPayload } from '@application/dto/ScanPhotoLibraryProgress'
import type {
  ExistingOutputSkipDetail,
  IncrementalSkipDetail,
  InBatchDuplicateDetail
} from '@application/dto/ScanPhotoLibraryResult'
import type { MissingGpsCategory } from '@domain/entities/Photo'
import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import type { PhotoAppInvokeChannel } from '@shared/ipc/photoAppChannels'

export type { ScanPhotoLibraryProgressPayload }
export type {
  ExistingOutputSkipDetail,
  IncrementalSkipDetail,
  InBatchDuplicateDetail
}

export interface DirectorySelectionOptions {
  title: string
  buttonLabel: string
}

export interface ScanPhotoLibraryRequest {
  sourceRoot: string
  outputRoot: string
  missingGpsGroupingBasis?: MissingGpsGroupingBasis
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
  mode?: 'default' | 'folder-structure-only'
}

export interface LoadLibraryGroupDetailRequest {
  outputRoot: string
  groupId: string
  pathSegments?: string[]
}

export interface PreviewPendingOrganizationRequest {
  sourceRoot: string
  outputRoot: string
  missingGpsGroupingBasis?: MissingGpsGroupingBasis
}

export type LibraryIndexLoadSource =
  | 'merged'
  | 'fallback'
  | 'folder-structure'

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

export interface DeletePhotosFromLibraryRequest {
  outputRoot: string
  photoIds: string[]
}

export interface DeleteOutputFolderSubtreeRequest {
  outputRoot: string
  pathSegments: string[]
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
  originalGps?: {
    latitude: number
    longitude: number
  }
  gps?: {
    latitude: number
    longitude: number
  }
  locationSource?: 'exif' | 'assigned-from-group' | 'none'
  regionName?: string
  thumbnailRelativePath?: string
  outputRelativePath?: string
  hasGps: boolean
  missingGpsCategory?: MissingGpsCategory
}

export interface GroupDetail {
  id: string
  groupKey: string
  pathSegments: string[]
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

export interface GroupGpsBreakdownSummary {
  exactGpsCount: number
  inferredGpsCount: number
  missingGpsCount: number
}

export interface GroupPinLocationSummary {
  latitude: number
  longitude: number
  source: 'photo-original-gps' | 'photo-gps' | 'representative-gps'
}

export interface GroupSummary {
  id: string
  groupKey: string
  pathSegments: string[]
  title: string
  displayTitle: string
  photoCount: number
  representativePhotoId?: string
  representativeThumbnailRelativePath?: string
  representativeOutputRelativePath?: string
  representativeGps?: {
    latitude: number
    longitude: number
  }
  companions: string[]
  notes?: string
  regionLabel: string
  earliestCapturedAtIso?: string
  latestCapturedAtIso?: string
  searchText: string
  gpsBreakdown: GroupGpsBreakdownSummary
  pinLocation: GroupPinLocationSummary | null
  isUnknownLocation: boolean
}

export interface LibraryIndexView {
  generatedAt: string
  outputRoot: string
  groups: GroupSummary[]
}

export interface LoadLibraryIndexResult {
  index: LibraryIndexView | null
  source: LibraryIndexLoadSource | null
}

export interface LoadLibraryGroupDetailResult {
  group: GroupDetail | null
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
  skippedUnchangedCount: number
  duplicateCount: number
  keptCount: number
  copiedCount: number
  skippedExistingCount: number
  skippedUnchangedDetails: IncrementalSkipDetail[]
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
  skippedUnchangedCount: number
  skippedUnchangedDetails: IncrementalSkipDetail[]
  pendingPhotoCount: number
  skippedExistingCount: number
  groups: PendingOrganizationPreviewGroup[]
}

export interface PhotoAppInvokeRequestMap {
  'photo-app/select-directory': DirectorySelectionOptions
  'photo-app/load-library-index': LoadLibraryIndexRequest
  'photo-app/load-library-group-detail': LoadLibraryGroupDetailRequest
  'photo-app/preview-pending-organization': PreviewPendingOrganizationRequest
  'photo-app/scan-photo-library': ScanPhotoLibraryRequest
  'photo-app/update-photo-group': UpdatePhotoGroupRequest
  'photo-app/move-photos-to-group': MovePhotosToGroupRequest
  'photo-app/delete-photos-from-library': DeletePhotosFromLibraryRequest
  'photo-app/delete-output-folder-subtree': DeleteOutputFolderSubtreeRequest
}

export interface PhotoAppInvokeResponseMap {
  'photo-app/select-directory': string | null
  'photo-app/load-library-index': LoadLibraryIndexResult
  'photo-app/load-library-group-detail': LoadLibraryGroupDetailResult
  'photo-app/preview-pending-organization': PreviewPendingOrganizationResult
  'photo-app/scan-photo-library': ScanPhotoLibrarySummary
  'photo-app/update-photo-group': LibraryIndexView
  'photo-app/move-photos-to-group': LibraryIndexView
  'photo-app/delete-photos-from-library': LibraryIndexView
  'photo-app/delete-output-folder-subtree': LibraryIndexView
}

export interface PreloadBridge {
  pathToFileUrl: (absolutePath: string) => string
  selectDirectory: (
    options: DirectorySelectionOptions
  ) => Promise<string | null>
  loadLibraryIndex: (
    request: LoadLibraryIndexRequest
  ) => Promise<LoadLibraryIndexResult>
  loadLibraryGroupDetail: (
    request: LoadLibraryGroupDetailRequest
  ) => Promise<LoadLibraryGroupDetailResult>
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
  deletePhotosFromLibrary: (
    request: DeletePhotosFromLibraryRequest
  ) => Promise<LibraryIndexView>
  deleteOutputFolderSubtree: (
    request: DeleteOutputFolderSubtreeRequest
  ) => Promise<LibraryIndexView>
  /**
   * 등록된 invoke 채널만 허용합니다. 프리로드에 개별 메서드가 없을 때도 동작합니다.
   */
  invokePhotoApp: <TChannel extends PhotoAppInvokeChannel>(
    channel: TChannel,
    payload: PhotoAppInvokeRequestMap[TChannel]
  ) => Promise<PhotoAppInvokeResponseMap[TChannel]>
}
