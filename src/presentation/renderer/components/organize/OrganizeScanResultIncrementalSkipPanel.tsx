import { Button, Input } from '@heroui/react'

import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

import { formatIncrementalSkipListForClipboard } from '@presentation/renderer/pages/organize/organizeClipboardFormatters'
import type { IncrementalSkipSortOption } from '@presentation/renderer/pages/organize/organizeGroupForm'

export interface OrganizeScanResultIncrementalSkipPanelProps {
  summary: ScanPhotoLibrarySummary
  incrementalSkipPathQuery: string
  setIncrementalSkipPathQuery: (v: string) => void
  incrementalSkipSort: IncrementalSkipSortOption
  setIncrementalSkipSort: (v: IncrementalSkipSortOption) => void
  copyResultDetail: (text: string, successMessage: string) => Promise<void>
  reviewedIncrementalSkips: ScanPhotoLibrarySummary['skippedUnchangedDetails']
}

export function OrganizeScanResultIncrementalSkipPanel({
  summary,
  incrementalSkipPathQuery,
  setIncrementalSkipPathQuery,
  incrementalSkipSort,
  setIncrementalSkipSort,
  copyResultDetail,
  reviewedIncrementalSkips
}: OrganizeScanResultIncrementalSkipPanelProps) {
  return (
    <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-800">증분 재스캔으로 건너뛴 입력 검토</p>
          <p className="mt-1 text-xs text-slate-600">
            이전 저장 fingerprint 와 현재 `sourcePath + size + mtime` 이 같아 준비 단계에서
            제외된 원본 파일입니다.
          </p>
        </div>
        <p className="text-xs text-slate-600">
          필터 결과 {reviewedIncrementalSkips.length} / 전체 {summary.skippedUnchangedDetails.length}
        </p>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          variant="secondary"
          className="rounded-2xl border border-[var(--app-border)] bg-white text-xs font-medium text-[var(--app-foreground)]"
          onPress={() =>
            void copyResultDetail(
              formatIncrementalSkipListForClipboard(reviewedIncrementalSkips),
              '증분 스킵 목록을 복사했습니다.'
            )
          }
        >
          목록 복사
        </Button>
      </div>
      <label className="mt-3 block space-y-1">
        <span className="text-[11px] font-medium text-slate-600">sourcePath 검색</span>
        <Input
          value={incrementalSkipPathQuery}
          onChange={(event) => setIncrementalSkipPathQuery(event.target.value)}
          placeholder="증분 스킵된 원본 경로 검색"
          className="rounded-2xl border border-[var(--app-border)] bg-white"
        />
      </label>
      <label className="mt-3 block space-y-1">
        <span className="text-[11px] font-medium text-slate-600">정렬</span>
        <select
          value={incrementalSkipSort}
          onChange={(event) =>
            setIncrementalSkipSort(event.target.value as IncrementalSkipSortOption)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="path-asc">경로순</option>
          <option value="mtime-desc">mtime 최신순</option>
        </select>
      </label>
      {reviewedIncrementalSkips.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">해당 없음</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {reviewedIncrementalSkips.map((row, index) => (
            <li
              key={`${row.sourcePath}-${index}`}
              className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800"
            >
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="rounded-full bg-white px-2 py-1">{row.sourceFileName}</span>
                <span className="rounded-full bg-white px-2 py-1">
                  {row.sourceFingerprint.sizeBytes} bytes
                </span>
                <span className="rounded-full bg-white px-2 py-1">
                  mtime {new Date(row.sourceFingerprint.modifiedAtMs).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 break-all text-slate-700">{row.sourcePath}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
