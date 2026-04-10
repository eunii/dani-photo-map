import { useEffect, useMemo, useRef, useState } from 'react'

import { Button, Card, Input, TextArea } from '@heroui/react'

import type { ScanPhotoLibraryProgressPayload } from '@application/dto/ScanPhotoLibraryProgress'
import {
  defaultMissingGpsGroupingBasis,
  type MissingGpsGroupingBasis
} from '@domain/policies/MissingGpsGroupingBasis'
import type {
  PendingOrganizationPreviewPhoto,
  PreviewPendingOrganizationResult,
  ScanPhotoLibrarySummary
} from '@shared/types/preload'
import type {
  InBatchDuplicateDetail,
  ScanPhotoLibraryIssue
} from '@application/dto/ScanPhotoLibraryResult'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'

import {
  buildOrganizeScanPayload,
  type OrganizeCustomSplitInput
} from '@presentation/renderer/pages/organizeScanPayload'
import { joinPathSegments, normalizePathSeparators } from '@shared/utils/path'

const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

const EMPTY_GROUP_ASSIGNMENTS: Record<string, string> = {}
const EMPTY_CUSTOM_SPLITS: Record<string, OrganizeCustomSplitInput[]> = {}
const MISSING_GPS_GROUPING_OPTIONS: Array<{
  value: MissingGpsGroupingBasis
  label: string
}> = [
  { value: 'month', label: '월별' },
  { value: 'week', label: '주별' },
  { value: 'day', label: '일별' }
]
const SCAN_ISSUE_STAGES: ScanPhotoLibraryIssue['stage'][] = [
  'metadata-read',
  'hash',
  'region-resolve',
  'copy',
  'thumbnail'
]
const ISSUE_QUICK_FILTERS = [
  {
    key: 'all',
    label: '전체 code',
    codeQuery: '',
    stage: 'all' as const
  },
  {
    key: 'metadata',
    label: '메타데이터 실패',
    codeQuery: 'metadata-read-failed',
    stage: 'metadata-read' as const
  },
  {
    key: 'hash',
    label: '해시 관련',
    codeQuery: 'hash',
    stage: 'hash' as const
  },
  {
    key: 'region',
    label: '지역 해석 실패',
    codeQuery: 'region-resolve-failed',
    stage: 'region-resolve' as const
  },
  {
    key: 'copy',
    label: '복사 관련',
    codeQuery: 'copy',
    stage: 'copy' as const
  },
  {
    key: 'copy-conflict',
    label: '복사 충돌',
    codeQuery: 'copy-destination-conflict',
    stage: 'copy' as const
  },
  {
    key: 'thumbnail',
    label: '썸네일 실패',
    codeQuery: 'thumbnail',
    stage: 'thumbnail' as const
  }
] as const

function fileUrlFromAbsolutePath(absolutePath: string): string {
  const normalized = normalizePathSeparators(absolutePath)
  const withSlashes = normalized.replace(/\\/g, '/')

  if (/^[a-zA-Z]:\//.test(withSlashes)) {
    return `file:///${encodeURI(withSlashes)}`
  }

  return `file://${encodeURI(withSlashes)}`
}

/** Prefer preload `pathToFileURL` so Windows paths load in the renderer with `webSecurity` relaxed. */
function localImageFileUrl(absolutePath: string): string {
  const fromPreload = window.photoApp.pathToFileUrl(absolutePath)

  if (fromPreload) {
    return fromPreload
  }

  return fileUrlFromAbsolutePath(absolutePath)
}

function computeGlobalBarProgress(
  offset: number,
  groupPhotoCount: number,
  payload: ScanPhotoLibraryProgressPayload
): number {
  if (groupPhotoCount <= 0) {
    return offset
  }

  if (payload.kind === 'prepare') {
    const denom = payload.total > 0 ? payload.total : 1

    return offset + Math.round((payload.completed / denom) * 0.5 * groupPhotoCount)
  }

  const denom = payload.total > 0 ? payload.total : 1
  const halfGroup = 0.5 * groupPhotoCount
  const filePortion = (payload.completed / denom) * 0.5 * groupPhotoCount

  return offset + Math.round(halfGroup + filePortion)
}

function mergeScanSummaries(
  previous: ScanPhotoLibrarySummary | null,
  next: ScanPhotoLibrarySummary
): ScanPhotoLibrarySummary {
  if (!previous) {
    return next
  }

  return {
    scannedCount: Math.max(previous.scannedCount, next.scannedCount),
    skippedUnchangedCount:
      previous.skippedUnchangedCount + next.skippedUnchangedCount,
    duplicateCount: previous.duplicateCount + next.duplicateCount,
    keptCount: previous.keptCount + next.keptCount,
    copiedCount: previous.copiedCount + next.copiedCount,
    skippedExistingCount: previous.skippedExistingCount + next.skippedExistingCount,
    groupCount: next.groupCount,
    warningCount: previous.warningCount + next.warningCount,
    failureCount: previous.failureCount + next.failureCount,
    issues: [...previous.issues, ...next.issues],
    inBatchDuplicateDetails: [
      ...previous.inBatchDuplicateDetails,
      ...next.inBatchDuplicateDetails
    ],
    existingOutputSkipDetails: [
      ...previous.existingOutputSkipDetails,
      ...next.existingOutputSkipDetails
    ],
    skippedUnchangedDetails: [
      ...previous.skippedUnchangedDetails,
      ...next.skippedUnchangedDetails
    ],
    mapGroups: next.mapGroups
  }
}

function groupInBatchDuplicateDetails(rows: InBatchDuplicateDetail[]) {
  const map = new Map<
    string,
    { canonicalSourcePath: string; duplicateSourcePaths: string[] }
  >()

  for (const row of rows) {
    const existing = map.get(row.canonicalPhotoId)

    if (!existing) {
      map.set(row.canonicalPhotoId, {
        canonicalSourcePath: row.canonicalSourcePath,
        duplicateSourcePaths: [row.duplicateSourcePath]
      })
    } else {
      existing.duplicateSourcePaths.push(row.duplicateSourcePath)
    }
  }

  return [...map.entries()].map(([canonicalPhotoId, value]) => ({
    canonicalPhotoId,
    canonicalSourcePath: value.canonicalSourcePath,
    duplicateSourcePaths: value.duplicateSourcePaths
  }))
}

function formatIssueStageLabel(stage: ScanPhotoLibraryIssue['stage']): string {
  switch (stage) {
    case 'metadata-read':
      return '메타데이터'
    case 'hash':
      return '해시'
    case 'region-resolve':
      return '지역 해석'
    case 'copy':
      return '복사'
    case 'thumbnail':
      return '썸네일'
    default:
      return stage
  }
}

function formatIssueSeverityLabel(
  severity: ScanPhotoLibraryIssue['severity']
): string {
  switch (severity) {
    case 'warning':
      return '경고'
    case 'error':
      return '실패'
    default:
      return severity
  }
}

function getIssueSeverityBadgeClass(
  severity: ScanPhotoLibraryIssue['severity']
): string {
  return severity === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-700'
}

function isIssueQuickFilterActive(
  filter: (typeof ISSUE_QUICK_FILTERS)[number],
  stage: 'all' | ScanPhotoLibraryIssue['stage'],
  codeQuery: string
): boolean {
  return filter.stage === stage && filter.codeQuery === codeQuery
}

function formatIncrementalSkipListForClipboard(
  rows: PreviewPendingOrganizationResult['skippedUnchangedDetails']
): string {
  return rows
    .map(
      (row) =>
        [
          `sourceFileName: ${row.sourceFileName}`,
          `sourcePath: ${row.sourcePath}`,
          `sizeBytes: ${row.sourceFingerprint.sizeBytes}`,
          `modifiedAtMs: ${row.sourceFingerprint.modifiedAtMs}`
        ].join('\n')
    )
    .join('\n\n')
}

function formatDuplicateListForClipboard(
  rows: Array<{
    canonicalSourcePath: string
    duplicateSourcePaths: string[]
  }>
): string {
  return rows
    .map((row) =>
      [
        `canonical: ${row.canonicalSourcePath}`,
        ...row.duplicateSourcePaths.map((path) => `duplicate: ${path}`)
      ].join('\n')
    )
    .join('\n\n')
}

function formatExistingSkipListForClipboard(
  rows: ScanPhotoLibrarySummary['existingOutputSkipDetails']
): string {
  return rows
    .map((row) =>
      [
        `sourcePhotoId: ${row.sourcePhotoId}`,
        `sourcePath: ${row.sourcePath}`,
        `existingOutputRelativePath: ${row.existingOutputRelativePath}`,
        `sha256: ${row.sha256}`
      ].join('\n')
    )
    .join('\n\n')
}

function formatIssueListForClipboard(rows: ScanPhotoLibrarySummary['issues']): string {
  return rows
    .map((issue) =>
      [
        `severity: ${issue.severity}`,
        `stage: ${issue.stage}`,
        `code: ${issue.code}`,
        `sourcePath: ${issue.sourcePath}`,
        issue.photoId ? `photoId: ${issue.photoId}` : null,
        issue.outputRelativePath
          ? `outputRelativePath: ${issue.outputRelativePath}`
          : null,
        issue.destinationPath ? `destinationPath: ${issue.destinationPath}` : null,
        `message: ${issue.message}`
      ]
        .filter((line): line is string => Boolean(line))
        .join('\n')
    )
    .join('\n\n')
}

