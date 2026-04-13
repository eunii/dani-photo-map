import { useMemo, useRef, useState } from 'react'

import {
  defaultMissingGpsGroupingBasis,
  type MissingGpsGroupingBasis
} from '@domain/policies/MissingGpsGroupingBasis'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'

import { OrganizeOutputMissingCard } from '@presentation/renderer/components/organize/OrganizeOutputMissingCard'
import { OrganizePreviewActionBar } from '@presentation/renderer/components/organize/OrganizePreviewActionBar'
import { OrganizeSaveProgressOverlays } from '@presentation/renderer/components/organize/OrganizeSaveProgressOverlays'
import { OrganizeSourceAndGroupingSection } from '@presentation/renderer/components/organize/OrganizeSourceAndGroupingSection'
import { OrganizeScanResultDetailPanels } from '@presentation/renderer/components/organize/OrganizeScanResultDetailPanels'
import { SOURCE_DIALOG_OPTIONS } from '@presentation/renderer/pages/organize/organizePageConstants'
import { OrganizePagePreviewSection } from '@presentation/renderer/pages/organize/OrganizePagePreviewSection'
import { useOrganizeGroupInputsState } from '@presentation/renderer/pages/organize/useOrganizeGroupInputsState'
import { useOrganizePreview } from '@presentation/renderer/pages/organize/useOrganizePreview'
import { useOrganizeSaveJobs } from '@presentation/renderer/pages/organize/useOrganizeSaveJobs'
import { useOrganizeScanFiltersState } from '@presentation/renderer/pages/organize/useOrganizeScanFiltersState'
import { useOrganizeScanResultReview } from '@presentation/renderer/pages/organize/useOrganizeScanResultReview'

interface OrganizePageProps {
  onNavigateToSettings?: () => void
}

