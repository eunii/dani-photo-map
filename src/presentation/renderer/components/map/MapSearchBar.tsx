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
    <div className="rounded-[16px] bg-[var(--app-surface)] px-3 py-2">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="map-search-input">
            그룹 검색
          </label>
          <div className="relative w-full min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              id="map-search-input"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="그룹명, 지역, 날짜, 파일명으로 검색"
              className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] pl-10 pr-3 text-sm text-[var(--app-foreground)] outline-none"
            />
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">
            <span className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-xs font-medium text-[var(--app-muted)]">
              결과 {resultCount}
            </span>
            {value ? (
              <Button
                variant="secondary"
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-medium text-[var(--app-foreground)]"
                onPress={onClear}
              >
                지우기
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
