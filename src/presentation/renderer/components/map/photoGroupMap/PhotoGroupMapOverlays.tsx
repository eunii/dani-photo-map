interface PhotoGroupMapOverlaysProps {
  mapErrorMessage: string | null
  sourceGroupCount: number
}

export function PhotoGroupMapOverlays({
  mapErrorMessage,
  sourceGroupCount
}: PhotoGroupMapOverlaysProps) {
  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-slate-950/80 px-4 py-3 text-xs text-white shadow-lg">
        <p className="font-semibold">Map-based Photo Group Explorer</p>
        <p className="mt-1 text-slate-200">
          그룹 핀, 클러스터, bounds 기반 샘플링으로 탐색합니다.
        </p>
      </div>

      {mapErrorMessage ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95">
          <div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-amber-900">
              지도를 불러오지 못했습니다.
            </p>
            <p className="mt-1 text-sm text-amber-700">
              검색 결과와 그룹 정보는 계속 볼 수 있습니다.
            </p>
            <p className="mt-2 text-xs break-all text-amber-700">
              {mapErrorMessage}
            </p>
          </div>
        </div>
      ) : null}

      {sourceGroupCount === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/10">
          <div className="rounded-2xl bg-white/95 px-6 py-5 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              현재 지도에 표시할 그룹이 없습니다.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              검색을 바꾸거나 날짜 필터를 조정해 보세요.
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
