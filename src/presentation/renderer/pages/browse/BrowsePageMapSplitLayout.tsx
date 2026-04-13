import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react'

import { GroupDetailPanel } from '@presentation/renderer/components/GroupDetailPanel'
import { MapPhotoSidebar } from '@presentation/renderer/components/map/MapPhotoSidebar'
import { MapPhotoPreviewOverlay } from '@presentation/renderer/components/map/MapPhotoPreviewOverlay'
import { PhotoGroupMap } from '@presentation/renderer/components/map/PhotoGroupMap'
import type {
  GroupDetail,
  LibraryIndexLoadSource,
  LibraryIndexView
} from '@shared/types/preload'
import type {
  MapGroupRecord,
  MapPhotoPinRecord,
  MapViewportBounds
} from '@presentation/renderer/view-models/map/mapPageSelectors'
import {
  FOCUSED_PHOTO_CONTEXT_MIN_ZOOM,
  SELECTED_GROUP_PHOTO_PIN_MAX_COUNT,
  SELECTED_GROUP_PHOTO_PIN_MIN_ZOOM,
  type BrowsePanelTab
} from './browsePageConstants'

interface BrowsePageMapSplitLayoutProps {
  splitLayoutRef: RefObject<HTMLDivElement | null>
  sidebarWidth: number
  outputRoot: string | undefined
  libraryIndex: LibraryIndexView | null | undefined
  loadSource: LibraryIndexLoadSource | null
  mapCanvasGroups: MapGroupRecord[]
  markerGroups: MapGroupRecord[]
  selectedPhotoPins: MapPhotoPinRecord[]
  focusedPhotoPin: MapPhotoPinRecord | null | undefined
  selectedGroupId: string | undefined
  previewPhotoId: string | undefined
  selectedGroupDetail: GroupDetail | null
  zoomLevel: number
  mapZoomPolicyUnclusteredMinZoom: number
  filteredRecords: MapGroupRecord[]
  unmappedRecords: MapGroupRecord[]
  selectedGroup: MapGroupRecord | null
  isLoadingGroupDetail: boolean
  groupDetailErrorMessage: string | null | undefined
  panelTab: BrowsePanelTab
  setPanelTab: (tab: BrowsePanelTab) => void
  setPreviewPhotoId: (id: string | undefined) => void
  isSavingGroup: boolean
  isMovingGroupPhotos: boolean
  onSelectGroup: (groupId: string) => void
  onViewportChange: (state: {
    bounds: MapViewportBounds
    zoomLevel: number
  }) => void
  onSaveGroup: (next: {
    title: string
    companions: string[]
    notes?: string
    representativePhotoId?: string
  }) => Promise<void>
  onMoveGroupPhotos: (next: {
    sourceGroupId: string
    destinationGroupId: string
    photoIds: string[]
  }) => Promise<void>
  onStartSidebarResize: (event: ReactMouseEvent<HTMLButtonElement>) => void
}

