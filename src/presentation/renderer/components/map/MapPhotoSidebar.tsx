import { useEffect, useState } from 'react'

import { GroupPhotoGrid } from '@presentation/renderer/components/map/GroupPhotoGrid'
import { GroupPreviewCard } from '@presentation/renderer/components/map/GroupPreviewCard'
import type { MapGroupRecord } from '@presentation/renderer/view-models/map/mapPageSelectors'
import type { GroupDetail } from '@shared/types/preload'

interface MapPhotoSidebarProps {
  outputRoot?: string
  selectedGroup: MapGroupRecord | null
  selectedGroupDetail: GroupDetail | null
  selectedPhotoPinCount: number
  selectedPhotoPinMaxCount: number
  photoPinMinZoom: number
  isLoadingGroupDetail?: boolean
  groupDetailErrorMessage?: string | null
  filteredGroups: MapGroupRecord[]
  unmappedGroups: MapGroupRecord[]
  onSelectGroup: (groupId: string) => void
  onPreviewPhoto: (photoId: string) => void
}

export function MapPhotoSidebar({
  outputRoot,
  selectedGroup,
  selectedGroupDetail,
  selectedPhotoPinCount,
  selectedPhotoPinMaxCount,
  photoPinMinZoom,
  isLoadingGroupDetail = false,
  groupDetailErrorMessage = null,
  filteredGroups,
  unmappedGroups,
  onSelectGroup,
  onPreviewPhoto
}: MapPhotoSidebarProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>()
  const [isFilteredGroupsExpanded, setIsFilteredGroupsExpanded] = useState(true)

  useEffect(() => {
    const nextDefaultPhotoId =
      selectedGroupDetail?.representativePhotoId ?? selectedGroupDetail?.photos[0]?.id

    setSelectedPhotoId(nextDefaultPhotoId)
  }, [
    selectedGroup?.group.id,
    selectedGroupDetail?.photos,
    selectedGroupDetail?.representativePhotoId
  ])

  return (
    <aside className="flex h-[min(68vh,720px)] min-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 xl:min-w-[420px]">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">사진 미리보기</p>
        <p className="mt-1 text-xs text-slate-500">
          작은 썸네일을 클릭하면 지도 위에 크게 표시됩니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {selectedGroup ? (
          <div className="space-y-5">
            <section className="space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left"
                aria-expanded={isFilteredGroupsExpanded}
                aria-controls="filtered-groups-panel"
                onClick={() =>
                  setIsFilteredGroupsExpanded((expanded) => !expanded)
                }
              >
                <span className="text-sm font-semibold text-slate-900">
                  검색/필터 결과
                </span>
                <span className="text-xs text-slate-500">
                  총 {filteredGroups.length}개 ·{' '}
                  {isFilteredGroupsExpanded ? '접기' : '펼치기'}
                </span>
              </button>
              {isFilteredGroupsExpanded ? (
                <div
                  id="filtered-groups-panel"
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4 2xl:grid-cols-5"
                >
                  {filteredGroups.slice(0, 8).map((record) => (
                    <GroupPreviewCard
                      key={record.group.id}
                      record={record}
                      outputRoot={outputRoot}
                      selected={selectedGroup.group.id === record.group.id}
                      onClick={onSelectGroup}
                      compact
                    />
                  ))}
                </div>
              ) : null}
            </section>

            <section className="space-y-4 rounded-2xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {selectedGroup.displayTitle}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedGroup.dateLabel} · {selectedGroup.regionLabel} · 사진{' '}
                    {selectedGroup.group.photoCount}장
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {selectedGroup.pinLocation ? '지도 연결' : '지도 핀 없음'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1.5">
                    정확 GPS {selectedGroup.gpsBreakdown.exactGpsCount}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1.5">
                    추론 {selectedGroup.gpsBreakdown.inferredGpsCount}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1.5">
                    누락 {selectedGroup.gpsBreakdown.missingGpsCount}
                  </span>
                  {selectedPhotoPinCount > 0 ? (
                    <span className="rounded-full bg-sky-50 px-2.5 py-1.5 text-sky-700">
                      GPS 사진 {selectedPhotoPinCount}장 · 확대 {photoPinMinZoom.toFixed(1)}+ 에서 개별 핀
                      {selectedPhotoPinCount >= selectedPhotoPinMaxCount
                        ? ` (최대 ${selectedPhotoPinMaxCount}장)`
                        : ''}
                    </span>
                  ) : null}
                </div>

                {groupDetailErrorMessage ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                    {groupDetailErrorMessage}
                  </p>
                ) : isLoadingGroupDetail ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                    그룹 사진을 불러오는 중입니다…
                  </div>
                ) : selectedGroupDetail ? (
                  <GroupPhotoGrid
                    photos={selectedGroupDetail.photos}
                    outputRoot={outputRoot}
                    compact={false}
                    selectedPhotoId={selectedPhotoId}
                    onPhotoClick={(photoId) => {
                      setSelectedPhotoId(photoId)
                      onPreviewPhoto(photoId)
                    }}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500">
                    이 그룹의 사진을 아직 불러오지 못했습니다.
                  </div>
                )}
              </div>
            </section>

            {unmappedGroups.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    지도에 없는 그룹
                  </h3>
                  <span className="text-xs text-slate-500">
                    검색으로 선택 가능
                  </span>
                </div>
                <div className="grid gap-3">
                  {unmappedGroups
                    .filter((record) => record.group.id !== selectedGroup.group.id)
                    .slice(0, 6)
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
        ) : (
          <div className="flex h-full min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                그룹을 선택하면 사진이 오른쪽에 표시됩니다.
              </p>
              <p className="text-sm text-slate-500">
                지도 핀이나 결과 카드에서 그룹을 선택해 보세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
