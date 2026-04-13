import type { ScanPhotoLibrarySummary } from '@shared/types/preload'

type ScanDetailTab =
  | 'inBatchDup'
  | 'incrementalSkip'
  | 'existingSkip'
  | 'warnings'
  | 'failures'

export interface OrganizeScanResultSummaryCardsProps {
  summary: ScanPhotoLibrarySummary
  openScanResultDetail: ScanDetailTab | null
  onToggleDetail: (detail: ScanDetailTab) => void
}

export function OrganizeScanResultSummaryCards({
  summary,
  openScanResultDetail,
  onToggleDetail
}: OrganizeScanResultSummaryCardsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--app-foreground)]">실행 결과</h2>
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
          <p className="text-xl font-semibold text-[var(--app-foreground)]">{summary.keptCount}</p>
        </div>
        <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3">
          <p className="text-xs text-[var(--app-muted)]">신규 복사 수</p>
          <p className="text-xl font-semibold text-[var(--app-foreground)]">{summary.copiedCount}</p>
        </div>
        <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-4 py-3">
          <p className="text-xs text-[var(--app-muted)]">그룹 수</p>
          <p className="text-xl font-semibold text-[var(--app-foreground)]">{summary.groupCount}</p>
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
          onClick={() => onToggleDetail('inBatchDup')}
        >
          <p className="text-xs text-[var(--app-muted)]">중복 (같은 실행 내)</p>
          <p className="text-xl font-semibold text-[var(--app-foreground)]">{summary.duplicateCount}</p>
          <p className="mt-1 text-[11px] text-[var(--app-muted)]">탭하여 쌍 비교</p>
        </button>
        <button
          type="button"
          className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
            openScanResultDetail === 'incrementalSkip'
              ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
              : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
          }`}
          onClick={() => onToggleDetail('incrementalSkip')}
        >
          <p className="text-xs text-[var(--app-muted)]">증분 스킵 (준비 단계)</p>
          <p className="text-xl font-semibold text-[var(--app-foreground)]">
            {summary.skippedUnchangedCount}
          </p>
          <p className="mt-1 text-[11px] text-[var(--app-muted)]">sourcePath + size + mtime 기준</p>
        </button>
        <button
          type="button"
          className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
            openScanResultDetail === 'existingSkip'
              ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
              : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
          }`}
          onClick={() => onToggleDetail('existingSkip')}
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
          onClick={() => onToggleDetail('warnings')}
        >
          <p className="text-xs text-[var(--app-muted)]">경고 수</p>
          <p className="text-xl font-semibold text-[var(--app-foreground)]">{summary.warningCount}</p>
          <p className="mt-1 text-[11px] text-[var(--app-muted)]">탭하여 목록</p>
        </button>
        <button
          type="button"
          className={`rounded-[24px] border px-4 py-3 text-left transition-colors ${
            openScanResultDetail === 'failures'
              ? 'border-[var(--app-accent)] bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface-strong)_82%)] shadow-sm'
              : 'border-[var(--app-border)] bg-[var(--app-surface-strong)] hover:bg-[color:color-mix(in_srgb,var(--app-accent)_8%,var(--app-surface)_92%)]'
          }`}
          onClick={() => onToggleDetail('failures')}
        >
          <p className="text-xs text-[var(--app-muted)]">실패 수</p>
          <p className="text-xl font-semibold text-[var(--app-foreground)]">{summary.failureCount}</p>
          <p className="mt-1 text-[11px] text-[var(--app-muted)]">탭하여 목록</p>
        </button>
      </div>
    </>
  )
}
