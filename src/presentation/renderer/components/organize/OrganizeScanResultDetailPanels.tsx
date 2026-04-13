import { Button, Input } from '@heroui/react'

import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'
import { ISSUE_QUICK_FILTERS } from '@presentation/renderer/pages/organize/organizePageConstants'
import {
  formatDuplicateListForClipboard,
  formatExistingSkipListForClipboard,
  formatIncrementalSkipListForClipboard,
  formatIssueListForClipboard
} from '@presentation/renderer/pages/organize/organizeClipboardFormatters'
import {
  formatIssueSeverityLabel,
  formatIssueStageLabel,
  getIssueSeverityBadgeClass,
  isIssueQuickFilterActive
} from '@presentation/renderer/pages/organize/organizeIssuePresentation'
import {
  type DuplicateSortOption,
  type ExistingSkipSortOption,
  type IncrementalSkipSortOption,
  type IssueSeverityFilter,
  type IssueSortOption
} from '@presentation/renderer/pages/organize/organizeGroupForm'
import { groupInBatchDuplicateDetails } from '@presentation/renderer/pages/organize/organizeScanSummaryMerge'
import { localImageFileUrl } from '@presentation/renderer/pages/organize/organizeLocalFileUrl'
import { joinPathSegments } from '@shared/utils/path'

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
    reviewedInBatchDuplicates,
    groupedInBatchDuplicates,
    reviewedIncrementalSkips,
    reviewedExistingSkips,
    reviewedIssues
  } = props

  return (
        <div className="w-full shrink-0 pb-1">
        <section className="rounded-[28px] border border-[color:color-mix(in_srgb,var(--app-accent)_26%,var(--app-border)_74%)] bg-[color:color-mix(in_srgb,var(--app-accent)_10%,var(--app-surface)_90%)] p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--app-foreground)]">
                실행 결과
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3">
                <p className="text-xs text-[var(--app-muted)]">스캔 수</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.scannedCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3">
                <p className="text-xs text-[var(--app-muted)]">증분 스킵 수</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.skippedUnchangedCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3">
                <p className="text-xs text-[var(--app-muted)]">유지 수</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.keptCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3">
                <p className="text-xs text-[var(--app-muted)]">신규 복사 수</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.copiedCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3">
                <p className="text-xs text-[var(--app-muted)]">그룹 수</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.groupCount}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'inBatchDup'
                    ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
                }`}
                onClick={() => handleToggleScanResultDetail('inBatchDup')}
              >
                <p className="text-xs text-[var(--app-muted)]">중복 (같은 실행 내)</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.duplicateCount}
                </p>
                <p className="mt-1 text-[11px] text-[var(--app-muted)]">탭하여 쌍 비교</p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'incrementalSkip'
                    ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
                }`}
                onClick={() => handleToggleScanResultDetail('incrementalSkip')}
              >
                <p className="text-xs text-[var(--app-muted)]">증분 스킵 (준비 단계)</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.skippedUnchangedCount}
                </p>
                <p className="mt-1 text-[11px] text-[var(--app-muted)]">
                  sourcePath + size + mtime 기준
                </p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'existingSkip'
                    ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
                }`}
                onClick={() => handleToggleScanResultDetail('existingSkip')}
              >
                <p className="text-xs text-[var(--app-muted)]">기존 출력과 동일 (스킵)</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.skippedExistingCount}
                </p>
                <p className="mt-1 text-[11px] text-[var(--app-muted)]">탭하여 경로 비교</p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'warnings'
                    ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
                }`}
                onClick={() => handleToggleScanResultDetail('warnings')}
              >
                <p className="text-xs text-[var(--app-muted)]">경고 수</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.warningCount}
                </p>
                <p className="mt-1 text-[11px] text-[var(--app-muted)]">탭하여 목록</p>
              </button>
              <button
                type="button"
                className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
                  openScanResultDetail === 'failures'
                    ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
                    : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
                }`}
                onClick={() => handleToggleScanResultDetail('failures')}
              >
                <p className="text-xs text-[var(--app-muted)]">실패 수</p>
                <p className="text-xl font-semibold text-[var(--app-foreground)]">
                  {summary.failureCount}
                </p>
                <p className="mt-1 text-[11px] text-[var(--app-muted)]">탭하여 목록</p>
              </button>
            </div>

            {openScanResultDetail === 'inBatchDup' ? (
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      같은 실행 안에서 동일 파일(해시) 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      canonical 원본과 이번 실행에서 생략된 duplicate 원본을 같이
                      확인할 수 있습니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedInBatchDuplicates.length} / 전체{' '}
                    {groupedInBatchDuplicates.length}
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
                  <span className="text-[11px] font-medium text-slate-600">
                    sourcePath 검색
                  </span>
                  <Input
                    value={duplicatePathQuery}
                    onChange={(event) => setDuplicatePathQuery(event.target.value)}
                    placeholder="canonical 또는 duplicate 경로 일부 검색"
                    className="rounded-2xl border border-[var(--app-border)] bg-white"
                  />
                </label>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={duplicateSort}
                    onChange={(event) =>
                      setDuplicateSort(event.target.value as DuplicateSortOption)
                    }
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
                      <li
                        key={dupGroup.canonicalPhotoId}
                        className="rounded-[20px] border border-slate-200 p-3"
                      >
                        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            canonical 1장
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            duplicate {dupGroup.duplicateSourcePaths.length}장
                          </span>
                        </div>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="sm:w-2/5">
                            <p className="text-[11px] font-medium text-slate-600">
                              대표(저장)
                            </p>
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
                              중복(복사 생략){' '}
                              {dupGroup.duplicateSourcePaths.length}장
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
                                <li
                                  key={path}
                                  className="break-all text-[11px] text-slate-600"
                                >
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
            ) : null}

            {openScanResultDetail === 'incrementalSkip' ? (
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      증분 재스캔으로 건너뛴 입력 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      이전 저장 fingerprint 와 현재 `sourcePath + size + mtime` 이
                      같아 준비 단계에서 제외된 원본 파일입니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedIncrementalSkips.length} / 전체{' '}
                    {summary.skippedUnchangedDetails.length}
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
                  <span className="text-[11px] font-medium text-slate-600">
                    sourcePath 검색
                  </span>
                  <Input
                    value={incrementalSkipPathQuery}
                    onChange={(event) =>
                      setIncrementalSkipPathQuery(event.target.value)
                    }
                    placeholder="증분 스킵된 원본 경로 검색"
                    className="rounded-2xl border border-[var(--app-border)] bg-white"
                  />
                </label>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={incrementalSkipSort}
                    onChange={(event) =>
                      setIncrementalSkipSort(
                        event.target.value as IncrementalSkipSortOption
                      )
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
                          <span className="rounded-full bg-white px-2 py-1">
                            {row.sourceFileName}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1">
                            {row.sourceFingerprint.sizeBytes} bytes
                          </span>
                          <span className="rounded-full bg-white px-2 py-1">
                            mtime{' '}
                            {new Date(
                              row.sourceFingerprint.modifiedAtMs
                            ).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-2 break-all text-slate-700">
                          {row.sourcePath}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {openScanResultDetail === 'existingSkip' ? (
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      기존 출력과 동일해 건너뛴 항목 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      source 원본과 기존 output 대상 경로를 함께 비교할 수 있습니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedExistingSkips.length} / 전체{' '}
                    {summary.existingOutputSkipDetails.length}
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
                    <span className="text-[11px] font-medium text-slate-600">
                      경로 검색
                    </span>
                    <Input
                      value={existingSkipPathQuery}
                      onChange={(event) => setExistingSkipPathQuery(event.target.value)}
                      placeholder="sourcePath 또는 outputRelativePath 검색"
                      className="rounded-2xl border border-[var(--app-border)] bg-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      SHA-256 검색
                    </span>
                    <Input
                      value={existingSkipHashQuery}
                      onChange={(event) => setExistingSkipHashQuery(event.target.value)}
                      placeholder="해시 앞부분 검색"
                      className="rounded-2xl border border-[var(--app-border)] bg-white"
                    />
                  </label>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={existingSkipSort}
                    onChange={(event) =>
                      setExistingSkipSort(
                        event.target.value as ExistingSkipSortOption
                      )
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
                            <p className="text-[11px] font-medium text-slate-600">
                              원본
                            </p>
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
                            <p className="text-[11px] font-medium text-slate-600">
                              기존 출력
                            </p>
                            <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-slate-100">
                              <img
                                src={localImageFileUrl(
                                  outputRoot
                                    ? joinPathSegments(
                                        outputRoot,
                                        row.existingOutputRelativePath
                                      )
                                    : row.existingOutputRelativePath
                                )}
                                alt=""
                                className="h-28 w-full object-contain"
                              />
                            </div>
                            <p className="mt-1 break-all text-[11px]">
                              {outputRoot
                                ? joinPathSegments(
                                    outputRoot,
                                    row.existingOutputRelativePath
                                  )
                                : row.existingOutputRelativePath}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              SHA-256: {row.sha256}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {openScanResultDetail === 'warnings' ||
            openScanResultDetail === 'failures' ? (
              <div
                className={`rounded-lg border p-4 ${
                  openScanResultDetail === 'failures'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        openScanResultDetail === 'failures'
                          ? 'text-red-950'
                          : 'text-amber-950'
                      }`}
                    >
                      실행 이슈 검토
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      severity, stage, code, sourcePath 기준으로 다시 확인할 수
                      있습니다.
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    필터 결과 {reviewedIssues.length} / 전체 {summary.issues.length}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      void copyResultDetail(
                        formatIssueListForClipboard(reviewedIssues),
                        '이슈 검토 목록을 복사했습니다.'
                      )
                    }
                  >
                    목록 복사
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {([
                    ['all', '전체'],
                    ['warning', '경고'],
                    ['error', '실패']
                  ] as const).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        issueSeverityFilter === value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => setIssueSeverityFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ISSUE_QUICK_FILTERS.map((filter) => (
                    <button
                      type="button"
                      key={filter.key}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        isIssueQuickFilterActive(
                          filter,
                          issueStageFilter,
                          issueCodeQuery
                        )
                          ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                          : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-foreground)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_6%,var(--app-surface)_94%)]'
                      }`}
                      onClick={() => applyIssueQuickFilter(filter)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      stage
                    </span>
                    <select
                      value={issueStageFilter}
                      onChange={(event) =>
                        setIssueStageFilter(
                          event.target.value as 'all' | ScanPhotoLibraryIssue['stage']
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="all">전체 stage</option>
                      {issueStageOptions.map((stage) => (
                        <option key={stage} value={stage}>
                          {formatIssueStageLabel(stage)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      code 검색
                    </span>
                    <input
                      value={issueCodeQuery}
                      onChange={(event) => setIssueCodeQuery(event.target.value)}
                      placeholder="예: metadata-missing"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      sourcePath 검색
                    </span>
                    <input
                      value={issueSourcePathQuery}
                      onChange={(event) => setIssueSourcePathQuery(event.target.value)}
                      placeholder="경로 일부 검색"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </label>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    정렬
                  </span>
                  <select
                    value={issueSort}
                    onChange={(event) =>
                      setIssueSort(event.target.value as IssueSortOption)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="severity-stage-path">severity/stage 기준</option>
                    <option value="path-asc">sourcePath 기준</option>
                    <option value="code-asc">code 기준</option>
                  </select>
                </label>

                {reviewedIssues.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    현재 필터 조건에 맞는 이슈가 없습니다.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 hidden grid-cols-[90px_100px_180px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 lg:grid">
                      <span>severity</span>
                      <span>stage</span>
                      <span>code</span>
                      <span>sourcePath</span>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {reviewedIssues.map((issue, index) => (
                        <li
                          key={`${issue.sourcePath}-${issue.code}-${index}`}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800"
                        >
                          <div className="grid gap-2 lg:grid-cols-[90px_100px_180px_minmax(0,1fr)] lg:items-start lg:gap-3">
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                severity
                              </p>
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getIssueSeverityBadgeClass(issue.severity)}`}
                              >
                                {formatIssueSeverityLabel(issue.severity)}
                              </span>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                stage
                              </p>
                              <p className="font-medium text-slate-700">
                                {formatIssueStageLabel(issue.stage)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                code
                              </p>
                              <p className="font-mono text-[11px] text-slate-700">
                                {issue.code}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 lg:hidden">
                                sourcePath
                              </p>
                              <p className="break-all text-slate-800">
                                {issue.sourcePath}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
                            {issue.photoId ? <p>photoId: {issue.photoId}</p> : null}
                            {issue.outputRelativePath ? (
                              <p className="break-all">
                                출력 상대경로: {issue.outputRelativePath}
                              </p>
                            ) : null}
                            {issue.destinationPath ? (
                              <p className="break-all">
                                대상 경로: {issue.destinationPath}
                              </p>
                            ) : null}
                            <p className="text-xs text-slate-800">{issue.message}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </section>
        </div>
  )
}
