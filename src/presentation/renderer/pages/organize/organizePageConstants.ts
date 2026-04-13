import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import type { OrganizeCustomSplitInput } from '@presentation/renderer/pages/organizeScanPayload'

export const SOURCE_DIALOG_OPTIONS = {
  title: '원본 사진 폴더 선택',
  buttonLabel: '원본 폴더 선택'
} as const

export const EMPTY_GROUP_ASSIGNMENTS: Record<string, string> = {}
export const EMPTY_CUSTOM_SPLITS: Record<string, OrganizeCustomSplitInput[]> = {}

export const MISSING_GPS_GROUPING_OPTIONS: Array<{
  value: MissingGpsGroupingBasis
  label: string
}> = [
  { value: 'month', label: '월별' },
  { value: 'week', label: '주별' },
  { value: 'day', label: '일별' }
]

export const SCAN_ISSUE_STAGES: ScanPhotoLibraryIssue['stage'][] = [
  'metadata-read',
  'hash',
  'region-resolve',
  'copy',
  'thumbnail'
]

export const ISSUE_QUICK_FILTERS = [
  {
    key: 'all',
    label: '전체 code',
    codeQuery: '',
    stage: 'all' as const
  },
  {
    key: 'metadata',
    label: '메타데이터 실패',
    codeQuery: 'metadata-read-failed',
    stage: 'metadata-read' as const
  },
  {
    key: 'hash',
    label: '해시 관련',
    codeQuery: 'hash',
    stage: 'hash' as const
  },
  {
    key: 'region',
    label: '지역 해석 실패',
    codeQuery: 'region-resolve-failed',
    stage: 'region-resolve' as const
  },
  {
    key: 'copy',
    label: '복사 관련',
    codeQuery: 'copy',
    stage: 'copy' as const
  },
  {
    key: 'copy-conflict',
    label: '복사 충돌',
    codeQuery: 'copy-destination-conflict',
    stage: 'copy' as const
  },
  {
    key: 'thumbnail',
    label: '썸네일 실패',
    codeQuery: 'thumbnail',
    stage: 'thumbnail' as const
  }
] as const
