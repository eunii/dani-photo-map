import { Button, Input } from '@heroui/react'

import { formatDuplicateListForClipboard } from '@presentation/renderer/pages/organize/organizeClipboardFormatters'
import type { DuplicateSortOption } from '@presentation/renderer/pages/organize/organizeGroupForm'
import { localImageFileUrl } from '@presentation/renderer/pages/organize/organizeLocalFileUrl'
import { groupInBatchDuplicateDetails } from '@presentation/renderer/pages/organize/organizeScanSummaryMerge'

export interface OrganizeScanResultInBatchDupPanelProps {
  duplicatePathQuery: string
  setDuplicatePathQuery: (v: string) => void
  duplicateSort: DuplicateSortOption
  setDuplicateSort: (v: DuplicateSortOption) => void
  copyResultDetail: (text: string, successMessage: string) => Promise<void>
  groupedInBatchDuplicates: ReturnType<typeof groupInBatchDuplicateDetails>
  reviewedInBatchDuplicates: ReturnType<typeof groupInBatchDuplicateDetails>
}

export function OrganizeScanResultInBatchDupPanel({
  duplicatePathQuery,
  setDuplicatePathQuery,
  duplicateSort,
  setDuplicateSort,
  copyResultDetail,
  groupedInBatchDuplicates,
  reviewedInBatchDuplicates
}: OrganizeScanResultInBatchDupPanelProps) {
  return (
    <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-800">같은 실행 안에서 동일 파일(해시) 검토</p>
          <p className="mt-1 text-xs text-slate-600">
            canonical 원본과 이번 실행에서 생략된 duplicate 원본을 같이 확인할 수 있습니다.
          </p>
        </div>
        <p className="text-xs text-slate-600">
          필터 결과 {reviewedInBatchDuplicates.length} / 전체 {groupedInBatchDuplicates.length}
        </p>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          variant="secondary"
          className="rounded-2xl border border-[var(--app-border)] bg-white text-xs font-medium text-[var(--app-foreground)]"
          onPress={() =>
            void copyResultDetail(
              formatDuplicateListForClipboard(reviewedInBatchDuplicates),
              '중복 검토 목록을 복사했습니다.'
            )
          }
        >
          목록 복사
        </Button>
      </div>
      <label className="mt-3 block space-y-1">
        <span className="text-[11px] font-medium text-slate-600">sourcePath 검색</span>
        <Input
          value={duplicatePathQuery}
          onChange={(event) => setDuplicatePathQuery(event.target.value)}
          placeholder="canonical 또는 duplicate 경로 일부 검색"
          className="rounded-2xl border border-[var(--app-border)] bg-white"
        />
      </label>
      <label className="mt-3 block space-y-1">
        <span className="text-[11px] font-medium text-slate-600">정렬</span>
        <select
          value={duplicateSort}
          onChange={(event) => setDuplicateSort(event.target.value as DuplicateSortOption)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="duplicates-desc">duplicate 수 많은 순</option>
          <option value="path-asc">canonical 경로순</option>
        </select>
      </label>
      {reviewedInBatchDuplicates.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">해당 없음</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {reviewedInBatchDuplicates.map((dupGroup) => (
            <li key={dupGroup.canonicalPhotoId} className="rounded-[20px] border border-slate-200 p-3">
              <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-1">canonical 1장</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  duplicate {dupGroup.duplicateSourcePaths.length}장
                </span>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="sm:w-2/5">
                  <p className="text-[11px] font-medium text-slate-600">대표(저장)</p>
                  <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-100">
                    <img
                      src={localImageFileUrl(dupGroup.canonicalSourcePath)}
                      alt=""
                      className="h-40 w-full object-contain"
                    />
                  </div>
                  <p className="mt-1 break-all text-[11px] text-slate-700">
                    {dupGroup.canonicalSourcePath}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-600">
                    중복(복사 생략) {dupGroup.duplicateSourcePaths.length}장
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {dupGroup.duplicateSourcePaths.map((path, idx) => (
                      <div
                        key={`${path}-${idx}`}
                        className="overflow-hidden rounded border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={localImageFileUrl(path)}
                          alt=""
                          className="h-16 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <ul className="mt-2 space-y-1">
                    {dupGroup.duplicateSourcePaths.map((path) => (
                      <li key={path} className="break-all text-[11px] text-slate-600">
                        {path}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
