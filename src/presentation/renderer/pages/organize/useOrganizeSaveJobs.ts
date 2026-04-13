import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'

import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'
import type {
  PreviewPendingOrganizationResult,
  LoadLibraryIndexResult
} from '@shared/types/preload'
import { buildOrganizeScanPayload } from '@presentation/renderer/pages/organizeScanPayload'
import {
  buildEffectiveOrganizeInputs,
  type GroupSavePhase
} from '@presentation/renderer/pages/organize/organizeGroupForm'
import {
  computeGlobalBarProgress,
  mergeScanSummaries
} from '@presentation/renderer/pages/organize/organizeScanSummaryMerge'

type PreviewGroup = PreviewPendingOrganizationResult['groups'][number]

export interface OrganizeSaveJob {
  copyGroupKeysInThisRun: string[]
  isLastStep: boolean
  snapshotPayload: ReturnType<typeof buildOrganizeScanPayload>
  progressOffsetBeforeJob: number
}

export interface UseOrganizeSaveJobsOptions {
  sourceRoot: string | null
  outputRoot: string | null
  setLastLoadedIndex: (index: LoadLibraryIndexResult) => void
  previewResult: PreviewPendingOrganizationResult | null
  orderedPreviewGroups: PreviewGroup[]
  totalPhotosInPreview: number
  missingGpsGroupingBasis: MissingGpsGroupingBasis
  groupTitleInputs: Record<string, string>
  groupCompanionsInputs: Record<string, string>
  groupNotesInputs: Record<string, string>
  wizardStepIndex: number
  setWizardStepIndex: Dispatch<SetStateAction<number>>
  setSummary: Dispatch<SetStateAction<ScanPhotoLibrarySummary | null>>
  setPreviewResult: Dispatch<
    SetStateAction<PreviewPendingOrganizationResult | null>
  >
  setGroupTitleInputs: Dispatch<SetStateAction<Record<string, string>>>
  setGroupCompanionsInputs: Dispatch<SetStateAction<Record<string, string>>>
  setGroupNotesInputs: Dispatch<SetStateAction<Record<string, string>>>
  setPreviewImageLoadFailedByPhotoId: Dispatch<
    SetStateAction<Record<string, boolean>>
  >
  setErrorMessage: (message: string | null) => void
}

export function useOrganizeSaveJobs({
  sourceRoot,
  outputRoot,
  setLastLoadedIndex,
  previewResult,
  orderedPreviewGroups,
  totalPhotosInPreview,
  missingGpsGroupingBasis,
  groupTitleInputs,
  groupCompanionsInputs,
  groupNotesInputs,
  wizardStepIndex,
  setWizardStepIndex,
  setSummary,
  setPreviewResult,
  setGroupTitleInputs,
  setGroupCompanionsInputs,
  setGroupNotesInputs,
  setPreviewImageLoadFailedByPhotoId,
  setErrorMessage
}: UseOrganizeSaveJobsOptions) {
  const [saveJobQueue, setSaveJobQueue] = useState<OrganizeSaveJob[]>([])
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

  const savePipelineBusy =
    runningSaveTarget !== null || saveJobQueue.length > 0

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
    bulkSaveActive,
    setSummary,
    setPreviewResult,
    setGroupTitleInputs,
    setGroupCompanionsInputs,
    setGroupNotesInputs,
    setPreviewImageLoadFailedByPhotoId,
    setWizardStepIndex,
    setErrorMessage
  ])

  const enqueueSaveAllGroups = useCallback((): void => {
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

    const jobs: OrganizeSaveJob[] = []

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
  }, [
    sourceRoot,
    outputRoot,
    previewResult,
    orderedPreviewGroups,
    missingGpsGroupingBasis,
    groupTitleInputs,
    groupCompanionsInputs,
    groupNotesInputs,
    wizardStepIndex,
    savePipelineBusy,
    setErrorMessage
  ])

  const cancelRemainingSaveJobs = useCallback((): void => {
    if (!savePipelineBusy) {
      return
    }

    cancelRemainingBulkJobsRef.current = true
    saveJobQueueRef.current = []
    setSaveJobQueue([])
  }, [savePipelineBusy])

  const enqueueSaveCurrentGroup = useCallback((): void => {
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
  }, [
    sourceRoot,
    outputRoot,
    previewResult,
    orderedPreviewGroups,
    wizardStepIndex,
    missingGpsGroupingBasis,
    groupTitleInputs,
    groupCompanionsInputs,
    groupNotesInputs,
    saveJobQueue,
    setWizardStepIndex,
    setErrorMessage
  ])

  const resetSavePipelineToIdle = useCallback(() => {
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
  }, [])

  return {
    saveJobQueue,
    runningSaveTarget,
    bulkSaveActive,
    prepareProgress,
    photoFlowTotal,
    groupSavePhaseByKey,
    hidePreviewPanelWhileSaving,
    photosSavedCount,
    activeSaveJobMeta,
    bulkRunStartIndex,
    savePipelineBusy,
    enqueueSaveAllGroups,
    enqueueSaveCurrentGroup,
    cancelRemainingSaveJobs,
    resetSavePipelineToIdle
  }
}
