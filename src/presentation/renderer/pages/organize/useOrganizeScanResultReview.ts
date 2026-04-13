import { useMemo } from 'react'

import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import { SCAN_ISSUE_STAGES } from '@presentation/renderer/pages/organize/organizePageConstants'
import { groupInBatchDuplicateDetails } from '@presentation/renderer/pages/organize/organizeScanSummaryMerge'
import {
  type DuplicateSortOption,
  type ExistingSkipSortOption,
  type IncrementalSkipSortOption,
  type IssueSeverityFilter,
  type IssueSortOption
} from '@presentation/renderer/pages/organize/organizeGroupForm'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

export interface OrganizeScanResultReviewFilters {
  duplicatePathQuery: string
  duplicateSort: DuplicateSortOption
  existingSkipPathQuery: string
  existingSkipHashQuery: string
  existingSkipSort: ExistingSkipSortOption
  incrementalSkipPathQuery: string
  incrementalSkipSort: IncrementalSkipSortOption
  issueSeverityFilter: IssueSeverityFilter
  issueStageFilter: 'all' | ScanPhotoLibraryIssue['stage']
  issueCodeQuery: string
  issueSourcePathQuery: string
  issueSort: IssueSortOption
}

export function useOrganizeScanResultReview(
  summary: ScanPhotoLibrarySummary | null,
  filters: OrganizeScanResultReviewFilters
) {
  const {
    duplicatePathQuery,
    duplicateSort,
    existingSkipPathQuery,
    existingSkipHashQuery,
    existingSkipSort,
    incrementalSkipPathQuery,
    incrementalSkipSort,
    issueSeverityFilter,
    issueStageFilter,
    issueCodeQuery,
    issueSourcePathQuery,
    issueSort
  } = filters

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

  return {
    groupedInBatchDuplicates,
    reviewedInBatchDuplicates,
    reviewedExistingSkips,
    reviewedIncrementalSkips,
    issueStageOptions,
    reviewedIssues
  }
}
