import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import type { PreviewPendingOrganizationResult } from '@shared/types/preload'
import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import { buildOrganizeScanPayload } from '@presentation/renderer/pages/organizeScanPayload'
import {
  EMPTY_CUSTOM_SPLITS,
  EMPTY_GROUP_ASSIGNMENTS,
  MISSING_GPS_GROUPING_OPTIONS
} from '@presentation/renderer/pages/organize/organizePageConstants'

export type GroupSavePhase = 'idle' | 'queued' | 'saving' | 'done' | 'error'
export type IssueSeverityFilter = 'all' | ScanPhotoLibraryIssue['severity']
export type DuplicateSortOption = 'duplicates-desc' | 'path-asc'
export type IncrementalSkipSortOption = 'path-asc' | 'mtime-desc'
export type ExistingSkipSortOption = 'path-asc' | 'hash-asc'
export type IssueSortOption = 'severity-stage-path' | 'path-asc' | 'code-asc'

export function formatMissingGpsGroupingBasisLabel(
  basis: MissingGpsGroupingBasis
): string {
  return (
    MISSING_GPS_GROUPING_OPTIONS.find((option) => option.value === basis)?.label ??
    '월별'
  )
}

export function formatMissingGpsFolderPattern(
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

export function getMissingGpsCategoryLabel(
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

export function getAssignmentModeDescription(
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

export function formatGroupSavePhaseLabel(phase: GroupSavePhase): string {
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

export function getGroupLinePercent(
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

export function getInitialGroupTitleValue(
  group: PreviewPendingOrganizationResult['groups'][number]
): string {
  if (!group.representativeGps && group.displayTitle.trim().length > 0) {
    return group.displayTitle
  }

  return group.suggestedTitles[0] ?? group.displayTitle
}

export function effectiveGroupTitle(
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

export function buildEffectiveOrganizeInputs(
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
