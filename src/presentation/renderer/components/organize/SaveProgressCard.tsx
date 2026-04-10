import { Button } from '@heroui/react'

type SaveGroupPhase = 'idle' | 'queued' | 'saving' | 'done' | 'error'

interface SaveProgressGroupLine {
  key: string
  title: string
  phase: SaveGroupPhase
  linePct: number
}

interface SaveProgressCardProps {
  title: string
  description?: string
  prepareProgressText?: string | null
  overallPct: number
  processedCount: number
  totalCount: number
  groupLines: SaveProgressGroupLine[]
  footerText?: string
  ariaBusy?: boolean
  onCancelRemaining: () => void
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value < 0) {
    return 0
  }
  if (value > 100) {
    return 100
  }

  return Math.round(value)
}

function getPhaseBadgeClassName(phase: SaveGroupPhase): string {
  switch (phase) {
    case 'saving':
      return 'bg-[color:color-mix(in_srgb,var(--app-accent)_18%,var(--app-surface)_82%)] text-[var(--app-accent-strong)]'
    case 'done':
      return 'bg-[color:color-mix(in_srgb,var(--app-accent)_28%,var(--app-surface)_72%)] text-[var(--app-accent-strong)]'
    case 'error':
      return 'bg-[color:color-mix(in_srgb,var(--app-danger)_26%,var(--app-surface)_74%)] text-[var(--app-danger-foreground)]'
    case 'queued':
      return 'bg-[color:color-mix(in_srgb,var(--app-border)_32%,var(--app-surface)_68%)] text-[var(--app-foreground)]'
    case 'idle':
    default:
      return 'bg-[color:color-mix(in_srgb,var(--app-border)_20%,var(--app-surface)_80%)] text-[var(--app-muted)]'
  }
}

function getPhaseLabel(phase: SaveGroupPhase): string {
  switch (phase) {
    case 'queued':
      return '저장 대기'
    case 'saving':
      return '저장 중'
    case 'done':
      return '저장 완료'
    case 'error':
      return '저장 실패'
    default:
      return '미저장'
  }
}

export function SaveProgressCard({
  title,
  description,
  prepareProgressText,
  overallPct,
  processedCount,
  totalCount,
  groupLines,
  footerText,
  ariaBusy = false,
  onCancelRemaining
}: SaveProgressCardProps) {
  const safeOverallPct = clampPercent(overallPct)

  return (
    <section
      className="rounded-[28px] border border-[var(--app-border)] bg-[color:color-mix(in_srgb,var(--app-surface)_94%,var(--theme-background)_6%)] p-5 shadow-[var(--app-shadow)]"
      aria-live="polite"
      aria-busy={ariaBusy}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--app-foreground)]">{title}</h2>
        <Button
          variant="secondary"
          className="shrink-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-xs font-semibold text-[var(--app-foreground)]"
          onPress={onCancelRemaining}
        >
          남은 작업 취소
        </Button>
      </div>
      {description ? (
        <p className="mt-1 text-sm text-[var(--app-muted)]">{description}</p>
      ) : null}
      {prepareProgressText ? (
        <p className="mt-2 text-xs text-[var(--app-muted)]">{prepareProgressText}</p>
      ) : null}

      <p className="mt-2 text-xs font-semibold text-[var(--app-foreground)]">
        전체 진행 {safeOverallPct}%
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--app-border)_42%,transparent)]">
        <div
          className="h-full rounded-full bg-[var(--app-accent-strong)] transition-[width] duration-300"
          style={{ width: `${safeOverallPct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--app-muted)]">
        단위 진행{' '}
        <span className="font-semibold text-[var(--app-foreground)]">{processedCount}</span>{' '}
        / {totalCount} ({safeOverallPct}%)
      </p>

      <div className="mt-3 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <p className="text-xs font-semibold text-[var(--app-foreground)]">그룹별 진행</p>
        <ul className="mt-2 space-y-2">
          {groupLines.map((line) => {
            const safeLinePct = clampPercent(line.linePct)
            return (
              <li key={line.key}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span
                    className="min-w-0 flex-1 truncate font-medium text-[var(--app-foreground)]"
                    title={line.title}
                  >
                    {line.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPhaseBadgeClassName(line.phase)}`}
                  >
                    {safeLinePct}% · {getPhaseLabel(line.phase)}
                    {line.phase === 'saving' ? '…' : ''}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--app-border)_34%,transparent)]">
                  <div
                    className="h-full rounded-full bg-[var(--app-accent)] transition-[width] duration-300"
                    style={{ width: `${safeLinePct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {footerText ? (
        <p className="mt-2 text-xs text-[var(--app-muted)]">{footerText}</p>
      ) : null}
    </section>
  )
}