export function OrganizePage({ onNavigateToSettings }: OrganizePageProps) {
  const sourceRoot = useLibraryWorkspaceStore((state) => state.sourceRoot)
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const setSourceRoot = useLibraryWorkspaceStore((state) => state.setSourceRoot)
  const setLastLoadedIndex = useLibraryWorkspaceStore(
    (state) => state.setLastLoadedIndex
  )

  const groupInputs = useOrganizeGroupInputsState()
  const scanFilters = useOrganizeScanFiltersState()

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultActionMessage, setResultActionMessage] = useState<string | null>(
    null
  )
  const [summary, setSummary] = useState<ScanPhotoLibrarySummary | null>(null)
  const [missingGpsGroupingBasis, setMissingGpsGroupingBasis] =
    useState<MissingGpsGroupingBasis>(defaultMissingGpsGroupingBasis)
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
    setGroupTitleInputs: groupInputs.setGroupTitleInputs,
    setGroupCompanionsInputs: groupInputs.setGroupCompanionsInputs,
    setGroupNotesInputs: groupInputs.setGroupNotesInputs,
    setPreviewImageLoadFailedByPhotoId: groupInputs.setPreviewImageLoadFailedByPhotoId,
    resetSavePipelineAfterPreview: () =>
      resetSavePipelineAfterPreviewRef.current(),
    setErrorMessage,
    setOpenScanResultDetail: scanFilters.setOpenScanResultDetail
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
    groupTitleInputs: groupInputs.groupTitleInputs,
    groupCompanionsInputs: groupInputs.groupCompanionsInputs,
    groupNotesInputs: groupInputs.groupNotesInputs,
    wizardStepIndex,
    setWizardStepIndex,
    setSummary,
    setPreviewResult,
    setGroupTitleInputs: groupInputs.setGroupTitleInputs,
    setGroupCompanionsInputs: groupInputs.setGroupCompanionsInputs,
    setGroupNotesInputs: groupInputs.setGroupNotesInputs,
    setPreviewImageLoadFailedByPhotoId: groupInputs.setPreviewImageLoadFailedByPhotoId,
    setErrorMessage
  })

  resetSavePipelineAfterPreviewRef.current = resetSavePipelineToIdle

  const review = useOrganizeScanResultReview(summary, {
    duplicatePathQuery: scanFilters.duplicatePathQuery,
    duplicateSort: scanFilters.duplicateSort,
    existingSkipPathQuery: scanFilters.existingSkipPathQuery,
    existingSkipHashQuery: scanFilters.existingSkipHashQuery,
    existingSkipSort: scanFilters.existingSkipSort,
    incrementalSkipPathQuery: scanFilters.incrementalSkipPathQuery,
    incrementalSkipSort: scanFilters.incrementalSkipSort,
    issueSeverityFilter: scanFilters.issueSeverityFilter,
    issueStageFilter: scanFilters.issueStageFilter,
    issueCodeQuery: scanFilters.issueCodeQuery,
    issueSourcePathQuery: scanFilters.issueSourcePathQuery,
    issueSort: scanFilters.issueSort
  })

  const hasPendingPreviewGroups = (previewResult?.groups.length ?? 0) > 0

  const wizardGroup =
    orderedPreviewGroups.length > 0
      ? orderedPreviewGroups[
          Math.min(wizardStepIndex, orderedPreviewGroups.length - 1)
        ]
      : undefined

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
      groupInputs.setGroupTitleInputs({})
      groupInputs.setGroupCompanionsInputs({})
      groupInputs.setGroupNotesInputs({})
      groupInputs.setPreviewImageLoadFailedByPhotoId({})
      setSummary(null)
      scanFilters.setOpenScanResultDetail(null)
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
          groupTitleInputs={groupInputs.groupTitleInputs}
          onCancelRemaining={() => cancelRemainingSaveJobs()}
        />
      </div>

      {previewResult ? (
        <OrganizePagePreviewSection
          previewResult={previewResult}
          hidePreviewPanelWhileSaving={hidePreviewPanelWhileSaving}
          hasPendingPreviewGroups={hasPendingPreviewGroups}
          orderedPreviewGroups={orderedPreviewGroups}
          wizardStepIndex={wizardStepIndex}
          wizardGroup={wizardGroup}
          totalPhotosInPreview={totalPhotosInPreview}
          photosSavedCount={photosSavedCount}
          groupSavePhaseByKey={groupSavePhaseByKey}
          runningSaveTarget={runningSaveTarget}
          saveJobQueue={saveJobQueue}
          groupTitleInputs={groupInputs.groupTitleInputs}
          setGroupTitleInputs={groupInputs.setGroupTitleInputs}
          groupCompanionsInputs={groupInputs.groupCompanionsInputs}
          setGroupCompanionsInputs={groupInputs.setGroupCompanionsInputs}
          groupNotesInputs={groupInputs.groupNotesInputs}
          setGroupNotesInputs={groupInputs.setGroupNotesInputs}
          previewImageLoadFailedByPhotoId={
            groupInputs.previewImageLoadFailedByPhotoId
          }
          setPreviewImageLoadFailedByPhotoId={
            groupInputs.setPreviewImageLoadFailedByPhotoId
          }
          missingGpsGroupingBasis={missingGpsGroupingBasis}
          onEnqueueSaveCurrentGroup={() => enqueueSaveCurrentGroup()}
        />
      ) : null}

      {summary ? (
        <OrganizeScanResultDetailPanels
          summary={summary}
          outputRoot={outputRoot}
          openScanResultDetail={scanFilters.openScanResultDetail}
          handleToggleScanResultDetail={scanFilters.handleToggleScanResultDetail}
          duplicatePathQuery={scanFilters.duplicatePathQuery}
          setDuplicatePathQuery={scanFilters.setDuplicatePathQuery}
          duplicateSort={scanFilters.duplicateSort}
          setDuplicateSort={scanFilters.setDuplicateSort}
          incrementalSkipPathQuery={scanFilters.incrementalSkipPathQuery}
          setIncrementalSkipPathQuery={scanFilters.setIncrementalSkipPathQuery}
          incrementalSkipSort={scanFilters.incrementalSkipSort}
          setIncrementalSkipSort={scanFilters.setIncrementalSkipSort}
          existingSkipPathQuery={scanFilters.existingSkipPathQuery}
          setExistingSkipPathQuery={scanFilters.setExistingSkipPathQuery}
          existingSkipHashQuery={scanFilters.existingSkipHashQuery}
          setExistingSkipHashQuery={scanFilters.setExistingSkipHashQuery}
          existingSkipSort={scanFilters.existingSkipSort}
          setExistingSkipSort={scanFilters.setExistingSkipSort}
          issueSeverityFilter={scanFilters.issueSeverityFilter}
          setIssueSeverityFilter={scanFilters.setIssueSeverityFilter}
          issueStageFilter={scanFilters.issueStageFilter}
          setIssueStageFilter={scanFilters.setIssueStageFilter}
          issueCodeQuery={scanFilters.issueCodeQuery}
          setIssueCodeQuery={scanFilters.setIssueCodeQuery}
          issueSourcePathQuery={scanFilters.issueSourcePathQuery}
          setIssueSourcePathQuery={scanFilters.setIssueSourcePathQuery}
          issueSort={scanFilters.issueSort}
          setIssueSort={scanFilters.setIssueSort}
          issueStageOptions={review.issueStageOptions}
          applyIssueQuickFilter={scanFilters.applyIssueQuickFilter}
          copyResultDetail={copyResultDetail}
          groupedInBatchDuplicates={review.groupedInBatchDuplicates}
          reviewedInBatchDuplicates={review.reviewedInBatchDuplicates}
          reviewedIncrementalSkips={review.reviewedIncrementalSkips}
          reviewedExistingSkips={review.reviewedExistingSkips}
          reviewedIssues={review.reviewedIssues}
        />
      ) : null}
    </div>
  )
}