function getMissingGpsCategoryLabel(
  category?: PreviewPendingOrganizationResult['groups'][number]['missingGpsCategory']
): string | null {
  switch (category) {
    case 'capture':
      return '캡처 자동 분류'
    case 'missing-original-gps':
      return '원본 GPS 없음'
    case 'missing-imported-gps':
      return '외부 수신본 GPS 없음'
    default:
      return null
  }
}

function getAssignmentModeDescription(
  group: PreviewPendingOrganizationResult['groups'][number]
): string | null {
  switch (group.assignmentMode) {
    case 'auto-capture':
      return '자동 그룹으로 분리됩니다.'
    case 'new-group':
    default:
      return null
  }
}

function formatMissingGpsGroupingBasisLabel(
  basis: MissingGpsGroupingBasis
): string {
  return (
    MISSING_GPS_GROUPING_OPTIONS.find((option) => option.value === basis)?.label ??
    '월별'
  )
}

function formatMissingGpsFolderPattern(
  basis: MissingGpsGroupingBasis
): string {
  switch (basis) {
    case 'week':
      return 'year/month/weekN'
    case 'day':
      return 'year/month/day'
    case 'month':
    default:
      return 'year/month'
  }
}

type GroupSavePhase = 'idle' | 'queued' | 'saving' | 'done' | 'error'
type IssueSeverityFilter = 'all' | ScanPhotoLibraryIssue['severity']
type DuplicateSortOption = 'duplicates-desc' | 'path-asc'
type IncrementalSkipSortOption = 'path-asc' | 'mtime-desc'
type ExistingSkipSortOption = 'path-asc' | 'hash-asc'
type IssueSortOption = 'severity-stage-path' | 'path-asc' | 'code-asc'

function formatGroupSavePhaseLabel(phase: GroupSavePhase): string {
  switch (phase) {
    case 'queued':
      return '저장 대기'
    case 'saving':
      return '저장 중'
    case 'done':
      return '저장 완료'
    case 'error':
      return '저장 실패'
    default:
      return '미저장'
  }
}

function getGroupLinePercent(
  phase: GroupSavePhase,
  runningKey: string | null,
  groupKey: string,
  meta: { progressOffsetBeforeJob: number; groupPhotoCount: number } | null,
  photosSavedCount: number
): number {
  if (phase === 'done') {
    return 100
  }

  if (phase === 'error') {
    return 0
  }

  if (phase === 'queued' || phase === 'idle') {
    return 0
  }

  if (
    phase === 'saving' &&
    runningKey === groupKey &&
    meta &&
    meta.groupPhotoCount > 0
  ) {
    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          ((photosSavedCount - meta.progressOffsetBeforeJob) /
            meta.groupPhotoCount) *
            100
        )
      )
    )
  }

  return 0
}

interface OrganizePageProps {
  onNavigateToSettings?: () => void
}

function getInitialGroupTitleValue(
  group: PreviewPendingOrganizationResult['groups'][number]
): string {
  if (!group.representativeGps && group.displayTitle.trim().length > 0) {
    return group.displayTitle
  }

  return group.suggestedTitles[0] ?? group.displayTitle
}

function effectiveGroupTitle(
  group: PreviewPendingOrganizationResult['groups'][number],
  groupTitleInputs: Record<string, string>
): string {
  const raw = groupTitleInputs[group.groupKey]
  if (raw !== undefined) {
    const trimmed = raw.trim()

    return trimmed.length > 0 ? trimmed : '제목 없음'
  }

  return getInitialGroupTitleValue(group)
}

function buildEffectiveOrganizeInputs(
  groups: PreviewPendingOrganizationResult['groups'],
  inputs: {
    missingGpsGroupingBasis: MissingGpsGroupingBasis
    groupTitleInputs: Record<string, string>
    groupCompanionsInputs: Record<string, string>
    groupNotesInputs: Record<string, string>
  }
): Parameters<typeof buildOrganizeScanPayload>[2] {
  const groupTitleInputs = { ...inputs.groupTitleInputs }

  for (const group of groups) {
    if (groupTitleInputs[group.groupKey] === undefined) {
      groupTitleInputs[group.groupKey] = getInitialGroupTitleValue(group)
    }
  }

  return {
    missingGpsGroupingBasis: inputs.missingGpsGroupingBasis,
    groupTitleInputs,
    groupCompanionsInputs: inputs.groupCompanionsInputs,
    groupNotesInputs: inputs.groupNotesInputs,
    groupAssignmentInputs: EMPTY_GROUP_ASSIGNMENTS,
    groupCustomSplits: EMPTY_CUSTOM_SPLITS
  }
}

function PendingPreviewImageBlock({
  photo,
  imageFailed,
  onImageError,
  imageHeightClass,
  placeholderClassName,
  imageAlt = ''
}: {
  photo: PendingOrganizationPreviewPhoto
  imageFailed: boolean
  onImageError: () => void
  imageHeightClass: string
  placeholderClassName: string
  imageAlt?: string
}) {
  if (photo.previewDataUrl && !imageFailed) {
    return (
      <img
        src={photo.previewDataUrl}
        alt={imageAlt}
        className={`w-full object-cover ${imageHeightClass}`}
        onError={onImageError}
      />
    )
  }

  return (
    <div className={placeholderClassName}>
      미리보기를 불러오지 못했습니다.
    </div>
  )
}

