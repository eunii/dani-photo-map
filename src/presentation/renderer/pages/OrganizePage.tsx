import { useEffect, useMemo, useRef, useState } from 'react'

import {
  defaultMissingGpsGroupingBasis,
  type MissingGpsGroupingBasis
} from '@domain/policies/MissingGpsGroupingBasis'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'
import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'

import { OrganizeOutputMissingCard } from '@presentation/renderer/components/organize/OrganizeOutputMissingCard'
import { OrganizePreviewActionBar } from '@presentation/renderer/components/organize/OrganizePreviewActionBar'
import { OrganizeSaveProgressOverlays } from '@presentation/renderer/components/organize/OrganizeSaveProgressOverlays'
import { OrganizeSourceAndGroupingSection } from '@presentation/renderer/components/organize/OrganizeSourceAndGroupingSection'
import { OrganizeScanResultDetailPanels } from '@presentation/renderer/components/organize/OrganizeScanResultDetailPanels'
import { OrganizeWizardGroupCard } from '@presentation/renderer/components/organize/OrganizeWizardGroupCard'
import {
  ISSUE_QUICK_FILTERS,
  SCAN_ISSUE_STAGES,
  SOURCE_DIALOG_OPTIONS
} from '@presentation/renderer/pages/organize/organizePageConstants'
import { groupInBatchDuplicateDetails } from '@presentation/renderer/pages/organize/organizeScanSummaryMerge'
import {
  type DuplicateSortOption,
  type ExistingSkipSortOption,
  type GroupSavePhase,
  type IncrementalSkipSortOption,
  type IssueSeverityFilter,
  type IssueSortOption,
  buildEffectiveOrganizeInputs,
  effectiveGroupTitle,
  formatGroupSavePhaseLabel
} from '@presentation/renderer/pages/organize/organizeGroupForm'
import { useOrganizePreview } from '@presentation/renderer/pages/organize/useOrganizePreview'
import { useOrganizeSaveJobs } from '@presentation/renderer/pages/organize/useOrganizeSaveJobs'

interface OrganizePageProps {
  onNavigateToSettings?: () => void
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultActionMessage, setResultActionMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<ScanPhotoLibrarySummary | null>(null)
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
  const [previewImageLoadFailedByPhotoId, setPreviewImageLoadFailedByPhotoId] =
    useState<Record<string, boolean>>({})
  const [wizardStepIndex, setWizardStepIndex] = useState(0)

  const resetSavePipelineAfterPreviewRef = useRef<() => void>(() => {})

  const {
    previewResult,
    setPreviewResult,
    isLoadingPreview,
    handlePreview
  } = useOrganizePreview({
    sourceRoot,
    outputRoot,
    missingGpsGroupingBasis,
    setLastLoadedIndex,
    setWizardStepIndex,
    setGroupTitleInputs,
    setGroupCompanionsInputs,
    setGroupNotesInputs,
    setPreviewImageLoadFailedByPhotoId,
    resetSavePipelineAfterPreview: () =>
      resetSavePipelineAfterPreviewRef.current(),
    setErrorMessage,
    setOpenScanResultDetail
  })

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

  const {
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
  } = useOrganizeSaveJobs({
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
  })

  resetSavePipelineAfterPreviewRef.current = resetSavePipelineToIdle

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

  const wizardGroup =
    orderedPreviewGroups.length > 0
      ? orderedPreviewGroups[
          Math.min(wizardStepIndex, orderedPreviewGroups.length - 1)
        ]
      : undefined

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
      resetSavePipelineToIdle()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 space-y-1.5">
      <OrganizeSourceAndGroupingSection
        sourceRoot={sourceRoot}
        previewResult={previewResult}
        isLoadingPreview={isLoadingPreview}
        savePipelineBusy={savePipelineBusy}
        missingGpsGroupingBasis={missingGpsGroupingBasis}
        onSelectSource={() => void selectSourceRoot()}
        onStartPreview={() => void handlePreview()}
        onChangeGroupingBasis={(value) => {
          setMissingGpsGroupingBasis(value)
          if (previewResult && sourceRoot && outputRoot) {
            void handlePreview(value)
          }
        }}
      />

