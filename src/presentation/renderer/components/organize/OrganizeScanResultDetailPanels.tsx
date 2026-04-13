import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

import { ISSUE_QUICK_FILTERS } from '@presentation/renderer/pages/organize/organizePageConstants'
import {
  type DuplicateSortOption,
  type ExistingSkipSortOption,
  type IncrementalSkipSortOption,
  type IssueSeverityFilter,
  type IssueSortOption
} from '@presentation/renderer/pages/organize/organizeGroupForm'
import { groupInBatchDuplicateDetails } from '@presentation/renderer/pages/organize/organizeScanSummaryMerge'

import { OrganizeScanResultExistingSkipPanel } from './OrganizeScanResultExistingSkipPanel'
import { OrganizeScanResultInBatchDupPanel } from './OrganizeScanResultInBatchDupPanel'
import { OrganizeScanResultIncrementalSkipPanel } from './OrganizeScanResultIncrementalSkipPanel'
import { OrganizeScanResultIssuesPanel } from './OrganizeScanResultIssuesPanel'
import { OrganizeScanResultSummaryCards } from './OrganizeScanResultSummaryCards'

type ScanDetailTab =
  | 'inBatchDup'
  | 'incrementalSkip'
  | 'existingSkip'
  | 'warnings'
  | 'failures'

export interface OrganizeScanResultDetailPanelsProps {
  summary: ScanPhotoLibrarySummary
  outputRoot: string | null
  openScanResultDetail: ScanDetailTab | null
  handleToggleScanResultDetail: (detail: ScanDetailTab) => void
  duplicatePathQuery: string
  setDuplicatePathQuery: (v: string) => void
  duplicateSort: DuplicateSortOption
  setDuplicateSort: (v: DuplicateSortOption) => void
  incrementalSkipPathQuery: string
  setIncrementalSkipPathQuery: (v: string) => void
  incrementalSkipSort: IncrementalSkipSortOption
  setIncrementalSkipSort: (v: IncrementalSkipSortOption) => void
  existingSkipPathQuery: string
  setExistingSkipPathQuery: (v: string) => void
  existingSkipHashQuery: string
  setExistingSkipHashQuery: (v: string) => void
  existingSkipSort: ExistingSkipSortOption
  setExistingSkipSort: (v: ExistingSkipSortOption) => void
  issueSeverityFilter: IssueSeverityFilter
  setIssueSeverityFilter: (v: IssueSeverityFilter) => void
  issueStageFilter: 'all' | ScanPhotoLibraryIssue['stage']
  setIssueStageFilter: (v: 'all' | ScanPhotoLibraryIssue['stage']) => void
  issueCodeQuery: string
  setIssueCodeQuery: (v: string) => void
  issueSourcePathQuery: string
  setIssueSourcePathQuery: (v: string) => void
  issueSort: IssueSortOption
  setIssueSort: (v: IssueSortOption) => void
  issueStageOptions: ScanPhotoLibraryIssue['stage'][]
  applyIssueQuickFilter: (filter: (typeof ISSUE_QUICK_FILTERS)[number]) => void
  copyResultDetail: (text: string, successMessage: string) => Promise<void>
  groupedInBatchDuplicates: ReturnType<typeof groupInBatchDuplicateDetails>
  reviewedInBatchDuplicates: ReturnType<typeof groupInBatchDuplicateDetails>
  reviewedIncrementalSkips: ScanPhotoLibrarySummary['skippedUnchangedDetails']
  reviewedExistingSkips: ScanPhotoLibrarySummary['existingOutputSkipDetails']
  reviewedIssues: ScanPhotoLibrarySummary['issues']
}

export function OrganizeScanResultDetailPanels(props: OrganizeScanResultDetailPanelsProps) {
  const {
    summary,
    outputRoot,
    openScanResultDetail,
    handleToggleScanResultDetail,
    duplicatePathQuery,
    setDuplicatePathQuery,
    duplicateSort,
    setDuplicateSort,
    incrementalSkipPathQuery,
    setIncrementalSkipPathQuery,
    incrementalSkipSort,
    setIncrementalSkipSort,
    existingSkipPathQuery,
    setExistingSkipPathQuery,
    existingSkipHashQuery,
    setExistingSkipHashQuery,
    existingSkipSort,
    setExistingSkipSort,
    issueSeverityFilter,
    setIssueSeverityFilter,
    issueStageFilter,
    setIssueStageFilter,
    issueCodeQuery,
    setIssueCodeQuery,
    issueSourcePathQuery,
    setIssueSourcePathQuery,
    issueSort,
    setIssueSort,
    issueStageOptions,
    applyIssueQuickFilter,
    copyResultDetail,
    groupedInBatchDuplicates,
    reviewedInBatchDuplicates,
    reviewedIncrementalSkips,
    reviewedExistingSkips,
    reviewedIssues
  } = props

  return (
    <div className="w-full shrink-0 pb-1">
      <section className="rounded-[28px] border border-[color:color-mix(in_srgb,var(--app-accent)_26%,var(--app-border)_74%)] bg-[color:color-mix(in_srgb,var(--app-accent)_10%,var(--app-surface)_90%)] p-5">
        <div className="space-y-3">
          <OrganizeScanResultSummaryCards
            summary={summary}
            openScanResultDetail={openScanResultDetail}
            onToggleDetail={handleToggleScanResultDetail}
          />

          {openScanResultDetail === 'inBatchDup' ? (
            <OrganizeScanResultInBatchDupPanel
              duplicatePathQuery={duplicatePathQuery}
              setDuplicatePathQuery={setDuplicatePathQuery}
              duplicateSort={duplicateSort}
              setDuplicateSort={setDuplicateSort}
              copyResultDetail={copyResultDetail}
              groupedInBatchDuplicates={groupedInBatchDuplicates}
              reviewedInBatchDuplicates={reviewedInBatchDuplicates}
            />
          ) : null}

          {openScanResultDetail === 'incrementalSkip' ? (
            <OrganizeScanResultIncrementalSkipPanel
              summary={summary}
              incrementalSkipPathQuery={incrementalSkipPathQuery}
              setIncrementalSkipPathQuery={setIncrementalSkipPathQuery}
              incrementalSkipSort={incrementalSkipSort}
              setIncrementalSkipSort={setIncrementalSkipSort}
              copyResultDetail={copyResultDetail}
              reviewedIncrementalSkips={reviewedIncrementalSkips}
            />
          ) : null}

          {openScanResultDetail === 'existingSkip' ? (
            <OrganizeScanResultExistingSkipPanel
              outputRoot={outputRoot}
              existingSkipPathQuery={existingSkipPathQuery}
              setExistingSkipPathQuery={setExistingSkipPathQuery}
              existingSkipHashQuery={existingSkipHashQuery}
              setExistingSkipHashQuery={setExistingSkipHashQuery}
              existingSkipSort={existingSkipSort}
              setExistingSkipSort={setExistingSkipSort}
              copyResultDetail={copyResultDetail}
              reviewedExistingSkips={reviewedExistingSkips}
              summary={summary}
            />
          ) : null}

          {openScanResultDetail === 'warnings' || openScanResultDetail === 'failures' ? (
            <OrganizeScanResultIssuesPanel
              mode={openScanResultDetail === 'failures' ? 'failures' : 'warnings'}
              summary={summary}
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
              reviewedIssues={reviewedIssues}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}
