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
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="map-search-input">
            그룹 검색
          </label>
          <input
            id="map-search-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="그룹명, 지역, 날짜, 파일명으로 검색"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
            결과 {resultCount}
          </span>
          {value ? (
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              onClick={onClear}
            >
              지우기
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
