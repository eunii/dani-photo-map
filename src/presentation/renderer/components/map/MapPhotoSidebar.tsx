import { useEffect, useMemo, useState } from 'react'

import { GroupPhotoGrid, getGpsBadge } from '@presentation/renderer/components/map/GroupPhotoGrid'
import { GroupPreviewCard } from '@presentation/renderer/components/map/GroupPreviewCard'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { GroupDetail } from '@shared/types/preload'
import type { MapGroupRecord } from '@presentation/renderer/view-models/map/mapPageSelectors'

interface MapPhotoSidebarProps {
  outputRoot?: string
  selectedGroup: MapGroupRecord | null
  filteredGroups: MapGroupRecord[]
  unmappedGroups: MapGroupRecord[]
  onSelectGroup: (groupId: string) => void
}

function resolvePreviewPhoto(group?: GroupDetail, selectedPhotoId?: string) {
  if (!group) {
    return undefined
  }

  return (
    group.photos.find((photo) => photo.id === selectedPhotoId) ??
    group.photos.find((photo) => photo.id === group.representativePhotoId) ??
    group.photos[0]
  )
}

export function MapPhotoSidebar({
  outputRoot,
  selectedGroup,
  filteredGroups,
  unmappedGroups,
  onSelectGroup
}: MapPhotoSidebarProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>()

  useEffect(() => {
    const nextDefaultPhotoId =
      selectedGroup?.group.representativePhotoId ?? selectedGroup?.group.photos[0]?.id

    setSelectedPhotoId(nextDefaultPhotoId)
  }, [selectedGroup?.group.id, selectedGroup?.group.photos, selectedGroup?.group.representativePhotoId])

  const previewPhoto = useMemo(
    () => resolvePreviewPhoto(selectedGroup?.group, selectedPhotoId),
    [selectedGroup?.group, selectedPhotoId]
  )

  const previewImageUrl =
    outputRoot &&
    toOutputFileUrl(
      outputRoot,
      previewPhoto?.thumbnailRelativePath ?? previewPhoto?.outputRelativePath
    )

  return (
    <aside className="flex h-[78vh] min-h-[720px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">사진 미리보기</p>
        <p className="mt-1 text-xs text-slate-500">
          작은 썸네일을 클릭하면 위쪽에 크게 표시됩니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {selectedGroup ? (
          <div className="space-y-5">
            <section className="space-y-4 rounded-3xl bg-white p-4">
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

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                <div className="aspect-[4/3] bg-slate-100">
                  {previewImageUrl ? (
                    <img
                      src={previewImageUrl}
                      alt={previewPhoto?.sourceFileName ?? selectedGroup.displayTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      큰 미리보기를 표시할 사진이 없습니다.
                    </div>
                  )}
                </div>
                {previewPhoto ? (
                  <div className="space-y-2 border-t border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {previewPhoto.sourceFileName}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {getGpsBadge(previewPhoto)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      {previewPhoto.regionName ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {previewPhoto.regionName}
                        </span>
                      ) : null}
                      {previewPhoto.capturedAtIso ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {previewPhoto.capturedAtIso}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
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
                </div>

                <GroupPhotoGrid
                  group={selectedGroup.group}
                  outputRoot={outputRoot}
                  compact={false}
                  selectedPhotoId={selectedPhotoId}
                  onPhotoClick={setSelectedPhotoId}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  검색/필터 결과
                </h3>
                <span className="text-xs text-slate-500">
                  총 {filteredGroups.length}개
                </span>
              </div>
              <div className="grid gap-3">
                {filteredGroups.slice(0, 8).map((record) => (
                  <GroupPreviewCard
                    key={record.group.id}
                    record={record}
                    outputRoot={outputRoot}
                    selected={selectedGroup.group.id === record.group.id}
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
          <div className="flex h-full min-h-80 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">
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
