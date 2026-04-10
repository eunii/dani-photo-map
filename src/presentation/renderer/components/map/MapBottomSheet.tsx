import { GroupPhotoGrid } from '@presentation/renderer/components/map/GroupPhotoGrid'
import { GroupPreviewCard } from '@presentation/renderer/components/map/GroupPreviewCard'
import type {
  BottomSheetState,
  MapGroupRecord
} from '@presentation/renderer/view-models/map/mapPageSelectors'

interface MapBottomSheetProps {
  state: BottomSheetState
  outputRoot?: string
  selectedGroup: MapGroupRecord | null
  filteredGroups: MapGroupRecord[]
  unmappedGroups: MapGroupRecord[]
  onSelectGroup: (groupId: string) => void
  onStateChange: (state: BottomSheetState) => void
}

const SHEET_HEIGHT_CLASS: Record<BottomSheetState, string> = {
  collapsed: 'h-20',
  half: 'h-[40vh]',
  full: 'h-[72vh]'
}

function PinSourceLabel({ record }: { record: MapGroupRecord }) {
  if (!record.pinLocation) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
        지도 핀 없음
      </span>
    )
  }

  const label =
    record.pinLocation.source === 'photo-original-gps'
      ? '원본 GPS 기준'
      : record.pinLocation.source === 'photo-gps'
        ? '사진 GPS 기준'
        : '대표 GPS 기준'

  return (
    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
      {label}
    </span>
  )
}

export function MapBottomSheet({
  state,
  outputRoot,
  selectedGroup,
  filteredGroups,
  unmappedGroups,
  onSelectGroup,
  onStateChange
}: MapBottomSheetProps) {
  const showExpanded = state !== 'collapsed'
  const resultCards =
    state === 'full' ? filteredGroups.slice(0, 18) : filteredGroups.slice(0, 8)

  return (
    <div
      className={`absolute inset-x-3 bottom-3 z-20 overflow-hidden rounded-[28px] border border-slate-200 bg-white/98 shadow-2xl transition-all ${SHEET_HEIGHT_CLASS[state]}`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-200" />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                state === 'collapsed'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => onStateChange('collapsed')}
            >
              접기
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                state === 'half'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => onStateChange('half')}
            >
              반쯤
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                state === 'full'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => onStateChange('full')}
            >
              전체
            </button>
          </div>
        </div>

        {!showExpanded ? (
          <div className="flex flex-1 items-center justify-between gap-3 px-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {selectedGroup ? selectedGroup.displayTitle : '사진 그룹 탐색'}
              </p>
              <p className="text-xs text-slate-500">
                결과 {filteredGroups.length}개 · 지도 없는 그룹 {unmappedGroups.length}개
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => onStateChange('half')}
            >
              열기
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {filteredGroups.length === 0 ? (
              <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">
                    조건에 맞는 그룹이 없습니다.
                  </p>
                  <p className="text-sm text-slate-500">
                    검색어를 줄이거나 날짜 필터를 초기화해 보세요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {selectedGroup ? (
                  <section className="space-y-4 rounded-3xl bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <PinSourceLabel record={selectedGroup} />
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                            {selectedGroup.regionLabel}
                          </span>
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">
                            {selectedGroup.displayTitle}
                          </h2>
                          <p className="text-sm text-slate-500">
                            {selectedGroup.dateLabel} · 사진 {selectedGroup.group.photoCount}장
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-white px-2.5 py-1.5">
                          정확 GPS {selectedGroup.gpsBreakdown.exactGpsCount}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1.5">
                          추론 {selectedGroup.gpsBreakdown.inferredGpsCount}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1.5">
                          누락 {selectedGroup.gpsBreakdown.missingGpsCount}
                        </span>
                      </div>
                    </div>

                    <GroupPhotoGrid
                      photos={[]}
                      outputRoot={outputRoot}
                      compact={state !== 'full'}
                    />
                  </section>
                ) : null}

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      검색/필터 결과
                    </h3>
                    <span className="text-xs text-slate-500">
                      총 {filteredGroups.length}개
                    </span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {resultCards.map((record) => (
                      <GroupPreviewCard
                        key={record.group.id}
                        record={record}
                        outputRoot={outputRoot}
                        selected={selectedGroup?.group.id === record.group.id}
                        onClick={onSelectGroup}
                      />
                    ))}
                  </div>
                </section>

                {unmappedGroups.length > 0 ? (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        지도에 없는 그룹
                      </h3>
                      <span className="text-xs text-slate-500">
                        검색으로 계속 접근 가능
                      </span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {unmappedGroups
                        .filter((record) => record.group.id !== selectedGroup?.group.id)
                        .slice(0, state === 'full' ? 12 : 6)
                        .map((record) => (
                          <GroupPreviewCard
                            key={record.group.id}
                            record={record}
                            outputRoot={outputRoot}
                            onClick={onSelectGroup}
                          />
                        ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
