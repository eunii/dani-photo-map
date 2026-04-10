import type { Key } from '@heroui/react'
import { Accordion } from '@heroui/react'
import { useEffect, useState } from 'react'

import { ChevronDownIcon } from '@presentation/renderer/components/app/AppIcons'
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

  const isFilteredResultsOpen = expandedKeys.has('filtered-groups')

  return (
    <aside className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-[var(--app-surface-strong)] xl:min-w-[360px]">
      <div className="app-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
        {selectedGroup ? (
          <div className="space-y-2.5">
            <Accordion
              expandedKeys={expandedKeys}
              variant="surface"
              onExpandedChange={setExpandedKeys}
            >
              <Accordion.Item
                id="filtered-groups"
                className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_1px_0_color-mix(in_srgb,var(--app-border)_80%,transparent)]"
              >
                <Accordion.Heading>
                  <Accordion.Trigger className="w-full rounded-[14px] px-2 py-2.5 text-left hover:bg-[var(--app-surface-strong)]/60">
                    <div className="flex w-full items-start gap-2">
                      <ChevronDownIcon
                        aria-hidden
                        className={`mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)] transition-transform duration-200 ${
                          isFilteredResultsOpen ? 'rotate-180' : ''
                        }`}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[12px] font-semibold text-[var(--app-foreground)]">
                            검색/필터 결과
                          </span>
                          <span className="shrink-0 rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-muted)]">
                            총 {filteredGroups.length}개
                          </span>
                        </div>
                      </div>
                    </div>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel className="border-t border-[var(--app-border)]/80">
                  <Accordion.Body className="px-2 pb-2 pt-1">
                    <div className="grid grid-cols-4 gap-1.5 pb-1 sm:grid-cols-5 2xl:grid-cols-6">
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
                  <h2 className="text-sm font-semibold leading-snug text-[var(--app-foreground)]">
                    {selectedGroup.displayTitle}
                  </h2>
                  <p className="text-[11px] text-[var(--app-muted)]">
                    {selectedGroup.dateLabel} · {selectedGroup.regionLabel} · 사진{' '}
                    {selectedGroup.group.photoCount}장
                  </p>
                </div>
                <span className="rounded-full bg-[var(--app-surface-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--app-muted)]">
                  {selectedGroup.pinLocation ? '지도 연결' : '지도 핀 없음'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--app-muted)]">
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
                  <p className="rounded-[14px] bg-red-50 px-3 py-2 text-[12px] text-red-700">
                    {groupDetailErrorMessage}
                  </p>
                ) : isLoadingGroupDetail ? (
                  <div className="rounded-[14px] bg-[var(--app-surface-strong)] px-3 py-4 text-center text-[12px] text-[var(--app-muted)]">
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
                  <div className="rounded-[14px] bg-[var(--app-surface-strong)] px-3 py-4 text-center text-[12px] text-[var(--app-muted)]">
                    이 그룹의 사진을 아직 불러오지 못했습니다.
                  </div>
                )}
              </div>
            </section>

            {unmappedGroups.length > 0 ? (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold text-[var(--app-foreground)]">
                    지도에 없는 그룹
                  </h3>
                  <span className="text-[11px] text-[var(--app-muted)]">
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
          <div className="flex min-h-[12rem] items-center justify-center rounded-[16px] bg-[var(--app-surface)] px-3 text-center">
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-[var(--app-foreground)]">
                그룹을 선택하면 여기에 사진이 표시됩니다.
              </p>
              <p className="text-[11px] text-[var(--app-muted)]">
                지도 핀이나 위 결과 카드에서 그룹을 선택해 보세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
