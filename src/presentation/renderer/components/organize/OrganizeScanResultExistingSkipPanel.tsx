import { Button, Input } from '@heroui/react'

import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

import { formatExistingSkipListForClipboard } from '@presentation/renderer/pages/organize/organizeClipboardFormatters'
import type { ExistingSkipSortOption } from '@presentation/renderer/pages/organize/organizeGroupForm'
import { localImageFileUrl } from '@presentation/renderer/pages/organize/organizeLocalFileUrl'
import { joinPathSegments } from '@shared/utils/path'

export interface OrganizeScanResultExistingSkipPanelProps {
  outputRoot: string | null
  existingSkipPathQuery: string
  setExistingSkipPathQuery: (v: string) => void
  existingSkipHashQuery: string
  setExistingSkipHashQuery: (v: string) => void
  existingSkipSort: ExistingSkipSortOption
  setExistingSkipSort: (v: ExistingSkipSortOption) => void
  copyResultDetail: (text: string, successMessage: string) => Promise<void>
  reviewedExistingSkips: ScanPhotoLibrarySummary['existingOutputSkipDetails']
  summary: ScanPhotoLibrarySummary
}

export function OrganizeScanResultExistingSkipPanel({
  outputRoot,
  existingSkipPathQuery,
  setExistingSkipPathQuery,
  existingSkipHashQuery,
  setExistingSkipHashQuery,
  existingSkipSort,
  setExistingSkipSort,
  copyResultDetail,
  reviewedExistingSkips,
  summary
}: OrganizeScanResultExistingSkipPanelProps) {
  return (
    <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-800">기존 출력과 동일해 건너뛴 항목 검토</p>
          <p className="mt-1 text-xs text-slate-600">
            source 원본과 기존 output 대상 경로를 함께 비교할 수 있습니다.
          </p>
        </div>
        <p className="text-xs text-slate-600">
          필터 결과 {reviewedExistingSkips.length} / 전체 {summary.existingOutputSkipDetails.length}
        </p>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          variant="secondary"
          className="rounded-2xl border border-[var(--app-border)] bg-white text-xs font-medium text-[var(--app-foreground)]"
          onPress={() =>
            void copyResultDetail(
              formatExistingSkipListForClipboard(reviewedExistingSkips),
              '기존 출력 스킵 목록을 복사했습니다.'
            )
          }
        >
          목록 복사
        </Button>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-slate-600">경로 검색</span>
          <Input
            value={existingSkipPathQuery}
            onChange={(event) => setExistingSkipPathQuery(event.target.value)}
            placeholder="sourcePath 또는 outputRelativePath 검색"
            className="rounded-2xl border border-[var(--app-border)] bg-white"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-slate-600">SHA-256 검색</span>
          <Input
            value={existingSkipHashQuery}
            onChange={(event) => setExistingSkipHashQuery(event.target.value)}
            placeholder="해시 앞부분 검색"
            className="rounded-2xl border border-[var(--app-border)] bg-white"
          />
        </label>
      </div>
      <label className="mt-3 block space-y-1">
        <span className="text-[11px] font-medium text-slate-600">정렬</span>
        <select
          value={existingSkipSort}
          onChange={(event) =>
            setExistingSkipSort(event.target.value as ExistingSkipSortOption)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="hash-asc">SHA-256 기준</option>
          <option value="path-asc">원본 경로순</option>
        </select>
      </label>
      {reviewedExistingSkips.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">해당 없음</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reviewedExistingSkips.map((row, index) => (
            <li
              key={`${row.sourcePhotoId}-${index}`}
              className="rounded-md border border-slate-200 p-3 text-sm text-slate-800"
            >
              <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  sourcePhotoId: {row.sourcePhotoId}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  SHA-256: {row.sha256.slice(0, 12)}...
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-medium text-slate-600">원본</p>
                  <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-100">
                    <img
                      src={localImageFileUrl(row.sourcePath)}
                      alt=""
                      className="h-28 w-full object-contain"
                    />
                  </div>
                  <p className="mt-1 break-all text-[11px]">{row.sourcePath}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-600">기존 출력</p>
                  <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-100">
                    <img
                      src={localImageFileUrl(
                        outputRoot
                          ? joinPathSegments(outputRoot, row.existingOutputRelativePath)
                          : row.existingOutputRelativePath
                      )}
                      alt=""
                      className="h-28 w-full object-contain"
                    />
                  </div>
                  <p className="mt-1 break-all text-[11px]">
                    {outputRoot
                      ? joinPathSegments(outputRoot, row.existingOutputRelativePath)
                      : row.existingOutputRelativePath}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">SHA-256: {row.sha256}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
