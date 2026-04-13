import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import { ISSUE_QUICK_FILTERS } from '@presentation/renderer/pages/organize/organizePageConstants'
import {
  type DuplicateSortOption,
  type ExistingSkipSortOption,
  type IncrementalSkipSortOption,
  type IssueSeverityFilter,
  type IssueSortOption
} from '@presentation/renderer/pages/organize/organizeGroupForm'

export type OpenScanResultDetail =
  | null
  | 'inBatchDup'
  | 'incrementalSkip'
  | 'existingSkip'
  | 'warnings'
  | 'failures'

export interface OrganizeScanFiltersState {
  openScanResultDetail: OpenScanResultDetail
  setOpenScanResultDetail: Dispatch<SetStateAction<OpenScanResultDetail>>
  incrementalSkipPathQuery: string
  setIncrementalSkipPathQuery: Dispatch<SetStateAction<string>>
  issueSeverityFilter: IssueSeverityFilter
  setIssueSeverityFilter: Dispatch<SetStateAction<IssueSeverityFilter>>
  issueStageFilter: 'all' | ScanPhotoLibraryIssue['stage']
  setIssueStageFilter: Dispatch<
    SetStateAction<'all' | ScanPhotoLibraryIssue['stage']>
  >
  issueCodeQuery: string
  setIssueCodeQuery: Dispatch<SetStateAction<string>>
  issueSourcePathQuery: string
  setIssueSourcePathQuery: Dispatch<SetStateAction<string>>
  duplicatePathQuery: string
  setDuplicatePathQuery: Dispatch<SetStateAction<string>>
  duplicateSort: DuplicateSortOption
  setDuplicateSort: Dispatch<SetStateAction<DuplicateSortOption>>
  existingSkipPathQuery: string
  setExistingSkipPathQuery: Dispatch<SetStateAction<string>>
  existingSkipHashQuery: string
  setExistingSkipHashQuery: Dispatch<SetStateAction<string>>
  existingSkipSort: ExistingSkipSortOption
  setExistingSkipSort: Dispatch<SetStateAction<ExistingSkipSortOption>>
  incrementalSkipSort: IncrementalSkipSortOption
  setIncrementalSkipSort: Dispatch<SetStateAction<IncrementalSkipSortOption>>
  issueSort: IssueSortOption
  setIssueSort: Dispatch<SetStateAction<IssueSortOption>>
  handleToggleScanResultDetail: (
    detail: NonNullable<OpenScanResultDetail>
  ) => void
  applyIssueQuickFilter: (filter: (typeof ISSUE_QUICK_FILTERS)[number]) => void
}

export function useOrganizeScanFiltersState(): OrganizeScanFiltersState {
  const [openScanResultDetail, setOpenScanResultDetail] =
    useState<OpenScanResultDetail>(null)
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

  const handleToggleScanResultDetail = useCallback(
    (detail: NonNullable<OpenScanResultDetail>) => {
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
    },
    [openScanResultDetail]
  )

  const applyIssueQuickFilter = useCallback(
    (filter: (typeof ISSUE_QUICK_FILTERS)[number]) => {
      setIssueStageFilter(filter.stage)
      setIssueCodeQuery(filter.codeQuery)
    },
    []
  )

  return {
    openScanResultDetail,
    setOpenScanResultDetail,
    incrementalSkipPathQuery,
    setIncrementalSkipPathQuery,
    issueSeverityFilter,
    setIssueSeverityFilter,
    issueStageFilter,
    setIssueStageFilter,
    issueCodeQuery,
    setIssueCodeQuery,
    issueSourcePathQuery,
    setIssueSourcePathQuery,
    duplicatePathQuery,
    setDuplicatePathQuery,
    duplicateSort,
    setDuplicateSort,
    existingSkipPathQuery,
    setExistingSkipPathQuery,
    existingSkipHashQuery,
    setExistingSkipHashQuery,
    existingSkipSort,
    setExistingSkipSort,
    incrementalSkipSort,
    setIncrementalSkipSort,
    issueSort,
    setIssueSort,
    handleToggleScanResultDetail,
    applyIssueQuickFilter
  }
}
