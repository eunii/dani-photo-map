import { useMemo, useState } from 'react'

import type {
  PendingOrganizationAssignmentCandidate,
  PendingOrganizationPreviewPhoto,
  PreviewPendingOrganizationResult,
  ScanPhotoLibrarySummary
} from '@shared/types/preload'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'
import { normalizePathSeparators } from '@shared/utils/path'

const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

const OUTPUT_DIALOG_OPTIONS = {
  title: '출력 폴더 선택',
  buttonLabel: '출력 폴더 선택'
} as const

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
    case 'manual-existing-group':
      return '기존 GPS 그룹을 선택하면 해당 그룹 소속으로 넣고 앱 내부 위치를 그 그룹 기준으로 사용합니다.'
    case 'new-group':
    default:
      return null
  }
}

interface OrganizePageProps {
  onNavigateToBrowse?: () => void
}

interface PendingCustomSplitInput {
  id: string
  title: string
  photoIds: string[]
}

function getAssignedPhotoIdSet(
  splits: PendingCustomSplitInput[] | undefined
): Set<string> {
  return new Set((splits ?? []).flatMap((split) => split.photoIds))
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

function GpsLessSplitPhotoGrid({
  photos,
  groupKey,
  assignedPhotoIdSet,
  selectedPhotoIds,
  previewImageLoadFailedByPhotoId,
  onTogglePhoto,
  onImageError
}: {
  photos: PendingOrganizationPreviewPhoto[]
  groupKey: string
  assignedPhotoIdSet: Set<string>
  selectedPhotoIds: string[]
  previewImageLoadFailedByPhotoId: Record<string, boolean>
  onTogglePhoto: (groupKey: string, photoId: string) => void
  onImageError: (photoId: string) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5 sm:gap-2">
      {photos.map((photo) => {
        const assigned = assignedPhotoIdSet.has(photo.id)
        const selected = selectedPhotoIds.includes(photo.id)

        return (
          <button
            key={photo.id}
            type="button"
            disabled={assigned}
            aria-pressed={selected}
            aria-label={`${photo.sourceFileName}, ${selected ? '선택됨' : '선택 안 됨'}${assigned ? ', 이미 분리됨' : ''}`}
            onClick={() => {
              if (!assigned) {
                onTogglePhoto(groupKey, photo.id)
              }
            }}
            className={`min-w-0 rounded-md border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 ${
              assigned
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-55'
                : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300'
            } ${selected && !assigned ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`}
          >
            <div className="overflow-hidden rounded-t-[5px] bg-slate-50">
              <PendingPreviewImageBlock
                photo={photo}
                imageFailed={Boolean(previewImageLoadFailedByPhotoId[photo.id])}
                onImageError={() => onImageError(photo.id)}
                imageHeightClass="h-14"
                placeholderClassName="flex h-14 items-center justify-center bg-slate-200 px-1 text-center text-[10px] leading-tight text-slate-500"
              />
            </div>
            <p
              className="truncate px-1 py-1 text-[10px] font-medium text-slate-800"
              title={photo.sourceFileName}
            >
              {photo.sourceFileName}
            </p>
          </button>
        )
      })}
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
  const [isScanning, setIsScanning] = useState(false)
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
  const [groupAssignmentInputs, setGroupAssignmentInputs] = useState<
    Record<string, string>
  >({})
  const [groupSelectedPhotoIds, setGroupSelectedPhotoIds] = useState<
    Record<string, string[]>
  >({})
  const [groupSplitTitleInputs, setGroupSplitTitleInputs] = useState<
    Record<string, string>
  >({})
  const [groupCustomSplits, setGroupCustomSplits] = useState<
    Record<string, PendingCustomSplitInput[]>
  >({})
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

  const wizardIncludedGroupKeySet = useMemo(
    () =>
      new Set(
        orderedPreviewGroups
          .slice(0, wizardStepIndex + 1)
          .map((g) => g.groupKey)
      ),
    [orderedPreviewGroups, wizardStepIndex]
  )

  const hasPendingPreviewGroups = (previewResult?.groups.length ?? 0) > 0
  const previewMetadataOverrideEntries = useMemo(
    () =>
      (previewResult?.groups ?? [])
        .filter((group) => wizardIncludedGroupKeySet.has(group.groupKey))
        .map((group) => ({
          groupKey: group.groupKey,
          title: groupTitleInputs[group.groupKey]?.trim() ?? '',
          companions: (groupCompanionsInputs[group.groupKey] ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
          notes: groupNotesInputs[group.groupKey]?.trim() || undefined
        }))
        .filter((entry) => {
          const group = (previewResult?.groups ?? []).find(
            (candidate) => candidate.groupKey === entry.groupKey
          )

          return (
            entry.title.length > 0 && group?.assignmentMode !== 'manual-existing-group'
          )
        }),
    [
      groupCompanionsInputs,
      groupNotesInputs,
      groupTitleInputs,
      previewResult?.groups,
      wizardIncludedGroupKeySet
    ]
  )
  const pendingGroupAssignmentEntries = useMemo(
    () =>
      (previewResult?.groups ?? [])
        .filter((group) => wizardIncludedGroupKeySet.has(group.groupKey))
        .filter((group) => group.assignmentMode === 'manual-existing-group')
        .map((group) => ({
          groupKey: group.groupKey,
          targetGroupId: groupAssignmentInputs[group.groupKey] ?? ''
        }))
        .filter((entry) => entry.targetGroupId.length > 0),
    [groupAssignmentInputs, previewResult?.groups, wizardIncludedGroupKeySet]
  )
  const pendingCustomGroupSplitEntries = useMemo(
    () =>
      Object.entries(groupCustomSplits)
        .filter(([groupKey]) => wizardIncludedGroupKeySet.has(groupKey))
        .flatMap(([groupKey, splits]) =>
          splits.map((split) => ({
            groupKey,
            splitId: split.id,
            title: split.title,
            photoIds: split.photoIds
          }))
        ),
    [groupCustomSplits, wizardIncludedGroupKeySet]
  )
  const defaultTitleManualPhotoEntries = useMemo(() => {
    if (!previewResult) {
      return [] as Array<{ photoId: string; title: string }>
    }

    const entries: Array<{ photoId: string; title: string }> = []

    for (const group of previewResult.groups) {
      if (!wizardIncludedGroupKeySet.has(group.groupKey)) {
        continue
      }

      if ((groupAssignmentInputs[group.groupKey] ?? '').trim().length > 0) {
        continue
      }

      const title = (groupTitleInputs[group.groupKey] ?? '').trim()

      if (!title) {
        continue
      }

      const assigned = new Set(
        (groupCustomSplits[group.groupKey] ?? []).flatMap((split) => split.photoIds)
      )

      for (const photo of group.representativePhotos) {
        if (!assigned.has(photo.id)) {
          entries.push({ photoId: photo.id, title })
        }
      }
    }

    return entries
  }, [
    groupAssignmentInputs,
    groupCustomSplits,
    groupTitleInputs,
    previewResult,
    wizardIncludedGroupKeySet
  ])

  const wizardGroup =
    orderedPreviewGroups.length > 0
      ? orderedPreviewGroups[
          Math.min(wizardStepIndex, orderedPreviewGroups.length - 1)
        ]
      : undefined

  const mergeAssignmentCandidatesFromLoadedIndex =
    useMemo((): PendingOrganizationAssignmentCandidate[] | null => {
      const groups = lastLoadedIndex?.index?.groups
      if (!groups?.length) {
        return null
      }

      const normalizedOutput = normalizePathSeparators(outputRoot ?? '')
      const indexOutput = normalizePathSeparators(
        lastLoadedIndex?.index?.outputRoot ?? ''
      )

      if (!normalizedOutput || normalizedOutput !== indexOutput) {
        return null
      }

      const mapped: PendingOrganizationAssignmentCandidate[] = groups.map(
        (g) => ({
          id: g.id,
          title: g.title,
          displayTitle: g.displayTitle,
          photoCount: g.photoCount,
          ...(g.representativeGps
            ? { representativeGps: g.representativeGps }
            : {})
        })
      )

      const withGps = mapped.filter((c) => Boolean(c.representativeGps))
      const withoutGps = mapped.filter((c) => !c.representativeGps)

      withGps.sort((a, b) => a.title.localeCompare(b.title))
      withoutGps.sort((a, b) => a.title.localeCompare(b.title))

      return [...withGps, ...withoutGps]
    }, [lastLoadedIndex, outputRoot])

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
      setGroupAssignmentInputs({})
      setGroupSelectedPhotoIds({})
      setGroupSplitTitleInputs({})
      setGroupCustomSplits({})
      setPreviewImageLoadFailedByPhotoId({})
      setSummary(null)
      setErrorMessage(null)
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
      setGroupAssignmentInputs({})
      setGroupSelectedPhotoIds({})
      setGroupSplitTitleInputs({})
      setGroupCustomSplits({})
      setPreviewImageLoadFailedByPhotoId({})
      setSummary(null)
      setErrorMessage(null)
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
      setGroupAssignmentInputs(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, '']))
      )
      setGroupSelectedPhotoIds(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, []]))
      )
      setGroupSplitTitleInputs(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, '']))
      )
      setGroupCustomSplits(
        Object.fromEntries(nextPreview.groups.map((group) => [group.groupKey, []]))
      )

      const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })
      setLastLoadedIndex(loadedIndex)
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

  async function handleSaveStep(): Promise<void> {
    if (!sourceRoot || !outputRoot) {
      setErrorMessage('원본 사진 폴더와 출력 폴더를 먼저 선택하세요.')
      return
    }

    const currentGroup = orderedPreviewGroups[wizardStepIndex]

    if (!currentGroup) {
      setErrorMessage('저장할 그룹을 찾을 수 없습니다.')
      return
    }

    if (currentGroup.assignmentMode !== 'manual-existing-group') {
      if (!(groupTitleInputs[currentGroup.groupKey]?.trim())) {
        setErrorMessage('기본 그룹명을 입력하세요.')
        return
      }
    }

    setIsScanning(true)
    setErrorMessage(null)

    try {
      const nextSummary = await window.photoApp.scanPhotoLibrary({
        sourceRoot,
        outputRoot,
        groupMetadataOverrides: previewMetadataOverrideEntries,
        pendingGroupAssignments: pendingGroupAssignmentEntries,
        pendingCustomGroupSplits: pendingCustomGroupSplitEntries,
        defaultTitleManualPhotoIds: defaultTitleManualPhotoEntries,
        copyGroupKeysInThisRun: [currentGroup.groupKey]
      })
      const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })

      const isLastStep = wizardStepIndex >= orderedPreviewGroups.length - 1

      if (isLastStep) {
        setSummary(nextSummary)
        setLastLoadedIndex(loadedIndex)
        setPreviewResult(null)
        setGroupTitleInputs({})
        setGroupCompanionsInputs({})
        setGroupNotesInputs({})
        setGroupAssignmentInputs({})
        setGroupSelectedPhotoIds({})
        setGroupSplitTitleInputs({})
        setGroupCustomSplits({})
        setPreviewImageLoadFailedByPhotoId({})
        setWizardStepIndex(0)
      } else {
        setLastLoadedIndex(loadedIndex)
        setWizardStepIndex((step) => step + 1)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 정리에 실패했습니다.'
      )
    } finally {
      setIsScanning(false)
    }
  }

  function toggleGroupPhotoSelection(groupKey: string, photoId: string): void {
    setGroupSelectedPhotoIds((current) => {
      const selectedPhotoIds = current[groupKey] ?? []

      return {
        ...current,
        [groupKey]: selectedPhotoIds.includes(photoId)
          ? selectedPhotoIds.filter((currentPhotoId) => currentPhotoId !== photoId)
          : [...selectedPhotoIds, photoId]
      }
    })
  }

  function selectAllSplitPhotosForGroup(groupKey: string): void {
    const group = previewResult?.groups.find(
      (candidate) => candidate.groupKey === groupKey
    )

    if (!group) {
      return
    }

    const assigned = new Set(
      (groupCustomSplits[groupKey] ?? []).flatMap((split) => split.photoIds)
    )
    const selectableIds = group.representativePhotos
      .filter((photo) => !assigned.has(photo.id))
      .map((photo) => photo.id)

    setGroupSelectedPhotoIds((current) => ({
      ...current,
      [groupKey]: selectableIds
    }))
  }

  function clearSplitPhotoSelectionForGroup(groupKey: string): void {
    setGroupSelectedPhotoIds((current) => ({
      ...current,
      [groupKey]: []
    }))
  }

  function addCustomSplit(groupKey: string): void {
    const title = groupSplitTitleInputs[groupKey]?.trim() ?? ''
    const photoIds = groupSelectedPhotoIds[groupKey] ?? []

    if (title.length === 0 || photoIds.length === 0) {
      return
    }

    const newSplitId = `${groupKey}::split-${crypto.randomUUID()}`

    setGroupCustomSplits((current) => ({
      ...current,
      [groupKey]: [
        ...(current[groupKey] ?? []),
        {
          id: newSplitId,
          title,
          photoIds
        }
      ]
    }))
    setGroupSelectedPhotoIds((current) => ({
      ...current,
      [groupKey]: []
    }))
    setGroupSplitTitleInputs((current) => ({
      ...current,
      [groupKey]: ''
    }))
  }

  function removeCustomSplit(groupKey: string, splitId: string): void {
    setGroupCustomSplits((current) => ({
      ...current,
      [groupKey]: (current[groupKey] ?? []).filter((split) => split.id !== splitId)
    }))
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
            disabled={isLoadingPreview || isScanning}
            onClick={() => void handlePreview()}
          >
            {isLoadingPreview ? '후보 불러오는 중...' : '정리 시작하기'}
          </button>
        ) : (
          <>
            {hasPendingPreviewGroups ? (
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isScanning}
                onClick={() => void handleSaveStep()}
              >
                {isScanning
                  ? '정리 중...'
                  : orderedPreviewGroups.length > 0 &&
                      wizardStepIndex >= orderedPreviewGroups.length - 1
                    ? '마지막 그룹 저장'
                    : '이 그룹 저장 및 복사'}
              </button>
            ) : null}
            {hasPendingPreviewGroups && orderedPreviewGroups.length > 1 ? (
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={isScanning || wizardStepIndex === 0}
                onClick={() => setWizardStepIndex((step) => Math.max(0, step - 1))}
              >
                이전 그룹
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={isLoadingPreview || isScanning}
              onClick={() => void handlePreview()}
            >
              후보 다시 불러오기
            </button>
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
          그룹마다 메타 정보를 입력한 뒤 &quot;이 그룹 저장 및 복사&quot;로 해당
          사진만 출력 폴더에 반영합니다. GPS 없는 그룹은 순서상 마지막에
          나옵니다.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {previewResult ? (
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

            {hasPendingPreviewGroups && wizardGroup ? (
              <div className="space-y-4">
                {(() => {
                  const group = wizardGroup
                  const customSplits = groupCustomSplits[group.groupKey] ?? []
                  const assignedPhotoIdSet = getAssignedPhotoIdSet(customSplits)
                  const hasExistingGroupAssignment =
                    (groupAssignmentInputs[group.groupKey] ?? '').length > 0
                  const mergeTargetCandidates =
                    mergeAssignmentCandidatesFromLoadedIndex &&
                    mergeAssignmentCandidatesFromLoadedIndex.length > 0
                      ? mergeAssignmentCandidatesFromLoadedIndex
                      : group.existingGroupCandidates

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
                            {group.assignmentMode === 'manual-existing-group' ? (
                              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                기존 그룹 선택 필요
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

                      {group.assignmentMode === 'manual-existing-group' &&
                      !hasExistingGroupAssignment ? (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-600">
                            분리할 사진을 선택하세요.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              onClick={() => selectAllSplitPhotosForGroup(group.groupKey)}
                            >
                              전체 선택
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              onClick={() =>
                                clearSplitPhotoSelectionForGroup(group.groupKey)
                              }
                            >
                              전체 해제
                            </button>
                          </div>
                          <GpsLessSplitPhotoGrid
                            photos={group.representativePhotos}
                            groupKey={group.groupKey}
                            assignedPhotoIdSet={assignedPhotoIdSet}
                            selectedPhotoIds={
                              groupSelectedPhotoIds[group.groupKey] ?? []
                            }
                            previewImageLoadFailedByPhotoId={
                              previewImageLoadFailedByPhotoId
                            }
                            onTogglePhoto={toggleGroupPhotoSelection}
                            onImageError={(photoId) =>
                              setPreviewImageLoadFailedByPhotoId((current) => ({
                                ...current,
                                [photoId]: true
                              }))
                            }
                          />
                        </div>
                      ) : (
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
                      )}

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

                        {group.assignmentMode === 'manual-existing-group' ? (
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-slate-800">
                              합류시킬 기존 그룹
                            </span>
                            <select
                              value={groupAssignmentInputs[group.groupKey] ?? ''}
                              onChange={(event) =>
                                setGroupAssignmentInputs((current) => ({
                                  ...current,
                                  [group.groupKey]: event.target.value
                                }))
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                              disabled={customSplits.length > 0}
                            >
                              <option value="">새 GPS 없는 그룹으로 유지</option>
                              {mergeTargetCandidates.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.title} · 사진 {candidate.photoCount}장
                                  {candidate.representativeGps ? '' : ' · 출력 GPS 없음'}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}

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
                            disabled={
                              group.assignmentMode === 'manual-existing-group' &&
                              hasExistingGroupAssignment
                            }
                          />
                        </label>

                        {group.assignmentMode === 'manual-existing-group' &&
                        !hasExistingGroupAssignment ? (
                          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-900">
                                선택 사진을 다른 그룹명으로 분리
                              </p>
                              <p className="text-xs text-slate-500">
                                위에서 분리할 사진을 선택한 뒤 새 그룹명을 입력하고
                                분리합니다. 남은 사진은 위 기본 그룹명으로
                                유지됩니다.
                              </p>
                            </div>

                            <label className="space-y-2">
                              <span className="text-sm font-medium text-slate-800">
                                새 그룹명
                              </span>
                              <input
                                value={groupSplitTitleInputs[group.groupKey] ?? ''}
                                onChange={(event) =>
                                  setGroupSplitTitleInputs((current) => ({
                                    ...current,
                                    [group.groupKey]: event.target.value
                                  }))
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                                placeholder="예: 카페 / 실내 / 받은 사진"
                              />
                            </label>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                                disabled={
                                  (groupSelectedPhotoIds[group.groupKey] ?? []).length === 0 ||
                                  (groupSplitTitleInputs[group.groupKey]?.trim().length ?? 0) === 0
                                }
                                onClick={() => addCustomSplit(group.groupKey)}
                              >
                                선택 사진 분리
                              </button>
                            </div>

                            {customSplits.length > 0 ? (
                              <div className="space-y-2">
                                {customSplits.map((split) => (
                                  <div
                                    key={split.id}
                                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                                  >
                                    <div className="flex-1 text-sm text-slate-700">
                                      <span className="font-medium text-slate-900">
                                        {split.title}
                                      </span>
                                      {` · ${split.photoIds.length}장`}
                                    </div>
                                    <button
                                      type="button"
                                      className="text-xs font-medium text-rose-600"
                                      onClick={() =>
                                        removeCustomSplit(group.groupKey, split.id)
                                      }
                                    >
                                      제거
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

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
                            disabled={
                              group.assignmentMode === 'manual-existing-group' &&
                              hasExistingGroupAssignment
                            }
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
                            disabled={
                              group.assignmentMode === 'manual-existing-group' &&
                              hasExistingGroupAssignment
                            }
                          />
                        </label>
                      </div>
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