export function OrganizePage({
  onNavigateToSettings
}: OrganizePageProps) {
  const sourceRoot = useLibraryWorkspaceStore((state) => state.sourceRoot)
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const setSourceRoot = useLibraryWorkspaceStore((state) => state.setSourceRoot)
  const lastLoadedIndex = useLibraryWorkspaceStore(
    (state) => state.lastLoadedIndex
  )
  const setLastLoadedIndex = useLibraryWorkspaceStore(
    (state) => state.setLastLoadedIndex
  )
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultActionMessage, setResultActionMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<ScanPhotoLibrarySummary | null>(null)
  const [previewResult, setPreviewResult] =
    useState<PreviewPendingOrganizationResult | null>(null)
  const [missingGpsGroupingBasis, setMissingGpsGroupingBasis] =
    useState<MissingGpsGroupingBasis>(defaultMissingGpsGroupingBasis)
  const [groupTitleInputs, setGroupTitleInputs] = useState<
    Record<string, string>
  >({})
  const [groupCompanionsInputs, setGroupCompanionsInputs] = useState<
    Record<string, string>
  >({})
  const [groupNotesInputs, setGroupNotesInputs] = useState<
    Record<string, string>
  >({})
  const [saveJobQueue, setSaveJobQueue] = useState<
    Array<{
      copyGroupKeysInThisRun: string[]
      isLastStep: boolean
      snapshotPayload: ReturnType<typeof buildOrganizeScanPayload>
      progressOffsetBeforeJob: number
    }>
  >([])
  const [runningSaveTarget, setRunningSaveTarget] = useState<string | null>(null)
  const runningSaveTargetRef = useRef<string | null>(null)
  const [bulkSaveActive, setBulkSaveActive] = useState(false)
  const bulkSaveActiveRef = useRef(false)
  const [prepareProgress, setPrepareProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  const [photoFlowTotal, setPhotoFlowTotal] = useState(0)
  const [groupSavePhaseByKey, setGroupSavePhaseByKey] = useState<
    Record<string, GroupSavePhase>
  >({})
  const [hidePreviewPanelWhileSaving, setHidePreviewPanelWhileSaving] =
    useState(false)
  const [photosSavedCount, setPhotosSavedCount] = useState(0)
  const [openScanResultDetail, setOpenScanResultDetail] = useState<
    null
    | 'inBatchDup'
    | 'incrementalSkip'
    | 'existingSkip'
    | 'warnings'
    | 'failures'
  >(null)
  const [incrementalSkipPathQuery, setIncrementalSkipPathQuery] = useState('')
  const [issueSeverityFilter, setIssueSeverityFilter] =
    useState<IssueSeverityFilter>('all')
  const [issueStageFilter, setIssueStageFilter] = useState<
    'all' | ScanPhotoLibraryIssue['stage']
  >('all')
  const [issueCodeQuery, setIssueCodeQuery] = useState('')
  const [issueSourcePathQuery, setIssueSourcePathQuery] = useState('')
  const [duplicatePathQuery, setDuplicatePathQuery] = useState('')
  const [duplicateSort, setDuplicateSort] =
    useState<DuplicateSortOption>('duplicates-desc')
  const [existingSkipPathQuery, setExistingSkipPathQuery] = useState('')
  const [existingSkipHashQuery, setExistingSkipHashQuery] = useState('')
  const [existingSkipSort, setExistingSkipSort] =
    useState<ExistingSkipSortOption>('hash-asc')
  const [incrementalSkipSort, setIncrementalSkipSort] =
    useState<IncrementalSkipSortOption>('path-asc')
  const [issueSort, setIssueSort] =
    useState<IssueSortOption>('severity-stage-path')
  const [activeSaveJobMeta, setActiveSaveJobMeta] = useState<{
    progressOffsetBeforeJob: number
    groupPhotoCount: number
  } | null>(null)

  const saveJobQueueRef = useRef(saveJobQueue)
  const mergedBulkSummaryRef = useRef<ScanPhotoLibrarySummary | null>(null)
  const cancelRemainingBulkJobsRef = useRef(false)
  const bulkSaveStartIndexRef = useRef(0)
  const bulkRunTotalPhotosRef = useRef<number | null>(null)
  const [bulkRunStartIndex, setBulkRunStartIndex] = useState<number | null>(null)

  useEffect(() => {
    saveJobQueueRef.current = saveJobQueue
  }, [saveJobQueue])

  useEffect(() => {
    runningSaveTargetRef.current = runningSaveTarget
  }, [runningSaveTarget])

  useEffect(() => {
    bulkSaveActiveRef.current = bulkSaveActive
  }, [bulkSaveActive])
  const [previewImageLoadFailedByPhotoId, setPreviewImageLoadFailedByPhotoId] =
    useState<Record<string, boolean>>({})
  const [wizardStepIndex, setWizardStepIndex] = useState(0)

  const orderedPreviewGroups = useMemo(() => {
    if (!previewResult?.groups.length) {
      return []
    }

    const withGps = previewResult.groups.filter((g) => Boolean(g.representativeGps))
    const withoutGps = previewResult.groups.filter((g) => !g.representativeGps)

    return [...withGps, ...withoutGps]
  }, [previewResult])

  const totalPhotosInPreview = useMemo(
    () =>
      orderedPreviewGroups.reduce((sum, group) => sum + group.photoCount, 0),
    [orderedPreviewGroups]
  )

  const groupedInBatchDuplicates = useMemo(
    () =>
      summary
        ? groupInBatchDuplicateDetails(summary.inBatchDuplicateDetails)
        : [],
    [summary]
  )
  const reviewedInBatchDuplicates = useMemo(() => {
    const normalizedPathQuery = duplicatePathQuery.trim().toLocaleLowerCase()

    return groupedInBatchDuplicates
      .filter((group) => {
        if (normalizedPathQuery.length === 0) {
          return true
        }

        if (
          group.canonicalSourcePath.toLocaleLowerCase().includes(normalizedPathQuery)
        ) {
          return true
        }

        return group.duplicateSourcePaths.some((path) =>
          path.toLocaleLowerCase().includes(normalizedPathQuery)
        )
      })
      .sort((left, right) => {
        if (duplicateSort === 'path-asc') {
          return left.canonicalSourcePath.localeCompare(right.canonicalSourcePath)
        }

        if (left.duplicateSourcePaths.length !== right.duplicateSourcePaths.length) {
          return right.duplicateSourcePaths.length - left.duplicateSourcePaths.length
        }

        return left.canonicalSourcePath.localeCompare(right.canonicalSourcePath)
      })
  }, [duplicatePathQuery, duplicateSort, groupedInBatchDuplicates])
  const reviewedExistingSkips = useMemo(() => {
    if (!summary) {
      return []
    }

    const normalizedPathQuery = existingSkipPathQuery.trim().toLocaleLowerCase()
    const normalizedHashQuery = existingSkipHashQuery.trim().toLocaleLowerCase()

    return summary.existingOutputSkipDetails
      .filter((row) => {
        if (normalizedPathQuery.length === 0) {
          return true
        }

        return (
          row.sourcePath.toLocaleLowerCase().includes(normalizedPathQuery) ||
          row.existingOutputRelativePath
            .toLocaleLowerCase()
            .includes(normalizedPathQuery)
        )
      })
      .filter((row) =>
        normalizedHashQuery.length === 0
          ? true
          : row.sha256.toLocaleLowerCase().includes(normalizedHashQuery)
      )
      .sort((left, right) => {
        if (existingSkipSort === 'path-asc') {
          return left.sourcePath.localeCompare(right.sourcePath)
        }

        if (left.sha256 !== right.sha256) {
          return left.sha256.localeCompare(right.sha256)
        }

        return left.sourcePath.localeCompare(right.sourcePath)
      })
  }, [existingSkipHashQuery, existingSkipPathQuery, existingSkipSort, summary])
  const reviewedIncrementalSkips = useMemo(() => {
    if (!summary) {
      return []
    }

    const normalizedPathQuery = incrementalSkipPathQuery
      .trim()
      .toLocaleLowerCase()

    return summary.skippedUnchangedDetails
      .filter((row) =>
        normalizedPathQuery.length === 0
          ? true
          : row.sourcePath.toLocaleLowerCase().includes(normalizedPathQuery)
      )
      .sort((left, right) => {
        if (incrementalSkipSort === 'mtime-desc') {
          return (
            right.sourceFingerprint.modifiedAtMs - left.sourceFingerprint.modifiedAtMs
          )
        }

        return left.sourcePath.localeCompare(right.sourcePath)
      })
  }, [incrementalSkipPathQuery, incrementalSkipSort, summary])
  const issueStageOptions = useMemo(() => {
    if (!summary) {
      return []
    }

    const usedStages = new Set(summary.issues.map((issue) => issue.stage))

    return SCAN_ISSUE_STAGES.filter((stage) => usedStages.has(stage))
  }, [summary])
  const reviewedIssues = useMemo(() => {
    if (!summary) {
      return []
    }

    const normalizedCodeQuery = issueCodeQuery.trim().toLocaleLowerCase()
    const normalizedSourcePathQuery = issueSourcePathQuery
      .trim()
      .toLocaleLowerCase()

    return summary.issues
      .filter((issue) =>
        issueSeverityFilter === 'all'
          ? true
          : issue.severity === issueSeverityFilter
      )
      .filter((issue) =>
        issueStageFilter === 'all' ? true : issue.stage === issueStageFilter
      )
      .filter((issue) =>
        normalizedCodeQuery.length === 0
          ? true
          : issue.code.toLocaleLowerCase().includes(normalizedCodeQuery)
      )
      .filter((issue) =>
        normalizedSourcePathQuery.length === 0
          ? true
          : issue.sourcePath.toLocaleLowerCase().includes(normalizedSourcePathQuery)
      )
      .sort((left, right) => {
        if (issueSort === 'path-asc') {
          return left.sourcePath.localeCompare(right.sourcePath)
        }

        if (issueSort === 'code-asc') {
          if (left.code !== right.code) {
            return left.code.localeCompare(right.code)
          }

          return left.sourcePath.localeCompare(right.sourcePath)
        }

        if (left.severity !== right.severity) {
          return left.severity === 'error' ? -1 : 1
        }

        if (left.stage !== right.stage) {
          return left.stage.localeCompare(right.stage)
        }

        if (left.code !== right.code) {
          return left.code.localeCompare(right.code)
        }

        return left.sourcePath.localeCompare(right.sourcePath)
      })
  }, [
    issueCodeQuery,
    issueSeverityFilter,
    issueSort,
    issueSourcePathQuery,
    issueStageFilter,
    summary
  ])

  const hasPendingPreviewGroups = (previewResult?.groups.length ?? 0) > 0

  const savePipelineBusy =
    runningSaveTarget !== null || saveJobQueue.length > 0

  const wizardGroup =
    orderedPreviewGroups.length > 0
      ? orderedPreviewGroups[
          Math.min(wizardStepIndex, orderedPreviewGroups.length - 1)
        ]
      : undefined

  useEffect(() => {
    if (runningSaveTarget !== null) {
      return
    }

    if (saveJobQueue.length === 0) {
      return
    }

    if (!sourceRoot || !outputRoot) {
      return
    }

    const queueSnapshot = saveJobQueue
    const nextJob = queueSnapshot[0]

    if (!nextJob) {
      return
    }

    const remainderQueue = queueSnapshot.slice(1)
    saveJobQueueRef.current = remainderQueue
    setSaveJobQueue(remainderQueue)

    const onlyKey = nextJob.copyGroupKeysInThisRun[0]
    setRunningSaveTarget(onlyKey ?? null)

    const groupPhotoCountForJob =
      onlyKey !== undefined
        ? (orderedPreviewGroups.find((g) => g.groupKey === onlyKey)?.photoCount ??
          0)
        : 0

    setActiveSaveJobMeta(
      onlyKey
        ? {
            progressOffsetBeforeJob: nextJob.progressOffsetBeforeJob,
            groupPhotoCount: groupPhotoCountForJob
          }
        : null
    )

    if (bulkSaveActive && onlyKey) {
      const jobIndex = orderedPreviewGroups.findIndex(
        (g) => g.groupKey === onlyKey
      )
      const bulkStart = bulkSaveStartIndexRef.current
      const remainingKeys = new Set(
        remainderQueue.map((j) => j.copyGroupKeysInThisRun[0]).filter(Boolean)
      )
      setGroupSavePhaseByKey(
        Object.fromEntries(
          orderedPreviewGroups.map((g, i) => {
            if (i < bulkStart) {
              return [g.groupKey, 'idle' as const]
            }
            if (jobIndex >= 0 && i < jobIndex) {
              return [g.groupKey, 'done' as const]
            }
            if (g.groupKey === onlyKey) {
              return [g.groupKey, 'saving' as const]
            }
            if (remainingKeys.has(g.groupKey)) {
              return [g.groupKey, 'queued' as const]
            }
            return [g.groupKey, 'idle' as const]
          })
        )
      )
    } else if (onlyKey) {
      setGroupSavePhaseByKey((previous) => ({
        ...previous,
        [onlyKey]: 'saving'
      }))
    }

    setPhotosSavedCount(nextJob.progressOffsetBeforeJob)
    setPhotoFlowTotal(
      bulkRunTotalPhotosRef.current ?? totalPhotosInPreview
    )
    setPrepareProgress(null)

    void (async () => {
      const offset = nextJob.progressOffsetBeforeJob
      const flowTotal =
        bulkRunTotalPhotosRef.current ?? totalPhotosInPreview
      const unsubscribe = window.photoApp.onScanPhotoLibraryProgress(
        (payload) => {
          if (payload.kind === 'prepare') {
            setPrepareProgress({
              completed: payload.completed,
              total: payload.total
            })
          } else {
            setPrepareProgress(null)
          }

          setPhotosSavedCount(
            computeGlobalBarProgress(offset, groupPhotoCountForJob, payload)
          )
          setPhotoFlowTotal(flowTotal)
        }
      )

      try {
        const nextSummary = await window.photoApp.scanPhotoLibrary({
          sourceRoot,
          outputRoot,
          ...nextJob.snapshotPayload,
          copyGroupKeysInThisRun: nextJob.copyGroupKeysInThisRun
        })
        const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })

        setLastLoadedIndex(loadedIndex)

        if (bulkSaveActiveRef.current) {
          mergedBulkSummaryRef.current = mergeScanSummaries(
            mergedBulkSummaryRef.current,
            nextSummary
          )
        }

        if (onlyKey) {
          setGroupSavePhaseByKey((previous) => ({
            ...previous,
            [onlyKey]: 'done'
          }))
        }

        const noMoreJobs = saveJobQueueRef.current.length === 0

        if (bulkSaveActiveRef.current && noMoreJobs) {
          const cancelledBulk = cancelRemainingBulkJobsRef.current
          cancelRemainingBulkJobsRef.current = false
          bulkSaveActiveRef.current = false
          setBulkSaveActive(false)
          bulkRunTotalPhotosRef.current = null
          bulkSaveStartIndexRef.current = 0
          setBulkRunStartIndex(null)
          setGroupSavePhaseByKey({})
          setHidePreviewPanelWhileSaving(false)
          setPhotosSavedCount(0)
          setPhotoFlowTotal(0)
          setPrepareProgress(null)
          setActiveSaveJobMeta(null)
          setSummary(mergedBulkSummaryRef.current ?? nextSummary)
          mergedBulkSummaryRef.current = null
          setPreviewResult(null)
          setGroupTitleInputs({})
          setGroupCompanionsInputs({})
          setGroupNotesInputs({})
          setPreviewImageLoadFailedByPhotoId({})
          setWizardStepIndex(0)
          if (cancelledBulk) {
            setErrorMessage(
              '남은 저장 작업을 취소했습니다. 완료된 그룹까지 결과가 반영되었습니다.'
            )
          }
        } else if (!bulkSaveActiveRef.current && nextJob.isLastStep) {
          bulkRunTotalPhotosRef.current = null
          bulkSaveStartIndexRef.current = 0
          setBulkRunStartIndex(null)
          setGroupSavePhaseByKey({})
          setHidePreviewPanelWhileSaving(false)
          setPhotosSavedCount(0)
          setPhotoFlowTotal(0)
          setPrepareProgress(null)
          setActiveSaveJobMeta(null)
          setSummary(nextSummary)
          setPreviewResult(null)
          setGroupTitleInputs({})
          setGroupCompanionsInputs({})
          setGroupNotesInputs({})
          setPreviewImageLoadFailedByPhotoId({})
          setWizardStepIndex(0)
        }
      } catch (error) {
        bulkSaveActiveRef.current = false
        setBulkSaveActive(false)
        bulkRunTotalPhotosRef.current = null
        bulkSaveStartIndexRef.current = 0
        setBulkRunStartIndex(null)
        cancelRemainingBulkJobsRef.current = false
        mergedBulkSummaryRef.current = null
        setSaveJobQueue([])
        setHidePreviewPanelWhileSaving(false)
        setPhotosSavedCount(0)
        setPhotoFlowTotal(0)
        setPrepareProgress(null)
        setActiveSaveJobMeta(null)
        setGroupSavePhaseByKey((previous) => {
          const next: Record<string, GroupSavePhase> = { ...previous }
          for (const key of nextJob.copyGroupKeysInThisRun) {
            next[key] = 'error'
          }
          for (const key of Object.keys(next)) {
            if (next[key] === 'queued') {
              next[key] = 'idle'
            }
          }
          return next
        })
        setErrorMessage(
          error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
        )
      } finally {
        unsubscribe()
        setRunningSaveTarget(null)
      }
    })()
  }, [
    runningSaveTarget,
    saveJobQueue,
    sourceRoot,
    outputRoot,
    setLastLoadedIndex,
    orderedPreviewGroups,
    totalPhotosInPreview,
    bulkSaveActive
  ])

  function handleToggleScanResultDetail(
    detail:
      | 'inBatchDup'
      | 'incrementalSkip'
      | 'existingSkip'
      | 'warnings'
      | 'failures'
  ): void {
    const isClosing = openScanResultDetail === detail

    setOpenScanResultDetail(isClosing ? null : detail)

    if (detail === 'warnings' && !isClosing) {
      setIssueSeverityFilter('warning')
      setIssueStageFilter('all')
      setIssueCodeQuery('')
      setIssueSourcePathQuery('')
    }

    if (detail === 'failures' && !isClosing) {
      setIssueSeverityFilter('error')
      setIssueStageFilter('all')
      setIssueCodeQuery('')
      setIssueSourcePathQuery('')
    }

    if (detail === 'inBatchDup' && !isClosing) {
      setDuplicatePathQuery('')
    }

    if (detail === 'incrementalSkip' && !isClosing) {
      setIncrementalSkipPathQuery('')
    }

    if (detail === 'existingSkip' && !isClosing) {
      setExistingSkipPathQuery('')
      setExistingSkipHashQuery('')
    }
  }

  function applyIssueQuickFilter(
    filter: (typeof ISSUE_QUICK_FILTERS)[number]
  ): void {
    setIssueStageFilter(filter.stage)
    setIssueCodeQuery(filter.codeQuery)
  }

  async function copyResultDetail(
    text: string,
    successMessage: string
  ): Promise<void> {
    if (!text.trim()) {
      setResultActionMessage(null)
      setErrorMessage('복사할 내용이 없습니다.')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setErrorMessage(null)
      setResultActionMessage(successMessage)
    } catch {
      setResultActionMessage(null)
      setErrorMessage('클립보드 복사에 실패했습니다.')
    }
  }

  async function selectSourceRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      SOURCE_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setSourceRoot(selectedPath)
      setWizardStepIndex(0)
      setPreviewResult(null)
      setGroupTitleInputs({})
      setGroupCompanionsInputs({})
      setGroupNotesInputs({})
      setPreviewImageLoadFailedByPhotoId({})
      setSummary(null)
      setOpenScanResultDetail(null)
      setErrorMessage(null)
      setSaveJobQueue([])
      setRunningSaveTarget(null)
      bulkSaveActiveRef.current = false
      setBulkSaveActive(false)
      bulkRunTotalPhotosRef.current = null
      bulkSaveStartIndexRef.current = 0
      setBulkRunStartIndex(null)
      setGroupSavePhaseByKey({})
      setHidePreviewPanelWhileSaving(false)
      setPhotosSavedCount(0)
      setPhotoFlowTotal(0)
      setPrepareProgress(null)
      setActiveSaveJobMeta(null)
    }
  }

  async function handlePreview(
    basis: MissingGpsGroupingBasis = missingGpsGroupingBasis
  ): Promise<void> {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 폴더와 설정의 출력 폴더를 먼저 준비하세요.')
      return
    }

    setIsLoadingPreview(true)
    setErrorMessage(null)

    try {
      const nextPreview = await window.photoApp.previewPendingOrganization({
        sourceRoot,
        outputRoot,
        missingGpsGroupingBasis: basis
      })

      setPreviewResult(nextPreview)
      setWizardStepIndex(0)
      setPreviewImageLoadFailedByPhotoId({})
      setGroupTitleInputs(
        Object.fromEntries(
          nextPreview.groups.map((group) => [group.groupKey, getInitialGroupTitleValue(group)])
        )
      )
      setGroupCompanionsInputs(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, '']))
      )
      setGroupNotesInputs(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, '']))
      )

      const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })
      setLastLoadedIndex(loadedIndex)
      setSaveJobQueue([])
      setRunningSaveTarget(null)
      bulkSaveActiveRef.current = false
      setBulkSaveActive(false)
      bulkRunTotalPhotosRef.current = null
      bulkSaveStartIndexRef.current = 0
      setBulkRunStartIndex(null)
      setGroupSavePhaseByKey({})
      setHidePreviewPanelWhileSaving(false)
      setPhotosSavedCount(0)
      setPhotoFlowTotal(0)
      setPrepareProgress(null)
      setActiveSaveJobMeta(null)
      setOpenScanResultDetail(null)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '신규 정리 후보를 불러오지 못했습니다.'
      )
    } finally {
      setIsLoadingPreview(false)
    }
  }

  function enqueueSaveAllGroups(): void {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 폴더와 설정의 출력 폴더를 먼저 준비하세요.')
      return
    }

    if (!previewResult) {
      setErrorMessage('먼저 정리 후보를 불러오세요.')
      return
    }

    if (orderedPreviewGroups.length === 0) {
      setErrorMessage('저장할 그룹이 없습니다.')
      return
    }

    if (savePipelineBusy) {
      return
    }

    const effectiveInputs = buildEffectiveOrganizeInputs(previewResult.groups, {
      missingGpsGroupingBasis,
      groupTitleInputs,
      groupCompanionsInputs,
      groupNotesInputs
    })

    setErrorMessage(null)
    mergedBulkSummaryRef.current = null
    cancelRemainingBulkJobsRef.current = false
    bulkSaveActiveRef.current = true
    setBulkSaveActive(true)

    const startIndex = Math.min(
      wizardStepIndex,
      Math.max(0, orderedPreviewGroups.length - 1)
    )
    bulkSaveStartIndexRef.current = startIndex
    setBulkRunStartIndex(startIndex)

    const remainingGroups = orderedPreviewGroups.slice(startIndex)
    const totalPhotosInThisBulk = remainingGroups.reduce(
      (sum, g) => sum + g.photoCount,
      0
    )
    bulkRunTotalPhotosRef.current = totalPhotosInThisBulk

    const queuedPhases: Record<string, GroupSavePhase> = {}
    for (let i = 0; i < orderedPreviewGroups.length; i += 1) {
      const g = orderedPreviewGroups[i]
      if (g && i >= startIndex) {
        queuedPhases[g.groupKey] = 'queued'
      }
    }
    setGroupSavePhaseByKey((previous) => ({ ...previous, ...queuedPhases }))
    setHidePreviewPanelWhileSaving(true)
    setPhotosSavedCount(0)
    setPhotoFlowTotal(totalPhotosInThisBulk)
    setActiveSaveJobMeta(null)

    const jobs: Array<{
      copyGroupKeysInThisRun: string[]
      isLastStep: boolean
      snapshotPayload: ReturnType<typeof buildOrganizeScanPayload>
      progressOffsetBeforeJob: number
    }> = []

    let progressOffsetBeforeJob = 0

    for (let index = startIndex; index < orderedPreviewGroups.length; index += 1) {
      const includedGroupKeySet = new Set(
        orderedPreviewGroups.slice(0, index + 1).map((g) => g.groupKey)
      )
      const snapshotPayload = buildOrganizeScanPayload(
        previewResult,
        includedGroupKeySet,
        effectiveInputs
      )
      const group = orderedPreviewGroups[index]

      if (!group) {
        continue
      }

      jobs.push({
        copyGroupKeysInThisRun: [group.groupKey],
        isLastStep: index >= orderedPreviewGroups.length - 1,
        snapshotPayload,
        progressOffsetBeforeJob
      })
      progressOffsetBeforeJob += group.photoCount
    }

    if (jobs.length === 0) {
      bulkSaveActiveRef.current = false
      setBulkSaveActive(false)
      bulkRunTotalPhotosRef.current = null
      setBulkRunStartIndex(null)
      setErrorMessage('이후에 저장할 그룹이 없습니다.')
      return
    }

    setSaveJobQueue((previous) => [...previous, ...jobs])
  }

  function cancelRemainingSaveJobs(): void {
    if (!savePipelineBusy) {
      return
    }

    cancelRemainingBulkJobsRef.current = true
    saveJobQueueRef.current = []
    setSaveJobQueue([])
  }

  function enqueueSaveCurrentGroup(): void {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 폴더와 설정의 출력 폴더를 먼저 준비하세요.')
      return
    }

    if (!previewResult) {
      setErrorMessage('먼저 정리 후보를 불러오세요.')
      return
    }

    const snapshotStepIndex = wizardStepIndex
    const currentGroup = orderedPreviewGroups[snapshotStepIndex]

    if (!currentGroup) {
      setErrorMessage('저장할 그룹을 찾을 수 없습니다.')
      return
    }

    const includedGroupKeySet = new Set(
      orderedPreviewGroups
        .slice(0, snapshotStepIndex + 1)
        .map((group) => group.groupKey)
    )

    const snapshotPayload = buildOrganizeScanPayload(
      previewResult,
      includedGroupKeySet,
      buildEffectiveOrganizeInputs(previewResult.groups, {
        missingGpsGroupingBasis,
        groupTitleInputs,
        groupCompanionsInputs,
        groupNotesInputs
      })
    )

    const isLastStep = snapshotStepIndex >= orderedPreviewGroups.length - 1

    const progressOffsetBeforeJob = orderedPreviewGroups
      .slice(0, snapshotStepIndex)
      .reduce((sum, g) => sum + g.photoCount, 0)

    setErrorMessage(null)

    const alreadyQueuedOrRunning =
      runningSaveTargetRef.current === currentGroup.groupKey ||
      saveJobQueue.some(
        (job) =>
          job.copyGroupKeysInThisRun.length === 1 &&
          job.copyGroupKeysInThisRun[0] === currentGroup.groupKey
      )

    if (alreadyQueuedOrRunning) {
      return
    }

    setGroupSavePhaseByKey((previous) => ({
      ...previous,
      [currentGroup.groupKey]: 'queued'
    }))

    setSaveJobQueue((previous) => [
      ...previous,
      {
        copyGroupKeysInThisRun: [currentGroup.groupKey],
        isLastStep,
        snapshotPayload,
        progressOffsetBeforeJob
      }
    ])

    if (isLastStep) {
      setHidePreviewPanelWhileSaving(true)
    }

    if (!isLastStep) {
      setWizardStepIndex((step) => step + 1)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="app-surface-card border-0 shadow-none">
        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-accent-strong)]">
                Source Library
              </p>
              <h2 className="text-lg font-semibold text-[var(--app-foreground)]">
                원본 사진 폴더
              </h2>
              <p className="text-sm text-[var(--app-muted)]">
                원본 폴더를 스캔해 그룹별 정리 후보를 만들고, 메타를 보완한 뒤 저장합니다.
              </p>
            </div>
            <div className="rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-muted)]">
              {sourceRoot || '아직 선택되지 않았습니다.'}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className="rounded-2xl bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
                onPress={() => void selectSourceRoot()}
              >
                원본 폴더 선택
              </Button>
              {!previewResult ? (
                <Button
                  variant="secondary"
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
                  isDisabled={isLoadingPreview}
                  onPress={() => void handlePreview()}
                >
                  {isLoadingPreview ? '후보 불러오는 중...' : '정리 시작하기'}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4">
              <p className="text-xs text-[var(--app-muted)]">현재 단계</p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-foreground)]">
                {previewResult ? '후보 검토 및 저장' : '원본 스캔 준비'}
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4">
              <p className="text-xs text-[var(--app-muted)]">출력 폴더</p>
              <p className="mt-2 line-clamp-3 text-sm font-medium text-[var(--app-foreground)]">
                {outputRoot || '설정 필요'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {!outputRoot ? (
        <section className="rounded-[28px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[var(--app-foreground)]">
                출력 폴더가 설정되지 않았습니다.
              </h2>
              <p className="text-sm text-[var(--app-muted)]">
                공통 출력 폴더는 설정 탭에서 지정합니다.
              </p>
            </div>
            {onNavigateToSettings ? (
              <Button
                variant="secondary"
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
                onPress={onNavigateToSettings}
              >
                설정으로 이동
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-[var(--app-foreground)]">
              GPS 없는 사진 그룹 기준
            </h2>
            <p className="text-sm text-[var(--app-muted)]">
              GPS 없는 사진만 선택한 기준으로 추천하고 저장합니다. GPS 있는 사진은
              계속 월별로 유지됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MISSING_GPS_GROUPING_OPTIONS.map((option) => {
              const isSelected = missingGpsGroupingBasis === option.value

              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'primary' : 'secondary'}
                  className={`rounded-full ${
                    isSelected
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                      : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]'
                  }`}
                  isDisabled={isLoadingPreview || savePipelineBusy}
                  onPress={() => {
                    if (option.value === missingGpsGroupingBasis) {
                      return
                    }

                    setMissingGpsGroupingBasis(option.value)

                    if (previewResult && sourceRoot && outputRoot) {
                      void handlePreview(option.value)
                    }
                  }}
                >
                  {option.label}
                </Button>
              )
            })}
          </div>
          <p className="text-xs text-[var(--app-muted)]">
            실제 폴더: `{formatMissingGpsFolderPattern(missingGpsGroupingBasis)}`.
            주별은 `week1`, `week2` 식으로 월 안에서 나뉩니다.
          </p>
        </div>
      </section>

      <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
        {!previewResult ? (
          <Button
            variant="primary"
            className="rounded-2xl bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
            isDisabled={isLoadingPreview}
            onPress={() => void handlePreview()}
          >
            {isLoadingPreview ? '후보 불러오는 중...' : '정리 시작하기'}
          </Button>
        ) : (
          <>
            {hasPendingPreviewGroups && orderedPreviewGroups.length > 1 ? (
              <Button
                variant="secondary"
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
                isDisabled={savePipelineBusy || wizardStepIndex === 0}
                onPress={() =>
                  setWizardStepIndex((step) => Math.max(0, step - 1))
                }
              >
                이전 그룹
              </Button>
            ) : null}
            <Button
              variant="secondary"
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)]"
              isDisabled={isLoadingPreview || savePipelineBusy}
              onPress={() => void handlePreview()}
            >
              후보 다시 불러오기
            </Button>
            {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
              <Button
                variant="primary"
                className="rounded-2xl bg-emerald-600 text-white"
                isDisabled={
                  isLoadingPreview ||
                  savePipelineBusy ||
                  orderedPreviewGroups.length === 0
                }
                onPress={() => enqueueSaveAllGroups()}
              >
                이후 그룹 전체 저장하기
              </Button>
            ) : null}
          </>
        )}
        <p className="text-sm text-[var(--app-muted)]">
          그룹마다 메타를 입력한 뒤 카드에서 한 그룹씩 저장하거나, 위의
          「이후 그룹 전체 저장하기」로 현재 카드 그룹부터 끝까지 입력값을
          한 번에 적용해 순서대로 복사합니다. 진행이 길면 아래 진행 표시를
          확인하세요. 완료 후 실행 결과 요약이 표시됩니다. GPS 없는 그룹은
          순서상 마지막에 처리됩니다.
        </p>
      </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {resultActionMessage ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {resultActionMessage}
        </div>
      ) : null}

      {bulkSaveActive && savePipelineBusy ? (
        <section
          className="rounded-[28px] border border-indigo-200 bg-indigo-50 p-5"
          aria-live="polite"
          aria-busy={runningSaveTarget !== null}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-indigo-900">
              이후 그룹 일괄 저장 진행 중
            </h2>
            <Button
              variant="secondary"
              className="shrink-0 rounded-2xl border border-indigo-300 bg-white text-xs font-medium text-indigo-900"
              onPress={() => cancelRemainingSaveJobs()}
            >
              남은 작업 취소
            </Button>
          </div>
          <p className="mt-1 text-sm text-indigo-800">
            현재 위저드 위치부터 남은 그룹만 복사·인덱스에 반영합니다. 막대에는
            원본 읽기·해시와 복사·썸네일이 함께 반영됩니다.
          </p>
          {prepareProgress ? (
            <p className="mt-2 text-xs text-indigo-700">
              원본 읽기·해시 (현재 그룹){' '}
              {prepareProgress.completed} / {prepareProgress.total}장
            </p>
          ) : null}
          {(() => {
            const denom =
              photoFlowTotal > 0 ? photoFlowTotal : totalPhotosInPreview || 1
            const overallPct = Math.min(
              100,
              Math.round((photosSavedCount / denom) * 100)
            )

            return (
              <>
                <p className="mt-2 text-xs font-medium text-indigo-900">
                  전체 진행 {overallPct}%
                </p>
                <progress
                  className="mt-2 h-2 w-full overflow-hidden rounded-full accent-indigo-600 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-indigo-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-600"
                  max={denom}
                  value={Math.min(photosSavedCount, denom)}
                />
                <p className="mt-1 text-sm text-indigo-800">
                  단위 진행{' '}
                  <span className="font-semibold text-indigo-950">
                    {photosSavedCount}
                  </span>{' '}
                  / {denom} ({overallPct}%)
                </p>
                <div className="mt-4 rounded-[24px] border border-indigo-200 bg-white/70 p-3">
                  <p className="text-xs font-semibold text-indigo-900">
                    그룹별 진행
                  </p>
                  <ul className="mt-2 space-y-2">
                    {(bulkRunStartIndex != null
                      ? orderedPreviewGroups.slice(bulkRunStartIndex)
                      : orderedPreviewGroups
                    ).map((g) => {
                      const phase = groupSavePhaseByKey[g.groupKey] ?? 'idle'
                      const linePct = getGroupLinePercent(
                        phase,
                        runningSaveTarget,
                        g.groupKey,
                        activeSaveJobMeta,
                        photosSavedCount
                      )
                      const titleLabel = effectiveGroupTitle(g, groupTitleInputs)

                      return (
                        <li key={g.groupKey}>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900">
                            <span
                              className="min-w-0 flex-1 truncate font-medium"
                              title={titleLabel}
                            >
                              {titleLabel}
                            </span>
                            <span className="shrink-0 text-indigo-800">
                              {linePct}% · {formatGroupSavePhaseLabel(phase)}
                            </span>
                          </div>
                          <progress
                            className="mt-1 h-1.5 w-full overflow-hidden rounded-full accent-indigo-500 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-indigo-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-500"
                            max={100}
                            value={linePct}
                          />
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            )
          })()}
          <p className="mt-2 text-xs text-indigo-700">
            현재 그룹마다 원본 처리(절반)와 저장(절반)을 합산해 전체 막대가
            움직입니다. 진행 중인 그룹은 끝날 때까지 걸릴 수 있습니다.
          </p>
        </section>
      ) : null}

      {hidePreviewPanelWhileSaving &&
      previewResult &&
      savePipelineBusy &&
      hasPendingPreviewGroups &&
      !bulkSaveActive ? (
        <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--app-foreground)]">
              저장 진행 중
            </h2>
            <Button
              variant="secondary"
              className="shrink-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-xs font-medium text-[var(--app-foreground)]"
              onPress={() => cancelRemainingSaveJobs()}
            >
              남은 작업 취소
            </Button>
          </div>
          {prepareProgress ? (
            <p className="mt-1 text-xs text-[var(--app-muted)]">
              원본 읽기·해시 (현재 그룹) {prepareProgress.completed} /{' '}
              {prepareProgress.total}장
            </p>
          ) : null}
          {(() => {
            const denom =
              photoFlowTotal > 0 ? photoFlowTotal : totalPhotosInPreview || 1
            const overallPct =
              denom > 0
                ? Math.min(100, Math.round((photosSavedCount / denom) * 100))
                : 0

            return (
              <>
                <p className="mt-2 text-xs font-medium text-[var(--app-foreground)]">
                  전체 진행 {overallPct}%
                </p>
                <progress
                  className="mt-2 h-2 w-full overflow-hidden rounded-full accent-sky-600 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-sky-600"
                  max={denom}
                  value={Math.min(photosSavedCount, denom)}
                />
                <p className="mt-1 text-xs text-[var(--app-muted)]">
                  단위 진행{' '}
                  <span className="font-medium text-[var(--app-foreground)]">
                    {photosSavedCount}
                  </span>{' '}
                  / {denom} ({overallPct}%)
                </p>
              </>
            )
          })()}
          <div className="mt-3 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-3">
            <p className="text-xs font-semibold text-[var(--app-foreground)]">
              그룹별 진행
            </p>
            <ul className="mt-2 space-y-2">
              {orderedPreviewGroups.map((g) => {
                const phase = groupSavePhaseByKey[g.groupKey] ?? 'idle'
                const linePct = getGroupLinePercent(
                  phase,
                  runningSaveTarget,
                  g.groupKey,
                  activeSaveJobMeta,
                  photosSavedCount
                )
                const titleLabel = effectiveGroupTitle(g, groupTitleInputs)

                return (
                  <li key={g.groupKey}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--app-foreground)]">
                      <span
                        className="min-w-0 flex-1 truncate font-medium"
                        title={titleLabel}
                      >
                        {titleLabel}
                      </span>
                      <span className="shrink-0 text-[var(--app-muted)]">
                        {linePct}% · {formatGroupSavePhaseLabel(phase)}
                      </span>
                    </div>
                    <progress
                      className="mt-1 h-1.5 w-full overflow-hidden rounded-full accent-sky-500 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-sky-500"
                      max={100}
                      value={linePct}
                    />
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {previewResult && !hidePreviewPanelWhileSaving ? (
        <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-sky-900">
                  신규 정리 후보 검토
                </h2>
                <p className="text-sm text-sky-800">
                  신규 정리 대상 {previewResult.pendingPhotoCount}장, 기존 중복
                  스킵 예정 {previewResult.skippedExistingCount}장
                </p>
                {previewResult.skippedUnchangedCount > 0 ? (
                  <p className="text-sm text-sky-700">
                    증분 재스캔 기준으로 변경 없는 입력{' '}
                    {previewResult.skippedUnchangedCount}장은 준비 단계에서 건너뛰었습니다.
                  </p>
                ) : null}
                {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
                  <p className="text-sm font-medium text-sky-900">
                    그룹 {wizardStepIndex + 1} / {orderedPreviewGroups.length} — GPS
                    있는 그룹을 먼저, GPS 없는 그룹은 마지막에 저장합니다.
                  </p>
                ) : null}
              </div>
              <div className="rounded-full bg-[var(--app-surface)] px-3 py-1 text-xs font-medium text-[var(--app-accent-strong)]">
                스캔 후보 {previewResult.scannedCount}장
              </div>
            </div>

            {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
                <p className="text-xs font-semibold text-[var(--app-accent-strong)]">
                  그룹별 저장 상태
                </p>
                <ul className="mt-2 space-y-1.5">
                  {orderedPreviewGroups.map((g) => {
                    const phase = groupSavePhaseByKey[g.groupKey] ?? 'idle'
                    const isCurrentRun = runningSaveTarget === g.groupKey
                    const titleLabel = effectiveGroupTitle(g, groupTitleInputs)
                    return (
                      <li
                        key={g.groupKey}
                        className={`flex flex-wrap items-center justify-between gap-2 text-xs ${
                          phase === 'saving' || isCurrentRun
                            ? 'font-medium text-[var(--app-accent-strong)]'
                            : 'text-[var(--app-foreground)]'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate" title={titleLabel}>
                          {titleLabel}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 ${
                            phase === 'saving' || isCurrentRun
                              ? 'bg-amber-100 text-amber-900'
                              : phase === 'done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : phase === 'error'
                                  ? 'bg-red-100 text-red-800'
                                  : phase === 'queued'
                                    ? 'bg-slate-200 text-slate-800'
                                    : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {formatGroupSavePhaseLabel(phase)}
                          {phase === 'saving' ? '…' : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {totalPhotosInPreview > 0 ? (
                  <p className="mt-2 text-xs text-[var(--app-muted)]">
                    사진{' '}
                    <span className="font-medium text-[var(--app-accent-strong)]">
                      {photosSavedCount}
                    </span>{' '}
                    /{' '}
                    {totalPhotosInPreview}장
                    {` (${Math.min(
                      100,
                      Math.round((photosSavedCount / totalPhotosInPreview) * 100)
                    )}%)`}
                  </p>
                ) : null}
              </div>
            ) : null}

            {hasPendingPreviewGroups && wizardGroup ? (
              <div className="space-y-4">
                {(() => {
                  const group = wizardGroup
                  const phaseForGroup =
                    groupSavePhaseByKey[group.groupKey] ?? 'idle'
                  const saveBusyForThisGroup =
                    runningSaveTarget === group.groupKey ||
                    saveJobQueue.some(
                      (job) =>
                        job.copyGroupKeysInThisRun.includes(group.groupKey)
                    ) ||
                    phaseForGroup === 'done'
                  const isLastInWizard =
                    orderedPreviewGroups.length > 0 &&
                    wizardStepIndex >= orderedPreviewGroups.length - 1
                  const saveButtonLabel = (() => {
                    switch (phaseForGroup) {
                      case 'saving':
                        return '저장 중…'
                      case 'queued':
                        return '저장 대기'
                      case 'done':
                        return '저장 완료'
                      case 'error':
                        return '다시 저장'
                      default:
                        break
                    }

                    return isLastInWizard ? '마지막 그룹 저장' : '이 그룹 저장 및 복사'
                  })()

                  return (
                  <Card
                    key={group.groupKey}
                    className="app-surface-card rounded-[28px] border-0 p-4 shadow-none"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-[var(--app-foreground)]">
                            {effectiveGroupTitle(group, groupTitleInputs)}
                          </h3>
                          <p className="text-sm text-[var(--app-muted)]">
                            사진 {group.photoCount}장
                            {group.representativeGps ? ' · GPS 기반 그룹' : ' · GPS 없음'}
                          </p>
                          {!group.representativeGps ? (
                            <p className="text-xs text-[var(--app-muted)]">
                              현재 기준: {formatMissingGpsGroupingBasisLabel(missingGpsGroupingBasis)}
                              {' · '}
                              실제 폴더: {formatMissingGpsFolderPattern(missingGpsGroupingBasis)}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            {getMissingGpsCategoryLabel(group.missingGpsCategory) ? (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                {getMissingGpsCategoryLabel(group.missingGpsCategory)}
                              </span>
                            ) : null}
                          </div>
                          {getAssignmentModeDescription(group) ? (
                            <p className="text-xs text-[var(--app-muted)]">
                              {getAssignmentModeDescription(group)}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-full bg-[var(--app-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--app-accent-strong)]">
                          {group.groupKey}
                        </div>
                      </div>

                        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5 sm:gap-2">
                          {group.representativePhotos.map((photo) => (
                            <div key={photo.id} className="min-w-0">
                              <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                                <PendingPreviewImageBlock
                                  photo={photo}
                                  imageFailed={Boolean(
                                    previewImageLoadFailedByPhotoId[photo.id]
                                  )}
                                  onImageError={() =>
                                    setPreviewImageLoadFailedByPhotoId(
                                      (current) => ({
                                        ...current,
                                        [photo.id]: true
                                      })
                                    )
                                  }
                                  imageHeightClass="h-14"
                                  placeholderClassName="flex h-14 items-center justify-center bg-slate-200 px-1 text-center text-[10px] leading-tight text-slate-500"
                                  imageAlt={photo.sourceFileName}
                                />
                              </div>
                              <p
                                className="mt-0.5 truncate text-[10px] font-medium text-slate-800"
                                title={photo.sourceFileName}
                              >
                                {photo.sourceFileName}
                              </p>
                              <p
                                className="truncate text-[10px] text-slate-500"
                                title={photo.capturedAtIso ?? '촬영 시각 없음'}
                              >
                                {photo.capturedAtIso ?? '촬영 시각 없음'}
                              </p>
                            </div>
                          ))}
                        </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-800">
                            기본 그룹명 제안
                          </p>
                          {group.suggestedTitles.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {group.suggestedTitles.map((title) => (
                                <button
                                  key={title}
                                  type="button"
                                  className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--app-accent-strong)]"
                                  onClick={() =>
                                    setGroupTitleInputs((current) => ({
                                      ...current,
                                      [group.groupKey]: title
                                    }))
                                  }
                                >
                                  {title}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--app-muted)]">
                              근처 GPS 범위에서 기존 그룹명이 없어 기본 그룹명을
                              사용합니다.
                            </p>
                          )}
                        </div>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-[var(--app-foreground)]">
                            그룹명 (저장 시 적용)
                          </span>
                          <Input
                            value={groupTitleInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupTitleInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            placeholder={group.displayTitle}
                            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-[var(--app-foreground)]">
                            동행인
                          </span>
                          <Input
                            value={groupCompanionsInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupCompanionsInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            placeholder="예: Alice, Bob"
                            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-[var(--app-foreground)]">
                            메모
                          </span>
                          <TextArea
                            value={groupNotesInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupNotesInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            placeholder="이 그룹에 대한 메모를 남겨두세요."
                            className="min-h-24 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                          />
                        </label>
                      </div>

                      {hasPendingPreviewGroups ? (
                        <div className="flex justify-end border-t border-[var(--app-border)] pt-4">
                          <Button
                            variant="primary"
                            className="rounded-2xl bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
                            isDisabled={saveBusyForThisGroup}
                            onPress={() => enqueueSaveCurrentGroup()}
                          >
                            {saveButtonLabel}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                  )
                })()}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center">
                <p className="text-sm font-semibold text-[var(--app-foreground)]">
                  새로 정리할 파일이 없습니다.
                </p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  현재 원본 폴더의 파일은 출력 폴더에 이미 있거나 중복으로
                  판단되었습니다.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-emerald-900">
                실행 결과
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-[24px] bg-white px-4 py-3">
                <p className="text-xs text-slate-500">스캔 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.scannedCount}
                </p>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-3">
                <p className="text-xs text-slate-500">증분 스킵 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.skippedUnchangedCount}
                </p>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-3">
                <p className="text-xs text-slate-500">유지 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.keptCount}
                </p>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-3">
                <p className="text-xs text-slate-500">신규 복사 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.copiedCount}
                </p>
              </div>
              <div className="rounded-[24px] bg-white px-4 py-3">
                <p className="text-xs text-slate-500">그룹 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.groupCount}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'inBatchDup'
                    ? 'border-emerald-500 bg-emerald-100 shadow-sm'
                    : 'border-emerald-100 bg-white hover:bg-emerald-50/40'
                }`}
                onClick={() => handleToggleScanResultDetail('inBatchDup')}
              >
                <p className="text-xs text-slate-500">중복 (같은 실행 내)</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.duplicateCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 쌍 비교</p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'incrementalSkip'
                    ? 'border-emerald-500 bg-emerald-100 shadow-sm'
                    : 'border-emerald-100 bg-white hover:bg-emerald-50/40'
                }`}
                onClick={() => handleToggleScanResultDetail('incrementalSkip')}
              >
                <p className="text-xs text-slate-500">증분 스킵 (준비 단계)</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.skippedUnchangedCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  sourcePath + size + mtime 기준
                </p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'existingSkip'
                    ? 'border-emerald-500 bg-emerald-100 shadow-sm'
                    : 'border-emerald-100 bg-white hover:bg-emerald-50/40'
                }`}
                onClick={() => handleToggleScanResultDetail('existingSkip')}
              >
                <p className="text-xs text-slate-500">기존 출력과 동일 (스킵)</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.skippedExistingCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 경로 비교</p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'warnings'
                    ? 'border-emerald-500 bg-emerald-100 shadow-sm'
                    : 'border-emerald-100 bg-white hover:bg-emerald-50/40'
                }`}
                onClick={() => handleToggleScanResultDetail('warnings')}
              >
                <p className="text-xs text-slate-500">경고 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.warningCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 목록</p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'failures'
                    ? 'border-emerald-500 bg-emerald-100 shadow-sm'
                    : 'border-emerald-100 bg-white hover:bg-emerald-50/40'
                }`}
                onClick={() => handleToggleScanResultDetail('failures')}
              >
                <p className="text-xs text-slate-500">실패 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.failureCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 목록</p>
              </button>
            </div>

            {openScanResultDetail === 'inBatchDup' ? (
              <div className="rounded-[24px] border border-emerald-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      같은 실행 안에서 동일 파일(해시) 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      canonical 원본과 이번 실행에서 생략된 duplicate 원본을 같이
                      확인할 수 있습니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedInBatchDuplicates.length} / 전체{' '}
                    {groupedInBatchDuplicates.length}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    className="rounded-2xl border border-[var(--app-border)] bg-white text-xs font-medium text-[var(--app-foreground)]"
                    onPress={() =>
                      void copyResultDetail(
                        formatDuplicateListForClipboard(reviewedInBatchDuplicates),
                        '중복 검토 목록을 복사했습니다.'
                      )
                    }
                  >
                    목록 복사
                  </Button>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    sourcePath 검색
                  </span>
                  <Input
                    value={duplicatePathQuery}
                    onChange={(event) => setDuplicatePathQuery(event.target.value)}
                    placeholder="canonical 또는 duplicate 경로 일부 검색"
                    className="rounded-2xl border border-[var(--app-border)] bg-white"
                  />
                </label>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={duplicateSort}
                    onChange={(event) =>
                      setDuplicateSort(event.target.value as DuplicateSortOption)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="duplicates-desc">duplicate 수 많은 순</option>
                    <option value="path-asc">canonical 경로순</option>
                  </select>
                </label>
                {reviewedInBatchDuplicates.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">해당 없음</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {reviewedInBatchDuplicates.map((dupGroup) => (
                      <li
                        key={dupGroup.canonicalPhotoId}
                        className="rounded-[20px] border border-slate-200 p-3"
                      >
                        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            canonical 1장
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            duplicate {dupGroup.duplicateSourcePaths.length}장
                          </span>
                        </div>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="sm:w-2/5">
                            <p className="text-[11px] font-medium text-slate-600">
                              대표(저장)
                            </p>
                            <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-100">
                              <img
                                src={localImageFileUrl(dupGroup.canonicalSourcePath)}
                                alt=""
                                className="h-40 w-full object-contain"
                              />
                            </div>
                            <p className="mt-1 break-all text-[11px] text-slate-700">
                              {dupGroup.canonicalSourcePath}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-slate-600">
                              중복(복사 생략){' '}
                              {dupGroup.duplicateSourcePaths.length}장
                            </p>
                            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {dupGroup.duplicateSourcePaths.map((path, idx) => (
                                <div
                                  key={`${path}-${idx}`}
                                  className="overflow-hidden rounded border border-slate-200 bg-slate-100"
                                >
                                  <img
                                    src={localImageFileUrl(path)}
                                    alt=""
                                    className="h-16 w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                            <ul className="mt-2 space-y-1">
                              {dupGroup.duplicateSourcePaths.map((path) => (
                                <li
                                  key={path}
                                  className="break-all text-[11px] text-slate-600"
                                >
                                  {path}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {openScanResultDetail === 'incrementalSkip' ? (
              <div className="rounded-[24px] border border-emerald-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      증분 재스캔으로 건너뛴 입력 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      이전 저장 fingerprint 와 현재 `sourcePath + size + mtime` 이
                      같아 준비 단계에서 제외된 원본 파일입니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedIncrementalSkips.length} / 전체{' '}
                    {summary.skippedUnchangedDetails.length}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    className="rounded-2xl border border-[var(--app-border)] bg-white text-xs font-medium text-[var(--app-foreground)]"
                    onPress={() =>
                      void copyResultDetail(
                        formatIncrementalSkipListForClipboard(reviewedIncrementalSkips),
                        '증분 스킵 목록을 복사했습니다.'
                      )
                    }
                  >
                    목록 복사
                  </Button>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    sourcePath 검색
                  </span>
                  <Input
                    value={incrementalSkipPathQuery}
                    onChange={(event) =>
                      setIncrementalSkipPathQuery(event.target.value)
                    }
                    placeholder="증분 스킵된 원본 경로 검색"
                    className="rounded-2xl border border-[var(--app-border)] bg-white"
                  />
                </label>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={incrementalSkipSort}
                    onChange={(event) =>
                      setIncrementalSkipSort(
                        event.target.value as IncrementalSkipSortOption
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="path-asc">경로순</option>
                    <option value="mtime-desc">mtime 최신순</option>
                  </select>
                </label>
                {reviewedIncrementalSkips.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">해당 없음</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {reviewedIncrementalSkips.map((row, index) => (
                      <li
                        key={`${row.sourcePath}-${index}`}
                        className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800"
                      >
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                          <span className="rounded-full bg-white px-2 py-1">
                            {row.sourceFileName}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1">
                            {row.sourceFingerprint.sizeBytes} bytes
                          </span>
                          <span className="rounded-full bg-white px-2 py-1">
                            mtime{' '}
                            {new Date(
                              row.sourceFingerprint.modifiedAtMs
                            ).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-2 break-all text-slate-700">
                          {row.sourcePath}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {openScanResultDetail === 'existingSkip' ? (
              <div className="rounded-[24px] border border-emerald-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      기존 출력과 동일해 건너뛴 항목 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      source 원본과 기존 output 대상 경로를 함께 비교할 수 있습니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedExistingSkips.length} / 전체{' '}
                    {summary.existingOutputSkipDetails.length}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    className="rounded-2xl border border-[var(--app-border)] bg-white text-xs font-medium text-[var(--app-foreground)]"
                    onPress={() =>
                      void copyResultDetail(
                        formatExistingSkipListForClipboard(reviewedExistingSkips),
                        '기존 출력 스킵 목록을 복사했습니다.'
                      )
                    }
                  >
                    목록 복사
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      경로 검색
                    </span>
                    <Input
                      value={existingSkipPathQuery}
                      onChange={(event) => setExistingSkipPathQuery(event.target.value)}
                      placeholder="sourcePath 또는 outputRelativePath 검색"
                      className="rounded-2xl border border-[var(--app-border)] bg-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      SHA-256 검색
                    </span>
                    <Input
                      value={existingSkipHashQuery}
                      onChange={(event) => setExistingSkipHashQuery(event.target.value)}
                      placeholder="해시 앞부분 검색"
                      className="rounded-2xl border border-[var(--app-border)] bg-white"
                    />
                  </label>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={existingSkipSort}
                    onChange={(event) =>
                      setExistingSkipSort(
                        event.target.value as ExistingSkipSortOption
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="hash-asc">SHA-256 기준</option>
                    <option value="path-asc">원본 경로순</option>
                  </select>
                </label>
                {reviewedExistingSkips.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">해당 없음</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {reviewedExistingSkips.map((row, index) => (
                      <li
                        key={`${row.sourcePhotoId}-${index}`}
                        className="rounded-md border border-slate-200 p-3 text-sm text-slate-800"
                      >
                        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            sourcePhotoId: {row.sourcePhotoId}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            SHA-256: {row.sha256.slice(0, 12)}...
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-medium text-slate-600">
                              원본
                            </p>
                            <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-100">
                              <img
                                src={localImageFileUrl(row.sourcePath)}
                                alt=""
                                className="h-28 w-full object-contain"
                              />
                            </div>
                            <p className="mt-1 break-all text-[11px]">{row.sourcePath}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-slate-600">
                              기존 출력
                            </p>
                            <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-100">
                              <img
                                src={localImageFileUrl(
                                  outputRoot
                                    ? joinPathSegments(
                                        outputRoot,
                                        row.existingOutputRelativePath
                                      )
                                    : row.existingOutputRelativePath
                                )}
                                alt=""
                                className="h-28 w-full object-contain"
                              />
                            </div>
                            <p className="mt-1 break-all text-[11px]">
                              {outputRoot
                                ? joinPathSegments(
                                    outputRoot,
                                    row.existingOutputRelativePath
                                  )
                                : row.existingOutputRelativePath}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              SHA-256: {row.sha256}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {openScanResultDetail === 'warnings' ||
            openScanResultDetail === 'failures' ? (
              <div
                className={`rounded-lg border p-4 ${
                  openScanResultDetail === 'failures'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        openScanResultDetail === 'failures'
                          ? 'text-red-950'
                          : 'text-amber-950'
                      }`}
                    >
                      실행 이슈 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      severity, stage, code, sourcePath 기준으로 다시 확인할 수
                      있습니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedIssues.length} / 전체 {summary.issues.length}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      void copyResultDetail(
                        formatIssueListForClipboard(reviewedIssues),
                        '이슈 검토 목록을 복사했습니다.'
                      )
                    }
                  >
                    목록 복사
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {([
                    ['all', '전체'],
                    ['warning', '경고'],
                    ['error', '실패']
                  ] as const).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        issueSeverityFilter === value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => setIssueSeverityFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ISSUE_QUICK_FILTERS.map((filter) => (
                    <button
                      type="button"
                      key={filter.key}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        isIssueQuickFilterActive(
                          filter,
                          issueStageFilter,
                          issueCodeQuery
                        )
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => applyIssueQuickFilter(filter)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      stage
                    </span>
                    <select
                      value={issueStageFilter}
                      onChange={(event) =>
                        setIssueStageFilter(
                          event.target.value as 'all' | ScanPhotoLibraryIssue['stage']
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="all">전체 stage</option>
                      {issueStageOptions.map((stage) => (
                        <option key={stage} value={stage}>
                          {formatIssueStageLabel(stage)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      code 검색
                    </span>
                    <input
                      value={issueCodeQuery}
                      onChange={(event) => setIssueCodeQuery(event.target.value)}
                      placeholder="예: metadata-missing"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      sourcePath 검색
                    </span>
                    <input
                      value={issueSourcePathQuery}
                      onChange={(event) => setIssueSourcePathQuery(event.target.value)}
                      placeholder="경로 일부 검색"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </label>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={issueSort}
                    onChange={(event) =>
                      setIssueSort(event.target.value as IssueSortOption)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="severity-stage-path">severity/stage 기준</option>
                    <option value="path-asc">sourcePath 기준</option>
                    <option value="code-asc">code 기준</option>
                  </select>
                </label>

                {reviewedIssues.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    현재 필터 조건에 맞는 이슈가 없습니다.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 hidden grid-cols-[90px_100px_180px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 lg:grid">
                      <span>severity</span>
                      <span>stage</span>
                      <span>code</span>
                      <span>sourcePath</span>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {reviewedIssues.map((issue, index) => (
                        <li
                          key={`${issue.sourcePath}-${issue.code}-${index}`}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800"
                        >
                          <div className="grid gap-2 lg:grid-cols-[90px_100px_180px_minmax(0,1fr)] lg:items-start lg:gap-3">
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                severity
                              </p>
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getIssueSeverityBadgeClass(issue.severity)}`}
                              >
                                {formatIssueSeverityLabel(issue.severity)}
                              </span>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                stage
                              </p>
                              <p className="font-medium text-slate-700">
                                {formatIssueStageLabel(issue.stage)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                code
                              </p>
                              <p className="font-mono text-[11px] text-slate-700">
                                {issue.code}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                sourcePath
                              </p>
                              <p className="break-all text-slate-800">
                                {issue.sourcePath}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
                            {issue.photoId ? <p>photoId: {issue.photoId}</p> : null}
                            {issue.outputRelativePath ? (
                              <p className="break-all">
                                출력 상대경로: {issue.outputRelativePath}
                              </p>
                            ) : null}
                            {issue.destinationPath ? (
                              <p className="break-all">
                                대상 경로: {issue.destinationPath}
                              </p>
                            ) : null}
                            <p className="text-xs text-slate-800">{issue.message}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
