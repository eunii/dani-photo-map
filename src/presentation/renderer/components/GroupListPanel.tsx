import type { MapGroupSummary } from '@shared/types/preload'

interface GroupListPanelProps {
  groups: MapGroupSummary[]
}

export function GroupListPanel({ groups }: GroupListPanelProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">그룹 패널</h2>
        <p className="text-xs text-slate-500">
          지도에 표시된 대표 그룹 요약입니다.
        </p>
      </div>

      <div className="h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                아직 그룹이 없습니다.
              </p>
              <p className="text-sm text-slate-600">
                GPS가 있는 사진을 정리하면 그룹 카드가 여기에 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <article
                key={group.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {group.title}
                    </h3>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {group.photoCount}장
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-700">위도</span>{' '}
                      {group.latitude.toFixed(5)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">경도</span>{' '}
                      {group.longitude.toFixed(5)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