export function BrowsePageMapSplitLayout({
  splitLayoutRef,
  sidebarWidth,
  outputRoot,
  libraryIndex,
  loadSource,
  mapCanvasGroups,
  markerGroups,
  selectedPhotoPins,
  focusedPhotoPin,
  selectedGroupId,
  previewPhotoId,
  selectedGroupDetail,
  zoomLevel,
  mapZoomPolicyUnclusteredMinZoom,
  filteredRecords,
  unmappedRecords,
  selectedGroup,
  isLoadingGroupDetail,
  groupDetailErrorMessage,
  panelTab,
  setPanelTab,
  setPreviewPhotoId,
  isSavingGroup,
  isMovingGroupPhotos,
  onSelectGroup,
  onViewportChange,
  onSaveGroup,
  onMoveGroupPhotos,
  onStartSidebarResize
}: BrowsePageMapSplitLayoutProps) {
  const activeOutputRoot = libraryIndex?.outputRoot ?? outputRoot

  return (
    <div
      ref={splitLayoutRef}
      className="flex min-h-0 flex-1 flex-col gap-2 xl:flex-row xl:items-stretch"
      style={
        {
          '--browse-sidebar-width': `${sidebarWidth}px`
        } as CSSProperties
      }
    >
      <div className="relative h-[min(68vh,720px)] min-h-[520px] overflow-hidden rounded-[18px] bg-[var(--app-surface-strong)] xl:min-w-[480px] xl:flex-1">
        <PhotoGroupMap
          sourceGroups={mapCanvasGroups}
          markerGroups={markerGroups}
          selectedPhotoPins={selectedPhotoPins}
          focusedPhotoPin={focusedPhotoPin ?? undefined}
          outputRoot={activeOutputRoot}
          selectedGroupId={selectedGroupId}
          selectedPhotoId={
            previewPhotoId ??
            selectedGroupDetail?.representativePhotoId ??
            selectedPhotoPins[0]?.photoId
          }
          zoomLevel={zoomLevel}
          unclusteredMinZoom={mapZoomPolicyUnclusteredMinZoom}
          photoMarkerMinZoom={SELECTED_GROUP_PHOTO_PIN_MIN_ZOOM}
          focusedPhotoContextMinZoom={FOCUSED_PHOTO_CONTEXT_MIN_ZOOM}
          onSelectGroup={onSelectGroup}
          onSelectPhoto={setPreviewPhotoId}
          onViewportChange={onViewportChange}
        />

        <MapPhotoPreviewOverlay
          outputRoot={activeOutputRoot}
          group={selectedGroupDetail ?? undefined}
          photoId={previewPhotoId}
          onChangePhoto={setPreviewPhotoId}
          onClose={() => setPreviewPhotoId(undefined)}
        />
      </div>

      <button
        type="button"
        aria-label="사이드바 너비 조절"
        className="hidden shrink-0 cursor-col-resize rounded-full border border-[var(--app-border)] bg-[var(--app-surface)]/90 px-1 text-[10px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-strong)] xl:block"
        onMouseDown={onStartSidebarResize}
      >
        ⋮
      </button>

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2 overflow-hidden xl:max-h-[min(68vh,720px)] xl:min-h-[520px] xl:min-w-[360px] xl:w-[var(--browse-sidebar-width)] xl:flex-none">
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
              panelTab === 'photos'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                : 'bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
            }`}
            onClick={() => setPanelTab('photos')}
          >
            사진 미리보기
          </button>
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
              panelTab === 'details'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
                : 'bg-[var(--app-surface-strong)] text-[var(--app-foreground)]'
            }`}
            onClick={() => setPanelTab('details')}
            disabled={!selectedGroupDetail}
          >
            그룹 상세 편집
          </button>
        </div>
        {panelTab === 'details' ? (
          <div className="app-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <GroupDetailPanel
              group={selectedGroupDetail ?? undefined}
              allGroups={(libraryIndex?.groups ?? []).map((group) => ({
                id: group.id,
                title: group.title,
                photoCount: group.photoCount,
                representativeGps: group.representativeGps
              }))}
              outputRoot={activeOutputRoot}
              loadSource={loadSource}
              isSaving={isSavingGroup}
              isMovingPhotos={isMovingGroupPhotos}
              onSave={onSaveGroup}
              onMovePhotos={onMoveGroupPhotos}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
            <MapPhotoSidebar
              outputRoot={activeOutputRoot}
              selectedGroup={selectedGroup}
              selectedGroupDetail={selectedGroupDetail ?? null}
              selectedPhotoPinCount={selectedPhotoPins.length}
              selectedPhotoPinMaxCount={SELECTED_GROUP_PHOTO_PIN_MAX_COUNT}
              photoPinMinZoom={SELECTED_GROUP_PHOTO_PIN_MIN_ZOOM}
              isLoadingGroupDetail={isLoadingGroupDetail}
              groupDetailErrorMessage={groupDetailErrorMessage}
              filteredGroups={filteredRecords}
              unmappedGroups={unmappedRecords}
              onSelectGroup={onSelectGroup}
              onPreviewPhoto={setPreviewPhotoId}
            />
          </div>
        )}
      </div>
    </div>
  )
}
