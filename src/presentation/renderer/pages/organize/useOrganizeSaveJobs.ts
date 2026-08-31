import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'

import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import type {
  LoadLibraryIndexResult,
  OrganizeJobSaveStepRequest,
  PreviewPendingOrganizationResult,
  ScanPhotoLibrarySummary
} from '@shared/types/preload'
import { buildOrganizeScanPayload } from '@presentation/renderer/pages/organizeScanPayload'
import { buildEffectiveOrganizeInputs } from '@presentation/renderer/pages/organize/organizeGroupForm'
import { computeGroupSavePhasesFromJobStatus } from '@presentation/renderer/pages/organize/organizeScanSummaryMerge'
import { useOrganizeJobStore } from '@presentation/renderer/store/useOrganizeJobStore'

type PreviewGroup = PreviewPendingOrganizationResult['groups'][number]

function sourcePathsForPreviewGroup(group: PreviewGroup): string[] {
  return group.representativePhotos.map((photo) => photo.sourcePath)
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

/**
 * 정리 저장(scan-photo-library)을 메인 프로세스의 `startOrganizeJob`
 * 백그라운드 잡으로 실행한다. 예전에는 이 훅이 렌더러 로컬 큐로 그룹을
 * 하나씩 직접 호출했는데, 그 큐를 비우는 useEffect가 이 훅이 마운트된
 * OrganizePage에 묶여 있어서 화면을 벗어나면(언마운트되면) 진행 중이던
 * 그룹만 끝내고 다음 그룹은 영영 시작되지 않는 버그가 있었다.
 * `startOrganizeJob`은 메인 프로세스 모듈 상태(`organizeJobStatus`)로
 * 진행 상황을 들고 있어 렌더러 언마운트와 무관하게 계속 진행되고, 모든
 * 창에 브로드캐스트되므로 다른 화면으로 이동했다가 돌아와도 진행 상황을
 * 이어서 볼 수 있다.
 */
export function useOrganizeSaveJobs({
  sourceRoot,
  outputRoot,
  setLastLoadedIndex,
  previewResult,
  orderedPreviewGroups,
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
  const status = useOrganizeJobStore((state) => state.status)

  const [bulkSaveActive, setBulkSaveActive] = useState(false)
  const [bulkRunStartIndex, setBulkRunStartIndex] = useState<number | null>(null)
  const [hidePreviewPanelWhileSaving, setHidePreviewPanelWhileSaving] =
    useState(false)
  const [groupKeysInRun, setGroupKeysInRun] = useState<string[]>([])

  const bulkSaveActiveRef = useRef(false)
  const clearPreviewOnSuccessRef = useRef(false)
  const stepOffsetByGroupKeyRef = useRef<Record<string, number>>({})
  const stepPhotoCountByGroupKeyRef = useRef<Record<string, number>>({})
  const handledJobKeyRef = useRef<string | null>(null)

  const isOurSaveJob = status.mode === 'save-bulk'
  const savePipelineBusy = isOurSaveJob && status.phase === 'save-running'
  const photosSavedCount = isOurSaveJob ? status.progress.completed : 0
  const photoFlowTotal = isOurSaveJob ? status.progress.total : 0
  const runningSaveTarget = savePipelineBusy
    ? (status.progress.currentGroupKey ?? null)
    : null
  const groupSavePhaseByKey =
    isOurSaveJob && groupKeysInRun.length > 0
      ? computeGroupSavePhasesFromJobStatus(groupKeysInRun, status)
      : {}
  const activeSaveJobMeta =
    runningSaveTarget &&
    stepPhotoCountByGroupKeyRef.current[runningSaveTarget] !== undefined
      ? {
          progressOffsetBeforeJob:
            stepOffsetByGroupKeyRef.current[runningSaveTarget] ?? 0,
          groupPhotoCount: stepPhotoCountByGroupKeyRef.current[runningSaveTarget] ?? 0
        }
      : null

  useEffect(() => {
    if (!isOurSaveJob) {
      return
    }
    if (
      status.phase !== 'completed' &&
      status.phase !== 'failed' &&
      status.phase !== 'cancelled'
    ) {
      return
    }

    const jobKey = `${status.jobId ?? ''}:${status.phase}`
    if (handledJobKeyRef.current === jobKey) {
      return
    }
    handledJobKeyRef.current = jobKey

    void (async () => {
      if (outputRoot) {
        try {
          const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })
          setLastLoadedIndex(loadedIndex)
        } catch {
          // 목록 새로고침은 최선 노력으로만 처리 — 실패해도 잡 상태/요약은 이미 반영됨.
        }
      }

      if (status.summary) {
        setSummary(status.summary)
      }

      if (status.phase === 'failed') {
        setErrorMessage(status.message ?? '사진 정리에 실패했습니다.')
        bulkSaveActiveRef.current = false
        setBulkSaveActive(false)
        setBulkRunStartIndex(null)
        setHidePreviewPanelWhileSaving(false)
        // groupKeysInRun/단계는 남겨 두어 실패한 그룹의 "저장 실패" 배지가
        // 다음 재시도 전까지 계속 보이게 한다.
        return
      }

      if (status.phase === 'cancelled') {
        setErrorMessage(
          '남은 저장 작업을 취소했습니다. 완료된 그룹까지 결과가 반영되었습니다.'
        )
      } else {
        setErrorMessage(null)
      }

      bulkSaveActiveRef.current = false
      setBulkSaveActive(false)
      setBulkRunStartIndex(null)
      setGroupKeysInRun([])
      stepOffsetByGroupKeyRef.current = {}
      stepPhotoCountByGroupKeyRef.current = {}

      if (status.phase === 'cancelled' || clearPreviewOnSuccessRef.current) {
        setHidePreviewPanelWhileSaving(false)
        setPreviewResult(null)
        setGroupTitleInputs({})
        setGroupCompanionsInputs({})
        setGroupNotesInputs({})
        setPreviewImageLoadFailedByPhotoId({})
        setWizardStepIndex(0)
      }
    })()
  }, [
    isOurSaveJob,
    status.phase,
    status.jobId,
    status.message,
    status.summary,
    outputRoot,
    setLastLoadedIndex,
    setErrorMessage,
    setSummary,
    setPreviewResult,
    setGroupTitleInputs,
    setGroupCompanionsInputs,
    setGroupNotesInputs,
    setPreviewImageLoadFailedByPhotoId,
    setWizardStepIndex
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

    const startIndex = Math.min(
      wizardStepIndex,
      Math.max(0, orderedPreviewGroups.length - 1)
    )
    const remainingGroups = orderedPreviewGroups.slice(startIndex)

    if (remainingGroups.length === 0) {
      setErrorMessage('이후에 저장할 그룹이 없습니다.')
      return
    }

    const steps: OrganizeJobSaveStepRequest[] = []
    const nextGroupKeys: string[] = []
    let progressOffsetBeforeJob = 0

    for (let index = startIndex; index < orderedPreviewGroups.length; index += 1) {
      const group = orderedPreviewGroups[index]

      if (!group) {
        continue
      }

      const includedGroupKeySet = new Set(
        orderedPreviewGroups.slice(0, index + 1).map((g) => g.groupKey)
      )
      const snapshotPayload = buildOrganizeScanPayload(
        previewResult,
        includedGroupKeySet,
        effectiveInputs
      )

      steps.push({
        copyGroupKeysInThisRun: [group.groupKey],
        copySourcePathsInThisRun: sourcePathsForPreviewGroup(group),
        progressOffsetBeforeJob,
        groupPhotoCount: group.photoCount,
        snapshotPayload
      })
      stepOffsetByGroupKeyRef.current[group.groupKey] = progressOffsetBeforeJob
      stepPhotoCountByGroupKeyRef.current[group.groupKey] = group.photoCount
      nextGroupKeys.push(group.groupKey)
      progressOffsetBeforeJob += group.photoCount
    }

    const totalPhotoCount = progressOffsetBeforeJob

    setErrorMessage(null)
    bulkSaveActiveRef.current = true
    clearPreviewOnSuccessRef.current = true
    setBulkSaveActive(true)
    setBulkRunStartIndex(startIndex)
    setGroupKeysInRun(nextGroupKeys)
    setHidePreviewPanelWhileSaving(true)

    void window.photoApp
      .startOrganizeJob({
        mode: 'save-bulk',
        sourceRoot,
        outputRoot,
        totalPhotoCount,
        steps
      })
      .catch((error) => {
        bulkSaveActiveRef.current = false
        setBulkSaveActive(false)
        setBulkRunStartIndex(null)
        setGroupKeysInRun([])
        setHidePreviewPanelWhileSaving(false)
        setErrorMessage(
          error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
        )
      })
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

  const enqueueSaveCurrentGroup = useCallback((): void => {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 폴더와 설정의 출력 폴더를 먼저 준비하세요.')
      return
    }

    if (!previewResult) {
      setErrorMessage('먼저 정리 후보를 불러오세요.')
      return
    }

    if (savePipelineBusy) {
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
    bulkSaveActiveRef.current = false
    clearPreviewOnSuccessRef.current = isLastStep
    setBulkSaveActive(false)
    setBulkRunStartIndex(null)
    setGroupKeysInRun([currentGroup.groupKey])
    stepOffsetByGroupKeyRef.current = {
      [currentGroup.groupKey]: progressOffsetBeforeJob
    }
    stepPhotoCountByGroupKeyRef.current = {
      [currentGroup.groupKey]: currentGroup.photoCount
    }

    if (isLastStep) {
      setHidePreviewPanelWhileSaving(true)
    } else {
      setWizardStepIndex((step) => step + 1)
    }

    void window.photoApp
      .startOrganizeJob({
        mode: 'save-bulk',
        sourceRoot,
        outputRoot,
        totalPhotoCount: progressOffsetBeforeJob + currentGroup.photoCount,
        steps: [
          {
            copyGroupKeysInThisRun: [currentGroup.groupKey],
            copySourcePathsInThisRun: sourcePathsForPreviewGroup(currentGroup),
            progressOffsetBeforeJob,
            groupPhotoCount: currentGroup.photoCount,
            snapshotPayload
          }
        ]
      })
      .catch((error) => {
        setGroupKeysInRun([])
        setHidePreviewPanelWhileSaving(false)
        setErrorMessage(
          error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
        )
      })
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
    savePipelineBusy,
    setWizardStepIndex,
    setErrorMessage
  ])

  const cancelRemainingSaveJobs = useCallback((): void => {
    if (!savePipelineBusy) {
      return
    }

    void window.photoApp.cancelOrganizeJob()
  }, [savePipelineBusy])

  const resetSavePipelineToIdle = useCallback(() => {
    bulkSaveActiveRef.current = false
    clearPreviewOnSuccessRef.current = false
    setBulkSaveActive(false)
    setBulkRunStartIndex(null)
    setGroupKeysInRun([])
    setHidePreviewPanelWhileSaving(false)
    stepOffsetByGroupKeyRef.current = {}
    stepPhotoCountByGroupKeyRef.current = {}
  }, [])

  return {
    runningSaveTarget,
    bulkSaveActive,
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
