import { MapFilterBar } from '@presentation/renderer/components/map/MapFilterBar'
import { MapSearchBar } from '@presentation/renderer/components/map/MapSearchBar'
import type {
  DateQuickFilter,
  DateRangeFilter,
  MapGroupRecord
} from '@presentation/renderer/view-models/map/mapPageSelectors'

interface BrowsePageSearchFiltersSectionProps {
  searchQuery: string
  filteredRecords: MapGroupRecord[]
  quickFilter: DateQuickFilter
  dateRange: DateRangeFilter
  mappedRecordsLength: number
  unmappedRecordsLength: number
  markerGroupsLength: number
  onSearchChange: (value: string) => void
  onSearchClear: () => void
  onQuickFilterChange: (next: DateQuickFilter) => void
  onDateRangeChange: (next: DateRangeFilter) => void
  onResetFilters: () => void
}

export function BrowsePageSearchFiltersSection({
  searchQuery,
  filteredRecords,
  quickFilter,
  dateRange,
  mappedRecordsLength,
  unmappedRecordsLength,
  markerGroupsLength,
  onSearchChange,
  onSearchClear,
  onQuickFilterChange,
  onDateRangeChange,
  onResetFilters
}: BrowsePageSearchFiltersSectionProps) {
  return (
    <>
      <div className="shrink-0 rounded-[18px] bg-[var(--app-surface-strong)] p-2.5">
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:items-stretch lg:gap-3">
          <div className="flex min-h-0 min-w-0 flex-col lg:col-span-6 xl:col-span-7">
            <MapSearchBar
              value={searchQuery}
              resultCount={filteredRecords.length}
              onChange={onSearchChange}
              onClear={onSearchClear}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col gap-2 lg:col-span-6 lg:h-full xl:col-span-5">
            <MapFilterBar
              section="dates"
              quickFilter={quickFilter}
              dateRange={dateRange}
              onQuickFilterChange={onQuickFilterChange}
              onDateRangeChange={onDateRangeChange}
              onReset={onResetFilters}
            />
            <MapFilterBar
              section="quick"
              quickFilter={quickFilter}
              dateRange={dateRange}
              onQuickFilterChange={onQuickFilterChange}
              onDateRangeChange={onDateRangeChange}
              onReset={onResetFilters}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 text-[11px] text-[var(--app-muted)]">
        <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
          필터 결과 {filteredRecords.length}개
        </span>
        <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
          지도 가능 {mappedRecordsLength}개
        </span>
        <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
          GPS 없는 그룹 {unmappedRecordsLength}개
        </span>
        <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
          대표 핀 {markerGroupsLength}개
        </span>
        {searchQuery ? (
          <span className="rounded-full bg-[var(--app-sidebar-hover)] px-2 py-0.5 text-[var(--app-sidebar-hover-text)]">
            검색: {searchQuery}
          </span>
        ) : null}
        {dateRange.start || dateRange.end ? (
          <span className="rounded-full bg-[var(--app-sidebar-hover)] px-2 py-0.5 text-[var(--app-sidebar-hover-text)]">
            날짜: {dateRange.start ?? '시작'} ~ {dateRange.end ?? '종료'}
          </span>
        ) : null}
      </div>
    </>
  )
}
