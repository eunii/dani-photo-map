import { Button, Input } from '@heroui/react'

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="map-search-input">
            그룹 검색
          </label>
          <Input
            id="map-search-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="그룹명, 지역, 날짜, 파일명으로 검색"
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]"
          />
        </div>
        <div className="flex items-center gap-2">
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
  )
}
