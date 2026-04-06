import { useEffect, useMemo, useRef, useState } from 'react'

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
import type { InBatchDuplicateDetail } from '@application/dto/ScanPhotoLibraryResult'
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
  onNavigateToBrowse?: () => void
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
  onNavigateToBrowse,
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
    null | 'inBatchDup' | 'existingSkip' | 'warnings' | 'failures'
  >(null)
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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          사진 정리 실행
        </h1>
        <p className="text-sm text-slate-600">
          원본 폴더를 스캔해 그룹별로 정리를 실행합니다.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">원본 사진 폴더</h2>
          <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
            {sourceRoot || '아직 선택되지 않았습니다.'}
          </p>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => void selectSourceRoot()}
          >
            원본 폴더 선택
          </button>
        </div>
      </section>

      {!outputRoot ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">
                출력 폴더가 설정되지 않았습니다.
              </h2>
              <p className="text-sm text-slate-600">
                공통 출력 폴더는 설정 탭에서 지정합니다.
              </p>
            </div>
            {onNavigateToSettings ? (
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                onClick={onNavigateToSettings}
              >
                설정으로 이동
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              GPS 없는 사진 그룹 기준
            </h2>
            <p className="text-sm text-slate-600">
              GPS 없는 사진만 선택한 기준으로 추천하고 저장합니다. GPS 있는 사진은
              계속 월별로 유지됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MISSING_GPS_GROUPING_OPTIONS.map((option) => {
              const isSelected = missingGpsGroupingBasis === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                  disabled={isLoadingPreview || savePipelineBusy}
                  onClick={() => {
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
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">
            실제 폴더: `{formatMissingGpsFolderPattern(missingGpsGroupingBasis)}`.
            주별은 `week1`, `week2` 식으로 월 안에서 나뉩니다.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {!previewResult ? (
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoadingPreview}
            onClick={() => void handlePreview()}
          >
            {isLoadingPreview ? '후보 불러오는 중...' : '정리 시작하기'}
          </button>
        ) : (
          <>
            {hasPendingPreviewGroups && orderedPreviewGroups.length > 1 ? (
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={savePipelineBusy || wizardStepIndex === 0}
                onClick={() => setWizardStepIndex((step) => Math.max(0, step - 1))}
              >
                이전 그룹
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={isLoadingPreview || savePipelineBusy}
              onClick={() => void handlePreview()}
            >
              후보 다시 불러오기
            </button>
            {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={
                  isLoadingPreview ||
                  savePipelineBusy ||
                  orderedPreviewGroups.length === 0
                }
                onClick={() => enqueueSaveAllGroups()}
              >
                이후 그룹 전체 저장하기
              </button>
            ) : null}
          </>
        )}
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          disabled={!outputRoot}
          onClick={onNavigateToBrowse}
        >
          조회 페이지 열기
        </button>
        <p className="text-sm text-slate-500">
          그룹마다 메타를 입력한 뒤 카드에서 한 그룹씩 저장하거나, 위의
          「이후 그룹 전체 저장하기」로 현재 카드 그룹부터 끝까지 입력값을
          한 번에 적용해 순서대로 복사합니다. 진행이 길면 아래 진행 표시를
          확인하세요. 완료 후 실행 결과 요약이 표시됩니다. GPS 없는 그룹은
          순서상 마지막에 처리됩니다.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {bulkSaveActive && savePipelineBusy ? (
        <section
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"
          aria-live="polite"
          aria-busy={runningSaveTarget !== null}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-indigo-900">
              이후 그룹 일괄 저장 진행 중
            </h2>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-900"
              onClick={() => cancelRemainingSaveJobs()}
            >
              남은 작업 취소
            </button>
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
                <div className="mt-4 rounded-lg border border-indigo-200 bg-white/70 p-3">
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
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">저장 진행 중</h2>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
              onClick={() => cancelRemainingSaveJobs()}
            >
              남은 작업 취소
            </button>
          </div>
          {prepareProgress ? (
            <p className="mt-1 text-xs text-slate-600">
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
                <p className="mt-2 text-xs font-medium text-slate-800">
                  전체 진행 {overallPct}%
                </p>
                <progress
                  className="mt-2 h-2 w-full overflow-hidden rounded-full accent-sky-600 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-sky-600"
                  max={denom}
                  value={Math.min(photosSavedCount, denom)}
                />
                <p className="mt-1 text-xs text-slate-600">
                  단위 진행{' '}
                  <span className="font-medium text-slate-900">{photosSavedCount}</span>{' '}
                  / {denom} ({overallPct}%)
                </p>
              </>
            )
          })()}
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-900">그룹별 진행</p>
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
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-800">
                      <span
                        className="min-w-0 flex-1 truncate font-medium"
                        title={titleLabel}
                      >
                        {titleLabel}
                      </span>
                      <span className="shrink-0 text-slate-700">
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
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-5">
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
                {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
                  <p className="text-sm font-medium text-sky-900">
                    그룹 {wizardStepIndex + 1} / {orderedPreviewGroups.length} — GPS
                    있는 그룹을 먼저, GPS 없는 그룹은 마지막에 저장합니다.
                  </p>
                ) : null}
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700">
                스캔 후보 {previewResult.scannedCount}장
              </div>
            </div>

            {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
              <div className="rounded-lg border border-sky-200 bg-white p-3">
                <p className="text-xs font-semibold text-sky-900">
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
                            ? 'font-medium text-sky-900'
                            : 'text-slate-700'
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
                  <p className="mt-2 text-xs text-sky-800">
                    사진{' '}
                    <span className="font-medium text-sky-900">{photosSavedCount}</span> /{' '}
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
                  <article
                    key={group.groupKey}
                    className="rounded-xl border border-sky-200 bg-white p-4"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {effectiveGroupTitle(group, groupTitleInputs)}
                          </h3>
                          <p className="text-sm text-slate-600">
                            사진 {group.photoCount}장
                            {group.representativeGps ? ' · GPS 기반 그룹' : ' · GPS 없음'}
                          </p>
                          {!group.representativeGps ? (
                            <p className="text-xs text-slate-500">
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
                            <p className="text-xs text-slate-500">
                              {getAssignmentModeDescription(group)}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
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
                                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
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
                            <p className="text-sm text-slate-500">
                              근처 GPS 범위에서 기존 그룹명이 없어 기본 그룹명을
                              사용합니다.
                            </p>
                          )}
                        </div>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-800">
                            그룹명 (저장 시 적용)
                          </span>
                          <input
                            value={groupTitleInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupTitleInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                            placeholder={group.displayTitle}
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-800">
                            동행인
                          </span>
                          <input
                            value={groupCompanionsInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupCompanionsInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                            placeholder="예: Alice, Bob"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium text-slate-800">
                            메모
                          </span>
                          <textarea
                            value={groupNotesInputs[group.groupKey] ?? ''}
                            onChange={(event) =>
                              setGroupNotesInputs((current) => ({
                                ...current,
                                [group.groupKey]: event.target.value
                              }))
                            }
                            className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                            placeholder="이 그룹에 대한 메모를 남겨두세요."
                          />
                        </label>
                      </div>

                      {hasPendingPreviewGroups ? (
                        <div className="flex justify-end border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            disabled={saveBusyForThisGroup}
                            onClick={() => enqueueSaveCurrentGroup()}
                          >
                            {saveButtonLabel}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                  )
                })()}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-sky-300 bg-white p-6 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  새로 정리할 파일이 없습니다.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  현재 원본 폴더의 파일은 출력 폴더에 이미 있거나 중복으로
                  판단되었습니다.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {summary ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-emerald-900">
                실행 결과
              </h2>
              <button
                type="button"
                className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800"
                onClick={onNavigateToBrowse}
              >
                결과 조회로 이동
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">스캔 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.scannedCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">유지 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.keptCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">신규 복사 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.copiedCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">그룹 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.groupCount}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'inBatchDup'
                    ? 'border-emerald-500 bg-emerald-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                onClick={() =>
                  setOpenScanResultDetail((current) =>
                    current === 'inBatchDup' ? null : 'inBatchDup'
                  )
                }
              >
                <p className="text-xs text-slate-500">중복 (같은 실행 내)</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.duplicateCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 쌍 비교</p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'existingSkip'
                    ? 'border-emerald-500 bg-emerald-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                onClick={() =>
                  setOpenScanResultDetail((current) =>
                    current === 'existingSkip' ? null : 'existingSkip'
                  )
                }
              >
                <p className="text-xs text-slate-500">기존 출력과 동일 (스킵)</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.skippedExistingCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 경로 비교</p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'warnings'
                    ? 'border-emerald-500 bg-emerald-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                onClick={() =>
                  setOpenScanResultDetail((current) =>
                    current === 'warnings' ? null : 'warnings'
                  )
                }
              >
                <p className="text-xs text-slate-500">경고 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.warningCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 목록</p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'failures'
                    ? 'border-emerald-500 bg-emerald-100'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                onClick={() =>
                  setOpenScanResultDetail((current) =>
                    current === 'failures' ? null : 'failures'
                  )
                }
              >
                <p className="text-xs text-slate-500">실패 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.failureCount}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">탭하여 목록</p>
              </button>
            </div>

            {openScanResultDetail === 'inBatchDup' ? (
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-800">
                  같은 실행 안에서 동일 파일(해시) — 대표 1장만 저장, 나머지는 복사
                  생략
                </p>
                {groupedInBatchDuplicates.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">해당 없음</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {groupedInBatchDuplicates.map((dupGroup) => (
                      <li
                        key={dupGroup.canonicalPhotoId}
                        className="rounded-md border border-slate-200 p-3"
                      >
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

            {openScanResultDetail === 'existingSkip' ? (
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-800">
                  출력 폴더에 이미 동일 해시가 있어 복사를 건너뜀
                </p>
                {summary.existingOutputSkipDetails.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">해당 없음</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {summary.existingOutputSkipDetails.map((row, index) => (
                      <li
                        key={`${row.sourcePhotoId}-${index}`}
                        className="rounded-md border border-slate-200 p-3 text-sm text-slate-800"
                      >
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

            {openScanResultDetail === 'warnings' ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-950">경고 목록</p>
                {summary.issues.filter((i) => i.severity === 'warning').length ===
                0 ? (
                  <p className="mt-2 text-sm text-slate-600">해당 없음</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {summary.issues
                      .filter((i) => i.severity === 'warning')
                      .map((issue, index) => (
                        <li
                          key={`${issue.sourcePath}-${issue.code}-${index}`}
                          className="rounded border border-amber-200 bg-white p-2 text-xs text-slate-800"
                        >
                          <p className="font-mono text-[11px] text-slate-600">
                            {issue.code} · {issue.stage}
                          </p>
                          <p className="mt-1 break-all">{issue.sourcePath}</p>
                          {issue.photoId ? (
                            <p className="text-slate-500">photoId: {issue.photoId}</p>
                          ) : null}
                          <p className="mt-1 text-slate-700">{issue.message}</p>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ) : null}

            {openScanResultDetail === 'failures' ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold text-red-950">실패 목록</p>
                {summary.issues.filter((i) => i.severity === 'error').length ===
                0 ? (
                  <p className="mt-2 text-sm text-slate-600">해당 없음</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {summary.issues
                      .filter((i) => i.severity === 'error')
                      .map((issue, index) => (
                        <li
                          key={`${issue.sourcePath}-${issue.code}-${index}`}
                          className="rounded border border-red-200 bg-white p-2 text-xs text-slate-800"
                        >
                          <p className="font-mono text-[11px] text-slate-600">
                            {issue.code} · {issue.stage}
                          </p>
                          <p className="mt-1 break-all">{issue.sourcePath}</p>
                          {issue.photoId ? (
                            <p className="text-slate-500">photoId: {issue.photoId}</p>
                          ) : null}
                          {issue.outputRelativePath ? (
                            <p className="break-all text-slate-600">
                              출력 상대경로: {issue.outputRelativePath}
                            </p>
                          ) : null}
                          {issue.destinationPath ? (
                            <p className="break-all text-slate-600">
                              대상 경로: {issue.destinationPath}
                            </p>
                          ) : null}
                          <p className="mt-1 text-slate-800">{issue.message}</p>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
