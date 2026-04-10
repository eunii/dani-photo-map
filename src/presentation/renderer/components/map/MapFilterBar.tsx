import { Button, Input } from '@heroui/react'

import type {
  DateQuickFilter,
  DateRangeFilter
} from '@presentation/renderer/view-models/map/mapPageSelectors'

const QUICK_FILTER_LABELS: Array<{
  id: DateQuickFilter
  label: string
}> = [
  { id: 'all', label: '전체' },
  { id: 'today', label: '오늘' },
  { id: 'this-week', label: '이번 주' },
  { id: 'this-month', label: '이번 달' },
  { id: 'custom', label: '직접 선택' }
]

interface MapFilterBarProps {
  quickFilter: DateQuickFilter
  dateRange: DateRangeFilter
  onQuickFilterChange: (value: DateQuickFilter) => void
  onDateRangeChange: (value: DateRangeFilter) => void
  onReset: () => void
  /** `dates`·`quick`만 렌더(지도 페이지 상단 2열 레이아웃용). 기본 `full`은 날짜+칩 한 카드 */
  section?: 'full' | 'dates' | 'quick'
}

export function MapFilterBar({
  quickFilter,
  dateRange,
  onQuickFilterChange,
  onDateRangeChange,
  onReset,
  section = 'full'
}: MapFilterBarProps) {
  const hasRange = Boolean(dateRange.start || dateRange.end)

  const dateRow = (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
      <label className="flex min-w-0 flex-1 flex-col gap-0.5 sm:max-w-[11.5rem]">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--app-muted)]">
          시작일
        </span>
        <Input
          type="date"
          value={dateRange.start ?? ''}
          onChange={(event) =>
            onDateRangeChange({
              ...dateRange,
              start: event.target.value || undefined
            })
          }
          className="h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-xs"
        />
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-0.5 sm:max-w-[11.5rem]">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--app-muted)]">
          종료일
        </span>
        <Input
          type="date"
          value={dateRange.end ?? ''}
          onChange={(event) =>
            onDateRangeChange({
              ...dateRange,
              end: event.target.value || undefined
            })
          }
          className="h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-xs"
        />
      </label>
    </div>
  )

  const quickRow = (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_FILTER_LABELS.map((filter) => (
        <Button
          key={filter.id}
          variant={quickFilter === filter.id ? 'primary' : 'secondary'}
          className={`h-7 rounded-full px-2.5 text-[11px] font-medium transition ${
            quickFilter === filter.id
              ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
              : 'border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
          }`}
          onPress={() => onQuickFilterChange(filter.id)}
        >
          {filter.label}
        </Button>
      ))}
      {(quickFilter !== 'all' || hasRange) && (
        <Button
          variant="secondary"
          className="h-7 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[11px] font-medium text-[var(--app-foreground)]"
          onPress={onReset}
        >
          필터 초기화
        </Button>
      )}
    </div>
  )

  if (section === 'dates') {
    return (
      <div className="flex flex-col gap-1.5 rounded-[16px] bg-[var(--app-surface)] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          날짜
        </span>
        {dateRow}
      </div>
    )
  }

  if (section === 'quick') {
    return (
      <div className="flex flex-col gap-1.5 rounded-[16px] bg-[var(--app-surface)] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          빠른 필터
        </span>
        {quickRow}
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-[16px] bg-[var(--app-surface)] px-3 py-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          날짜
        </span>
        {dateRow}
      </div>
      <div className="flex flex-col gap-1.5 pt-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          빠른 필터
        </span>
        {quickRow}
      </div>
    </div>
  )
}
