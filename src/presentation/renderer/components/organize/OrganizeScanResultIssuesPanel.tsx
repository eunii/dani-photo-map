import type { ScanPhotoLibraryIssue } from '@application/dto/ScanPhotoLibraryResult'
import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

import { ISSUE_QUICK_FILTERS } from '@presentation/renderer/pages/organize/organizePageConstants'
import { formatIssueListForClipboard } from '@presentation/renderer/pages/organize/organizeClipboardFormatters'
import type {
  IssueSeverityFilter,
  IssueSortOption
} from '@presentation/renderer/pages/organize/organizeGroupForm'
import {
  formatIssueSeverityLabel,
  formatIssueStageLabel,
  getIssueSeverityBadgeClass,
  isIssueQuickFilterActive
} from '@presentation/renderer/pages/organize/organizeIssuePresentation'

export interface OrganizeScanResultIssuesPanelProps {
  mode: 'warnings' | 'failures'
  summary: ScanPhotoLibrarySummary
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
  reviewedIssues: ScanPhotoLibrarySummary['issues']
}

export function OrganizeScanResultIssuesPanel({
  mode,
  summary,
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
  reviewedIssues
}: OrganizeScanResultIssuesPanelProps) {
  const isFailure = mode === 'failures'

  return (
    <div
      className={`rounded-lg border p-4 ${
        isFailure ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p
            className={`text-xs font-semibold ${
              isFailure ? 'text-red-950' : 'text-amber-950'
            }`}
          >
            실행 이슈 검토
          </p>
          <p className="mt-1 text-xs text-slate-600">
            severity, stage, code, sourcePath 기준으로 다시 확인할 수 있습니다.
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
        {(
          [
            ['all', '전체'],
            ['warning', '경고'],
            ['error', '실패']
          ] as const
        ).map(([value, label]) => (
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
              isIssueQuickFilterActive(filter, issueStageFilter, issueCodeQuery)
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
          <span className="text-[11px] font-medium text-slate-600">stage</span>
          <select
            value={issueStageFilter}
            onChange={(event) =>
              setIssueStageFilter(event.target.value as 'all' | ScanPhotoLibraryIssue['stage'])
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
          <span className="text-[11px] font-medium text-slate-600">code 검색</span>
          <input
            value={issueCodeQuery}
            onChange={(event) => setIssueCodeQuery(event.target.value)}
            placeholder="예: metadata-missing"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-slate-600">sourcePath 검색</span>
          <input
            value={issueSourcePathQuery}
            onChange={(event) => setIssueSourcePathQuery(event.target.value)}
            placeholder="경로 일부 검색"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </label>
      </div>
      <label className="mt-3 block space-y-1">
        <span className="text-[11px] font-medium text-slate-600">정렬</span>
        <select
          value={issueSort}
          onChange={(event) => setIssueSort(event.target.value as IssueSortOption)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="severity-stage-path">severity/stage 기준</option>
          <option value="path-asc">sourcePath 기준</option>
          <option value="code-asc">code 기준</option>
        </select>
      </label>

      {reviewedIssues.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">현재 필터 조건에 맞는 이슈가 없습니다.</p>
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
                    <p className="text-[11px] font-medium text-slate-500 lg:hidden">severity</p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getIssueSeverityBadgeClass(issue.severity)}`}
                    >
                      {formatIssueSeverityLabel(issue.severity)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 lg:hidden">stage</p>
                    <p className="font-medium text-slate-700">
                      {formatIssueStageLabel(issue.stage)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 lg:hidden">code</p>
                    <p className="font-mono text-[11px] text-slate-700">{issue.code}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 lg:hidden">sourcePath</p>
                    <p className="break-all text-slate-800">{issue.sourcePath}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
                  {issue.photoId ? <p>photoId: {issue.photoId}</p> : null}
                  {issue.outputRelativePath ? (
                    <p className="break-all">출력 상대경로: {issue.outputRelativePath}</p>
                  ) : null}
                  {issue.destinationPath ? (
                    <p className="break-all">대상 경로: {issue.destinationPath}</p>
                  ) : null}
                  <p className="text-xs text-slate-800">{issue.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