      {!outputRoot ? (
        <OrganizeOutputMissingCard onNavigateToSettings={onNavigateToSettings} />
      ) : null}

      <OrganizePreviewActionBar
        previewResult={previewResult}
        hasPendingPreviewGroups={hasPendingPreviewGroups}
        orderedPreviewGroupCount={orderedPreviewGroups.length}
        wizardStepIndex={wizardStepIndex}
        isLoadingPreview={isLoadingPreview}
        savePipelineBusy={savePipelineBusy}
        onWizardPrev={() =>
          setWizardStepIndex((step) => Math.max(0, step - 1))
        }
        onReloadPreview={() => void handlePreview()}
        onSaveAllGroups={() => enqueueSaveAllGroups()}
      />

      {errorMessage ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {resultActionMessage ? (
        <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--app-accent)_30%,var(--app-border)_70%)] bg-[color:color-mix(in_srgb,var(--app-accent)_10%,var(--app-surface)_90%)] px-4 py-3 text-sm text-[var(--app-accent-strong)]">
          {resultActionMessage}
        </div>
      ) : null}

      <OrganizeSaveProgressOverlays
        bulkSaveActive={bulkSaveActive}
        savePipelineBusy={savePipelineBusy}
        hidePreviewPanelWhileSaving={hidePreviewPanelWhileSaving}
        previewResult={previewResult}
        hasPendingPreviewGroups={hasPendingPreviewGroups}
        bulkRunStartIndex={bulkRunStartIndex}
        orderedPreviewGroups={orderedPreviewGroups}
        photoFlowTotal={photoFlowTotal}
        totalPhotosInPreview={totalPhotosInPreview}
        photosSavedCount={photosSavedCount}
        prepareProgress={prepareProgress}
        groupSavePhaseByKey={groupSavePhaseByKey}
        runningSaveTarget={runningSaveTarget}
        activeSaveJobMeta={activeSaveJobMeta}
        groupTitleInputs={groupTitleInputs}
        onCancelRemaining={() => cancelRemainingSaveJobs()}
      />
      </div>

      {previewResult && !hidePreviewPanelWhileSaving ? (
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto">
        <section className="rounded-xl border border-[color:color-mix(in_srgb,var(--app-accent)_32%,var(--app-border)_68%)] bg-[color:color-mix(in_srgb,var(--app-accent)_6%,var(--app-surface)_94%)] p-2.5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs text-[var(--app-foreground)]">
                  신규 정리 대상 {previewResult.pendingPhotoCount}장, 기존 중복
                  스킵 예정 {previewResult.skippedExistingCount}장
                </p>
                {previewResult.skippedUnchangedCount > 0 ? (
                  <p className="text-[11px] text-[var(--app-muted)]">
                    증분 재스캔 기준으로 변경 없는 입력{' '}
                    {previewResult.skippedUnchangedCount}장은 준비 단계에서 건너뛰었습니다.
                  </p>
                ) : null}
                {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
                  <p className="text-[11px] font-medium text-[var(--app-accent-strong)]">
                    그룹 {wizardStepIndex + 1} / {orderedPreviewGroups.length} — GPS
                    있는 그룹을 먼저, GPS 없는 그룹은 마지막에 저장합니다.
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 rounded-full bg-[var(--app-accent)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--app-accent-foreground)]">
                스캔 후보 {previewResult.scannedCount}장
              </div>
            </div>

            {hasPendingPreviewGroups && orderedPreviewGroups.length > 0 ? (
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2">
                <ul className="space-y-1">
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
                              ? 'bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface)_82%)] text-[var(--app-accent-strong)]'
                              : phase === 'done'
                                ? 'bg-[color:color-mix(in_srgb,var(--app-accent)_22%,var(--app-surface)_78%)] text-[var(--app-accent-strong)]'
                                : phase === 'error'
                                  ? 'bg-[color:color-mix(in_srgb,var(--app-danger)_26%,var(--app-surface)_74%)] text-[var(--app-danger-foreground)]'
                                  : phase === 'queued'
                                    ? 'bg-[color:color-mix(in_srgb,var(--app-border)_32%,var(--app-surface)_68%)] text-[var(--app-foreground)]'
                                    : 'bg-[color:color-mix(in_srgb,var(--app-border)_20%,var(--app-surface)_80%)] text-[var(--app-muted)]'
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
                  <p className="mt-1.5 text-[10px] text-[var(--app-muted)]">
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
              <div className="space-y-2">
                <OrganizeWizardGroupCard
                  group={wizardGroup}
                  missingGpsGroupingBasis={missingGpsGroupingBasis}
                  orderedPreviewGroups={orderedPreviewGroups}
                  wizardStepIndex={wizardStepIndex}
                  saveJobQueue={saveJobQueue}
                  runningSaveTarget={runningSaveTarget}
                  groupSavePhaseByKey={groupSavePhaseByKey}
                  groupTitleInputs={groupTitleInputs}
                  setGroupTitleInputs={setGroupTitleInputs}
                  groupCompanionsInputs={groupCompanionsInputs}
                  setGroupCompanionsInputs={setGroupCompanionsInputs}
                  groupNotesInputs={groupNotesInputs}
                  setGroupNotesInputs={setGroupNotesInputs}
                  previewImageLoadFailedByPhotoId={previewImageLoadFailedByPhotoId}
                  setPreviewImageLoadFailedByPhotoId={
                    setPreviewImageLoadFailedByPhotoId
                  }
                  hasPendingPreviewGroups={hasPendingPreviewGroups}
                  onEnqueueSaveCurrentGroup={() => enqueueSaveCurrentGroup()}
                />
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
        </div>
      ) : null}

      {summary ? (
        <OrganizeScanResultDetailPanels
          summary={summary}
          outputRoot={outputRoot}
          openScanResultDetail={openScanResultDetail}
          handleToggleScanResultDetail={handleToggleScanResultDetail}
          duplicatePathQuery={duplicatePathQuery}
          setDuplicatePathQuery={setDuplicatePathQuery}
          duplicateSort={duplicateSort}
          setDuplicateSort={setDuplicateSort}
          incrementalSkipPathQuery={incrementalSkipPathQuery}
          setIncrementalSkipPathQuery={setIncrementalSkipPathQuery}
          incrementalSkipSort={incrementalSkipSort}
          setIncrementalSkipSort={setIncrementalSkipSort}
          existingSkipPathQuery={existingSkipPathQuery}
          setExistingSkipPathQuery={setExistingSkipPathQuery}
          existingSkipHashQuery={existingSkipHashQuery}
          setExistingSkipHashQuery={setExistingSkipHashQuery}
          existingSkipSort={existingSkipSort}
          setExistingSkipSort={setExistingSkipSort}
          issueSeverityFilter={issueSeverityFilter}
          setIssueSeverityFilter={setIssueSeverityFilter}
          issueStageFilter={issueStageFilter}
          setIssueStageFilter={setIssueStageFilter}
          issueCodeQuery={issueCodeQuery}
          setIssueCodeQuery={setIssueCodeQuery}
          issueSourcePathQuery={issueSourcePathQuery}
          setIssueSourcePathQuery={setIssueSourcePathQuery}
          issueSort={issueSort}
          setIssueSort={setIssueSort}
          issueStageOptions={issueStageOptions}
          applyIssueQuickFilter={applyIssueQuickFilter}
          copyResultDetail={copyResultDetail}
          groupedInBatchDuplicates={groupedInBatchDuplicates}
          reviewedInBatchDuplicates={reviewedInBatchDuplicates}
          reviewedIncrementalSkips={reviewedIncrementalSkips}
          reviewedExistingSkips={reviewedExistingSkips}
          reviewedIssues={reviewedIssues}
        />
      ) : null}

    </div>
  )
}
