import type { SaveHistoryEntry, SaveHistoryPhase } from '@shared/types/preload'

interface SaveHistoryPanelProps {
  entries: SaveHistoryEntry[]
  isLoading: boolean
}

const PHASE_LABEL: Record<SaveHistoryPhase, string> = {
  completed: '완료',
  failed: '실패',
  cancelled: '취소됨'
}

const PHASE_BADGE_CLASSNAME: Record<SaveHistoryPhase, string> = {
  completed:
    'bg-[color:color-mix(in_srgb,var(--app-accent)_22%,var(--app-surface)_78%)] text-[var(--app-accent-strong)]',
  failed:
    'bg-[color:color-mix(in_srgb,var(--app-danger)_26%,var(--app-surface)_74%)] text-[var(--app-danger-foreground)]',
  cancelled:
    'bg-[color:color-mix(in_srgb,var(--app-border)_32%,var(--app-surface)_68%)] text-[var(--app-foreground)]'
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export function SaveHistoryPanel({ entries, isLoading }: SaveHistoryPanelProps) {
  if (isLoading) {
    return (
      <p className="rounded-[16px] border border-dashed border-[var(--app-border)] p-4 text-center text-xs text-[var(--app-muted)]">
        이력을 불러오는 중…
      </p>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-[16px] border border-dashed border-[var(--app-border)] p-4 text-center text-xs text-[var(--app-muted)]">
        아직 저장한 기록이 없습니다.
      </p>
    )
  }

  return (
    <ul className="app-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
      {entries.map((entry) => (
        <li
          key={entry.jobId}
          className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-[var(--app-foreground)]">
              {formatDateTime(entry.completedAtIso)}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PHASE_BADGE_CLASSNAME[entry.phase]}`}
            >
              {PHASE_LABEL[entry.phase]}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--app-muted)]">
            복사 {entry.copiedCount} · 중복 {entry.duplicateCount} · 스킵{' '}
            {entry.skippedExistingCount} · 경고 {entry.warningCount} · 실패{' '}
            {entry.failureCount}
          </p>
          {entry.message ? (
            <p className="mt-1 text-[11px] text-[var(--app-danger-foreground)]">
              {entry.message}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
