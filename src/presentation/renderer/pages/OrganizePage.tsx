import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  PendingOrganizationPreviewPhoto,
  PreviewPendingOrganizationResult,
  ScanPhotoLibrarySummary
} from '@shared/types/preload'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'

import {
  buildOrganizeScanPayload,
  type OrganizeCustomSplitInput
} from '@presentation/renderer/pages/organizeScanPayload'

const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

const OUTPUT_DIALOG_OPTIONS = {
  title: '출력 폴더 선택',
  buttonLabel: '출력 폴더 선택'
} as const

const EMPTY_GROUP_ASSIGNMENTS: Record<string, string> = {}
const EMPTY_CUSTOM_SPLITS: Record<string, OrganizeCustomSplitInput[]> = {}

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
      return '자동으로 캡처 폴더로 분리됩니다.'
    case 'new-group':
    default:
      return null
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

interface OrganizePageProps {
  onNavigateToBrowse?: () => void
}

function buildEffectiveOrganizeInputs(
  groups: PreviewPendingOrganizationResult['groups'],
  inputs: {
    groupTitleInputs: Record<string, string>
    groupCompanionsInputs: Record<string, string>
    groupNotesInputs: Record<string, string>
  }
): Parameters<typeof buildOrganizeScanPayload>[2] {
  const groupTitleInputs = { ...inputs.groupTitleInputs }

  for (const group of groups) {
    if (!groupTitleInputs[group.groupKey]?.trim()) {
      groupTitleInputs[group.groupKey] =
        group.suggestedTitles[0] ?? group.displayTitle
    }
  }

  return {
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

export function OrganizePage({ onNavigateToBrowse }: OrganizePageProps) {
  const sourceRoot = useLibraryWorkspaceStore((state) => state.sourceRoot)
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const setSourceRoot = useLibraryWorkspaceStore((state) => state.setSourceRoot)
  const setOutputRoot = useLibraryWorkspaceStore((state) => state.setOutputRoot)
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
    }>
  >([])
  const [runningSaveTarget, setRunningSaveTarget] = useState<
    'all' | string | null
  >(null)
  const runningSaveTargetRef = useRef<'all' | string | null>(null)
  const [bulkSaveActive, setBulkSaveActive] = useState(false)
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

  useEffect(() => {
    runningSaveTargetRef.current = runningSaveTarget
  }, [runningSaveTarget])
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

    const nextJob = saveJobQueue[0]

    setSaveJobQueue((previous) => previous.slice(1))

    const isBulkRun = nextJob.copyGroupKeysInThisRun.length > 1
    setRunningSaveTarget(isBulkRun ? 'all' : nextJob.copyGroupKeysInThisRun[0]!)

    if (isBulkRun) {
      setGroupSavePhaseByKey(
        Object.fromEntries(
          orderedPreviewGroups.map((g) => [g.groupKey, 'saving' as const])
        )
      )
    } else {
      const onlyKey = nextJob.copyGroupKeysInThisRun[0]
      if (onlyKey) {
        setGroupSavePhaseByKey((previous) => ({
          ...previous,
          [onlyKey]: 'saving'
        }))
      }
    }

    setPhotosSavedCount(0)
    setPhotoFlowTotal(totalPhotosInPreview)
    setPrepareProgress(null)

    void (async () => {
      const unsubscribe = window.photoApp.onScanPhotoLibraryProgress(
        (payload) => {
          if (payload.kind === 'prepare') {
            setPrepareProgress({
              completed: payload.completed,
              total: payload.total
            })
          } else {
            setPhotosSavedCount(payload.completed)
            setPhotoFlowTotal(payload.total)
            setPrepareProgress(null)
          }
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

        if (isBulkRun) {
          setGroupSavePhaseByKey(
            Object.fromEntries(
              orderedPreviewGroups.map((g) => [g.groupKey, 'done' as const])
            )
          )
        } else {
          const onlyKey = nextJob.copyGroupKeysInThisRun[0]
          if (onlyKey) {
            setGroupSavePhaseByKey((previous) => ({
              ...previous,
              [onlyKey]: 'done'
            }))
          }
        }

        if (nextJob.isLastStep) {
          setBulkSaveActive(false)
          setGroupSavePhaseByKey({})
          setHidePreviewPanelWhileSaving(false)
          setPhotosSavedCount(0)
          setPhotoFlowTotal(0)
          setPrepareProgress(null)
          setSummary(nextSummary)
          setPreviewResult(null)
          setGroupTitleInputs({})
          setGroupCompanionsInputs({})
          setGroupNotesInputs({})
          setPreviewImageLoadFailedByPhotoId({})
          setWizardStepIndex(0)
        }
      } catch (error) {
        setBulkSaveActive(false)
        setSaveJobQueue([])
        setHidePreviewPanelWhileSaving(false)
        setPhotosSavedCount(0)
        setPhotoFlowTotal(0)
        setPrepareProgress(null)
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
    totalPhotosInPreview
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
      setErrorMessage(null)
      setSaveJobQueue([])
      setRunningSaveTarget(null)
      setBulkSaveActive(false)
      setGroupSavePhaseByKey({})
      setHidePreviewPanelWhileSaving(false)
      setPhotosSavedCount(0)
      setPhotoFlowTotal(0)
      setPrepareProgress(null)
    }
  }

  async function selectOutputRoot(): Promise<void> {
    const selectedPath = await window.photoApp.selectDirectory(
      OUTPUT_DIALOG_OPTIONS
    )

    if (selectedPath) {
      setOutputRoot(selectedPath)
      setWizardStepIndex(0)
      setLastLoadedIndex(null)
      setPreviewResult(null)
      setGroupTitleInputs({})
      setGroupCompanionsInputs({})
      setGroupNotesInputs({})
      setPreviewImageLoadFailedByPhotoId({})
      setSummary(null)
      setErrorMessage(null)
      setSaveJobQueue([])
      setRunningSaveTarget(null)
      setBulkSaveActive(false)
      setGroupSavePhaseByKey({})
      setHidePreviewPanelWhileSaving(false)
      setPhotosSavedCount(0)
      setPhotoFlowTotal(0)
      setPrepareProgress(null)
    }
  }

  async function handlePreview(): Promise<void> {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 사진 폴더와 출력 폴더를 먼저 선택하세요.')
      return
    }

    setIsLoadingPreview(true)
    setErrorMessage(null)

    try {
      const nextPreview = await window.photoApp.previewPendingOrganization({
        sourceRoot,
        outputRoot
      })

      setPreviewResult(nextPreview)
      setWizardStepIndex(0)
      setPreviewImageLoadFailedByPhotoId({})
      setGroupTitleInputs(
        Object.fromEntries(
          nextPreview.groups.map((group) => [
            group.groupKey,
            group.suggestedTitles[0] ?? group.displayTitle
          ])
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
      setBulkSaveActive(false)
      setGroupSavePhaseByKey({})
      setHidePreviewPanelWhileSaving(false)
      setPhotosSavedCount(0)
      setPhotoFlowTotal(0)
      setPrepareProgress(null)
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
      setErrorMessage('원본 사진 폴더와 출력 폴더를 먼저 선택하세요.')
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
      groupTitleInputs,
      groupCompanionsInputs,
      groupNotesInputs
    })

    const includedGroupKeySet = new Set(
      orderedPreviewGroups.map((g) => g.groupKey)
    )
    const snapshotPayload = buildOrganizeScanPayload(
      previewResult,
      includedGroupKeySet,
      effectiveInputs
    )
    const copyGroupKeysInThisRun = orderedPreviewGroups.map((g) => g.groupKey)

    setErrorMessage(null)
    setBulkSaveActive(true)
    const queuedPhases: Record<string, GroupSavePhase> = {}
    for (const key of copyGroupKeysInThisRun) {
      queuedPhases[key] = 'queued'
    }
    setGroupSavePhaseByKey((previous) => ({ ...previous, ...queuedPhases }))
    setHidePreviewPanelWhileSaving(true)
    setPhotosSavedCount(0)
    setPhotoFlowTotal(totalPhotosInPreview)
    setSaveJobQueue((previous) => [
      ...previous,
      {
        copyGroupKeysInThisRun,
        isLastStep: true,
        snapshotPayload
      }
    ])
  }

  function enqueueSaveCurrentGroup(): void {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 사진 폴더와 출력 폴더를 먼저 선택하세요.')
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

    if (!(groupTitleInputs[currentGroup.groupKey]?.trim())) {
      setErrorMessage('기본 그룹명을 입력하세요.')
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
        groupTitleInputs,
        groupCompanionsInputs,
        groupNotesInputs
      })
    )

    const isLastStep = snapshotStepIndex >= orderedPreviewGroups.length - 1

    setErrorMessage(null)

    const alreadyQueuedOrRunning =
      runningSaveTargetRef.current === currentGroup.groupKey ||
      runningSaveTargetRef.current === 'all' ||
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
        snapshotPayload
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
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          사진 정리 실행
        </h1>
        <p className="text-base leading-7 text-slate-600">
          원본·출력 폴더를 선택한 뒤 후보를 불러오면, 그룹이 하나씩 표시됩니다.
          각 단계에서 메타를 입력하고 저장하면 해당 그룹 사진만 복사·인덱스에
          반영됩니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              원본 사진 폴더
            </h2>
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

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">출력 폴더</h2>
            <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              {outputRoot || '아직 선택되지 않았습니다.'}
            </p>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </button>
          </div>
        </section>
      </div>

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
                전체 그룹 저장 (추천 제목)
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
          그룹마다 메타를 입력한 뒤 카드에서 한 그룹씩 저장하거나, 위의 전체
          저장으로 추천 제목·입력값을 한 번에 적용해 모든 그룹을 순서대로
          복사합니다. 진행이 길면 아래 진행 표시를 확인하세요. 완료 후 실행 결과
          요약이 표시됩니다. GPS 없는 그룹은 순서상 마지막에 처리됩니다.
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
          <h2 className="text-sm font-semibold text-indigo-900">
            전체 정리 저장 진행 중
          </h2>
          <p className="mt-1 text-sm text-indigo-800">
            모든 그룹을 한 번에 복사·인덱스 반영합니다.
            {runningSaveTarget === 'all'
              ? ' · 파일마다 저장이 끝날 때마다 진행이 올라갑니다.'
              : ''}
          </p>
          {prepareProgress ? (
            <p className="mt-2 text-xs text-indigo-700">
              원본 읽기·해시{' '}
              {prepareProgress.completed} / {prepareProgress.total}장
            </p>
          ) : null}
          {(() => {
            const denom =
              photoFlowTotal > 0 ? photoFlowTotal : totalPhotosInPreview || 1

            return (
              <>
                <progress
                  className="mt-3 h-2 w-full overflow-hidden rounded-full accent-indigo-600 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-indigo-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-600"
                  max={denom}
                  value={Math.min(photosSavedCount, denom)}
                />
                <p className="mt-2 text-sm text-indigo-800">
                  사진 저장 완료{' '}
                  <span className="font-semibold text-indigo-950">
                    {photosSavedCount}
                  </span>{' '}
                  / {denom}장 (
                  {Math.min(
                    100,
                    Math.round((photosSavedCount / denom) * 100)
                  )}
                  %)
                </p>
              </>
            )
          })()}
          <p className="mt-2 text-xs text-indigo-700">
            저장 진행률은 복사·썸네일까지 끝낸 파일만 반영합니다. 잠시만 기다려
            주세요.
          </p>
        </section>
      ) : null}

      {hidePreviewPanelWhileSaving &&
      previewResult &&
      savePipelineBusy &&
      hasPendingPreviewGroups &&
      !bulkSaveActive ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">저장 진행 중</h2>
          {prepareProgress ? (
            <p className="mt-1 text-xs text-slate-600">
              원본 읽기·해시 {prepareProgress.completed} / {prepareProgress.total}장
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-600">
            사진 저장 완료{' '}
            <span className="font-medium text-slate-900">{photosSavedCount}</span> /{' '}
            {(photoFlowTotal > 0 ? photoFlowTotal : totalPhotosInPreview) || '—'}장
            {(photoFlowTotal > 0 || totalPhotosInPreview > 0
              ? ` (${Math.min(
                  100,
                  Math.round(
                    (photosSavedCount /
                      (photoFlowTotal > 0 ? photoFlowTotal : totalPhotosInPreview)) *
                      100
                  )
                )}%)`
              : '')}
          </p>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-900">그룹별 저장 상태</p>
            <ul className="mt-2 space-y-1.5">
              {orderedPreviewGroups.map((g) => {
                const phase = groupSavePhaseByKey[g.groupKey] ?? 'idle'
                const isCurrentRun =
                  runningSaveTarget === g.groupKey ||
                  runningSaveTarget === 'all'
                return (
                  <li
                    key={g.groupKey}
                    className={`flex flex-wrap items-center justify-between gap-2 text-xs ${
                      phase === 'saving' || isCurrentRun
                        ? 'font-medium text-sky-900'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate" title={g.displayTitle}>
                      {g.displayTitle}
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
                    const isCurrentRun =
                  runningSaveTarget === g.groupKey ||
                  runningSaveTarget === 'all'
                    return (
                      <li
                        key={g.groupKey}
                        className={`flex flex-wrap items-center justify-between gap-2 text-xs ${
                          phase === 'saving' || isCurrentRun
                            ? 'font-medium text-sky-900'
                            : 'text-slate-700'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate" title={g.displayTitle}>
                          {g.displayTitle}
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
                    runningSaveTarget === 'all' ||
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
                            {group.displayTitle}
                          </h3>
                          <p className="text-sm text-slate-600">
                            사진 {group.photoCount}장
                            {group.representativeGps ? ' · GPS 기반 그룹' : ' · GPS 없음'}
                          </p>
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
                            추천 그룹명
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
                            기본 그룹명
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
                <p className="text-xs text-slate-500">중복 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.duplicateCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">기존 중복 스킵 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.skippedExistingCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">그룹 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.groupCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">경고 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.warningCount}
                </p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="text-xs text-slate-500">실패 수</p>
                <p className="text-xl font-semibold text-slate-900">
                  {summary.failureCount}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
