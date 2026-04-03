import type { GroupDetail } from '@shared/types/preload'

interface GroupListPanelProps {
  title: string
  description: string
  groups: GroupDetail[]
  selectedGroupId?: string
  hoveredGroupId?: string
  onSelectGroup?: (groupId: string) => void
  onHoverGroup?: (groupId?: string) => void
}

export function GroupListPanel({
  title,
  description,
  groups,
  selectedGroupId,
  hoveredGroupId,
  onSelectGroup,
  onHoverGroup
}: GroupListPanelProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">
          {description}
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
                저장된 인덱스 또는 복구된 출력 결과가 있으면 그룹 카드가 여기에
                표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <article
                key={group.id}
                className={`rounded-xl border p-4 shadow-sm transition ${
                  selectedGroupId === group.id
                    ? 'border-blue-400 bg-blue-50 shadow-blue-100 ring-1 ring-blue-200'
                    : hoveredGroupId === group.id
                      ? 'border-sky-300 bg-sky-50 shadow-sky-100'
                    : 'border-slate-200 bg-white'
                }`}
                onMouseEnter={() => onHoverGroup?.(group.id)}
                onMouseLeave={() => onHoverGroup?.(undefined)}
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
                      <span className="font-medium text-slate-700">기본 제목</span>{' '}
                      {group.displayTitle}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">대표 사진</span>{' '}
                      {group.representativePhotoId ? '선택됨' : '없음'}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">위치</span>{' '}
                      {group.representativeGps ? '지도 가능' : 'GPS 없음'}
                    </p>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      onClick={() => onSelectGroup?.(group.id)}
                    >
                      상세 보기
                    </button>
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
