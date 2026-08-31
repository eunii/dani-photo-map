import { useMemo } from 'react'

import type { FileOutcomePayload, FileOutcomeStatus } from '@shared/types/preload'

interface OrganizeFileOutcomeLogPanelProps {
  entries: FileOutcomePayload[]
  /** 화면에 그릴 최대 행 수 — 리스트가 매우 길어져도 렌더 비용을 제한한다. */
  maxVisibleRows?: number
}

const STATUS_LABEL: Record<FileOutcomeStatus, string> = {
  saved: '성공',
  duplicate: '중복(이번 배치)',
  'existing-output-duplicate': '이미 있음',
  failed: '실패'
}

const STATUS_BADGE_CLASSNAME: Record<FileOutcomeStatus, string> = {
  saved:
    'bg-[color:color-mix(in_srgb,var(--app-accent)_22%,var(--app-surface)_78%)] text-[var(--app-accent-strong)]',
  duplicate:
    'bg-[color:color-mix(in_srgb,var(--app-border)_32%,var(--app-surface)_68%)] text-[var(--app-foreground)]',
  'existing-output-duplicate':
    'bg-[color:color-mix(in_srgb,var(--app-border)_32%,var(--app-surface)_68%)] text-[var(--app-foreground)]',
  failed:
    'bg-[color:color-mix(in_srgb,var(--app-danger)_26%,var(--app-surface)_74%)] text-[var(--app-danger-foreground)]'
}

export function summarizeFileOutcomeLog(entries: FileOutcomePayload[]): Record<
  FileOutcomeStatus,
  number
> {
  const counts: Record<FileOutcomeStatus, number> = {
    saved: 0,
    duplicate: 0,
    'existing-output-duplicate': 0,
    failed: 0
  }

  for (const entry of entries) {
    counts[entry.status] += 1
  }

  return counts
}

export function OrganizeFileOutcomeLogPanel({
  entries,
  maxVisibleRows = 300
}: OrganizeFileOutcomeLogPanelProps) {
  const counts = useMemo(() => summarizeFileOutcomeLog(entries), [entries])
  const visibleEntries = useMemo(
    () => entries.slice(Math.max(0, entries.length - maxVisibleRows)).reverse(),
    [entries, maxVisibleRows]
  )
  const hiddenCount = entries.length - visibleEntries.length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-[color:color-mix(in_srgb,var(--app-accent)_16%,var(--app-surface)_84%)] px-2 py-1 font-medium text-[var(--app-accent-strong)]">
          성공 {counts.saved}
        </span>
        <span className="rounded-full bg-[color:color-mix(in_srgb,var(--app-border)_28%,var(--app-surface)_72%)] px-2 py-1 font-medium text-[var(--app-foreground)]">
          중복 {counts.duplicate + counts['existing-output-duplicate']}
        </span>
        <span className="rounded-full bg-[color:color-mix(in_srgb,var(--app-danger)_22%,var(--app-surface)_78%)] px-2 py-1 font-medium text-[var(--app-danger-foreground)]">
          실패 {counts.failed}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-[var(--app-border)] p-4 text-center text-xs text-[var(--app-muted)]">
          아직 처리된 파일이 없습니다.
        </p>
      ) : (
        <ul className="app-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {visibleEntries.map((entry, index) => (
            <li
              key={`${entry.photoId ?? entry.sourcePath}-${index}`}
              className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--app-foreground)]"
                  title={entry.sourcePath}
                >
                  {entry.sourceFileName}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_CLASSNAME[entry.status]}`}
                >
                  {STATUS_LABEL[entry.status]}
                </span>
              </div>
              {entry.status === 'failed' && entry.message ? (
                <p className="mt-1 text-[11px] text-[var(--app-danger-foreground)]">
                  {entry.message}
                </p>
              ) : null}
            </li>
          ))}
          {hiddenCount > 0 ? (
            <li className="px-1 py-1 text-center text-[11px] text-[var(--app-muted)]">
              이전 {hiddenCount}건은 더 오래된 기록이라 생략했습니다 (전체 개수는 위 배지에 반영됨).
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
