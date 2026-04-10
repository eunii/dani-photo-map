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
}

export function MapFilterBar({
  quickFilter,
  dateRange,
  onQuickFilterChange,
  onDateRangeChange,
  onReset
}: MapFilterBarProps) {
  const hasRange = Boolean(dateRange.start || dateRange.end)

  return (
    <div className="space-y-2 rounded-[16px] bg-[var(--app-surface)] px-3 py-2">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTER_LABELS.map((filter) => (
          <Button
            key={filter.id}
            variant={quickFilter === filter.id ? 'primary' : 'secondary'}
            className={`rounded-full px-3 text-xs font-medium transition ${
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
            className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-medium text-[var(--app-foreground)]"
            onPress={onReset}
          >
            필터 초기화
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--app-muted)]">시작일</span>
          <Input
            type="date"
            value={dateRange.start ?? ''}
            onChange={(event) =>
              onDateRangeChange({
                ...dateRange,
                start: event.target.value || undefined
              })
            }
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[var(--app-muted)]">종료일</span>
          <Input
            type="date"
            value={dateRange.end ?? ''}
            onChange={(event) =>
              onDateRangeChange({
                ...dateRange,
                end: event.target.value || undefined
              })
            }
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]"
          />
        </label>
      </div>
    </div>
  )
}
