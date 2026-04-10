import { Button } from '@heroui/react'

import { SearchIcon } from '@presentation/renderer/components/app/AppIcons'

interface MapSearchBarProps {
  value: string
  resultCount: number
  onChange: (value: string) => void
  onClear: () => void
}

export function MapSearchBar({
  value,
  resultCount,
  onChange,
  onClear
}: MapSearchBarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 rounded-[16px] bg-[var(--app-surface)] px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          검색
        </span>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="map-search-input">
          그룹 검색
        </label>
        <div className="relative w-full min-w-0">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            id="map-search-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="그룹명, 지역, 날짜, 파일명으로 검색"
            className="h-9 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] pl-9 pr-2.5 text-xs text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)]"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-muted)]">
            결과 {resultCount}
          </span>
          {value ? (
            <Button
              variant="secondary"
              className="h-7 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[11px] font-medium text-[var(--app-foreground)]"
              onPress={onClear}
            >
              지우기
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
