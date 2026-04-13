import {
  Badge,
  Button,
  ScrollShadow,
  SearchField,
  Tooltip
} from '@heroui/react'

interface DashboardFolderToolbarProps {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedYear: 'all' | string
  onSelectYear: (year: 'all' | string) => void
  yearOptions: string[]
  visibleCount: number
  filteredCount: number
}

export function DashboardFolderToolbar({
  searchQuery,
  onSearchQueryChange,
  selectedYear,
  onSelectYear,
  yearOptions,
  visibleCount,
  filteredCount
}: DashboardFolderToolbarProps) {
  return (
    <div className="w-full min-w-0 border-b border-[var(--app-border)] px-1.5 py-1 sm:px-2">
      <div className="grid w-full min-w-0 grid-cols-2 gap-1 sm:gap-1.5">
        <div className="flex min-h-7 min-w-0 max-w-full items-center gap-0.5 sm:min-w-0">
          <SearchField
            aria-label="폴더 경로 검색"
            value={searchQuery}
            onChange={onSearchQueryChange}
            className="min-w-0 w-full flex-1 basis-0"
          >
            <SearchField.Group className="border-0 bg-transparent shadow-none ring-0 ring-offset-0 outline-none">
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="검색 — 경로·제목·지역 등"
                className="h-7 w-full min-w-0 border-0 bg-transparent text-[13px] shadow-none ring-0 ring-offset-0 outline-none focus-visible:ring-0"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                size="sm"
                className="h-7 w-7 shrink-0 rounded-md border-0 bg-transparent text-[var(--app-muted)]"
                aria-label="검색 범위 안내"
              >
                <span className="text-[12px] font-semibold">?</span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content className="max-w-xs text-xs">
              경로·제목·지역·동행·메모 등으로 검색합니다.
            </Tooltip.Content>
          </Tooltip>
          <Badge
            size="sm"
            variant="soft"
            className="hidden max-w-[5rem] shrink-0 truncate tabular-nums sm:inline-flex"
          >
            {visibleCount.toLocaleString()} / {filteredCount.toLocaleString()}
          </Badge>
        </div>

        <ScrollShadow
          orientation="horizontal"
          size={20}
          className="min-h-7 min-w-0 w-full"
          hideScrollBar={false}
        >
          <div className="flex h-7 w-max max-w-full min-w-0 flex-nowrap items-center gap-1 pr-0.5">
            <Button
              variant={selectedYear === 'all' ? 'primary' : 'secondary'}
              className={`h-7 shrink-0 rounded-full px-2 text-[12px] font-medium ${
                selectedYear === 'all'
                  ? 'bg-[var(--app-button)] text-[var(--app-button-foreground)]'
                  : 'border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
              }`}
              onPress={() => onSelectYear('all')}
            >
              전체
            </Button>
            {yearOptions.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? 'primary' : 'secondary'}
                className={`h-7 shrink-0 rounded-full px-2 text-[12px] font-medium ${
                  selectedYear === year
                    ? 'bg-[var(--app-button)] text-[var(--app-button-foreground)]'
                    : 'border border-[var(--app-border)] bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
                }`}
                onPress={() => onSelectYear(year)}
              >
                {year}
              </Button>
            ))}
          </div>
        </ScrollShadow>

        <div className="col-span-2 flex justify-end sm:hidden">
          <Badge size="sm" variant="soft" className="tabular-nums">
            {visibleCount.toLocaleString()} / {filteredCount.toLocaleString()}
          </Badge>
        </div>
      </div>
    </div>
  )
}
