import type { Key } from '@heroui/react'
import { Accordion } from '@heroui/react'
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
  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
    () => new Set<Key>(['filtered-groups'])
  )

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
    <aside className="flex h-[min(68vh,720px)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-[18px] bg-[var(--app-surface-strong)] xl:min-w-[360px]">
      <div className="border-b border-[var(--app-border)] px-2.5 py-2">
        <p className="text-sm font-semibold text-[var(--app-foreground)]">사진 미리보기</p>
        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
          작은 썸네일을 클릭하면 지도 위에 크게 표시됩니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {selectedGroup ? (
          <div className="space-y-2.5">
            <Accordion
              expandedKeys={expandedKeys}
              variant="surface"
              onExpandedChange={setExpandedKeys}
            >
              <Accordion.Item
                id="filtered-groups"
                className="rounded-[16px] bg-[var(--app-surface)] px-1"
              >
                <Accordion.Heading>
                  <Accordion.Trigger className="px-2 py-2.5">
                    <div className="flex flex-1 items-center justify-between gap-3 text-left">
                      <span className="text-sm font-semibold text-[var(--app-foreground)]">
                        검색/필터 결과
                      </span>
                      <span className="text-xs text-[var(--app-muted)]">
                        총 {filteredGroups.length}개
                      </span>
                    </div>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="pt-0">
                    <div className="grid grid-cols-4 gap-1.5 pb-2 sm:grid-cols-5 2xl:grid-cols-6">
                      {filteredGroups.slice(0, 10).map((record) => (
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
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <section className="space-y-2.5 rounded-[16px] bg-[var(--app-surface)] p-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[var(--app-foreground)]">
                    {selectedGroup.displayTitle}
                  </h2>
                  <p className="text-xs text-[var(--app-muted)]">
                    {selectedGroup.dateLabel} · {selectedGroup.regionLabel} · 사진{' '}
                    {selectedGroup.group.photoCount}장
                  </p>
                </div>
                <span className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-muted)]">
                  {selectedGroup.pinLocation ? '지도 연결' : '지도 핀 없음'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 text-xs text-[var(--app-muted)]">
                  <span className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1">
                    정확 GPS {selectedGroup.gpsBreakdown.exactGpsCount}
                  </span>
                  <span className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1">
                    추론 {selectedGroup.gpsBreakdown.inferredGpsCount}
                  </span>
                  <span className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1">
                    누락 {selectedGroup.gpsBreakdown.missingGpsCount}
                  </span>
                  {selectedPhotoPinCount > 0 ? (
                    <span className="rounded-full bg-[var(--app-sidebar-hover)] px-2.5 py-1 text-[var(--app-sidebar-hover-text)]">
                      GPS 사진 {selectedPhotoPinCount}장 · 확대 {photoPinMinZoom.toFixed(1)}+ 에서 개별 핀
                      {selectedPhotoPinCount >= selectedPhotoPinMaxCount
                        ? ` (최대 ${selectedPhotoPinMaxCount}장)`
                        : ''}
                    </span>
                  ) : null}
                </div>

                {groupDetailErrorMessage ? (
                  <p className="rounded-[14px] bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {groupDetailErrorMessage}
                  </p>
                ) : isLoadingGroupDetail ? (
                  <div className="rounded-[14px] bg-[var(--app-surface-strong)] px-3 py-5 text-center text-sm text-[var(--app-muted)]">
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
                  <div className="rounded-[14px] bg-[var(--app-surface-strong)] px-3 py-5 text-center text-sm text-[var(--app-muted)]">
                    이 그룹의 사진을 아직 불러오지 못했습니다.
                  </div>
                )}
              </div>
            </section>

            {unmappedGroups.length > 0 ? (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--app-foreground)]">
                    지도에 없는 그룹
                  </h3>
                  <span className="text-xs text-[var(--app-muted)]">
                    검색으로 선택 가능
                  </span>
                </div>
                <div className="grid gap-2">
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
          <div className="flex h-full min-h-80 items-center justify-center rounded-[16px] bg-[var(--app-surface)] text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--app-foreground)]">
                그룹을 선택하면 사진이 오른쪽에 표시됩니다.
              </p>
              <p className="text-sm text-[var(--app-muted)]">
                지도 핀이나 결과 카드에서 그룹을 선택해 보세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
