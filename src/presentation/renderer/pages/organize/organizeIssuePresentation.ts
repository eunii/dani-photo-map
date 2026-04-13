import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import { ISSUE_QUICK_FILTERS } from '@presentation/renderer/pages/organize/organizePageConstants'

export function formatIssueStageLabel(stage: ScanPhotoLibraryIssue['stage']): string {
  switch (stage) {
    case 'metadata-read':
      return '메타데이터'
    case 'hash':
      return '해시'
    case 'region-resolve':
      return '지역 해석'
    case 'copy':
      return '복사'
    case 'thumbnail':
      return '썸네일'
    default:
      return stage
  }
}

export function formatIssueSeverityLabel(
  severity: ScanPhotoLibraryIssue['severity']
): string {
  switch (severity) {
    case 'warning':
      return '경고'
    case 'error':
      return '실패'
    default:
      return severity
  }
}

export function getIssueSeverityBadgeClass(
  severity: ScanPhotoLibraryIssue['severity']
): string {
  return severity === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-700'
}

export function isIssueQuickFilterActive(
  filter: (typeof ISSUE_QUICK_FILTERS)[number],
  stage: 'all' | ScanPhotoLibraryIssue['stage'],
  codeQuery: string
): boolean {
  return filter.stage === stage && filter.codeQuery === codeQuery
}
