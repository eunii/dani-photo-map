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
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTER_LABELS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`rounded-full px-3 py-2 text-xs font-medium transition ${
              quickFilter === filter.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => onQuickFilterChange(filter.id)}
          >
            {filter.label}
          </button>
        ))}
        {(quickFilter !== 'all' || hasRange) && (
          <button
            type="button"
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            onClick={onReset}
          >
            필터 초기화
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">시작일</span>
          <input
            type="date"
            value={dateRange.start ?? ''}
            onChange={(event) =>
              onDateRangeChange({
                ...dateRange,
                start: event.target.value || undefined
              })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">종료일</span>
          <input
            type="date"
            value={dateRange.end ?? ''}
            onChange={(event) =>
              onDateRangeChange({
                ...dateRange,
                end: event.target.value || undefined
              })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
        </label>
      </div>
    </div>
  )
}
