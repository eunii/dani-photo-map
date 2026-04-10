import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@heroui/react'

import { MapFilterBar } from '@presentation/renderer/components/map/MapFilterBar'
import { GroupDetailPanel } from '@presentation/renderer/components/GroupDetailPanel'
import { MapPhotoSidebar } from '@presentation/renderer/components/map/MapPhotoSidebar'
import { MapPhotoPreviewOverlay } from '@presentation/renderer/components/map/MapPhotoPreviewOverlay'
import { MapSearchBar } from '@presentation/renderer/components/map/MapSearchBar'
import { PhotoGroupMap } from '@presentation/renderer/components/map/PhotoGroupMap'
import { useDebouncedValue } from '@presentation/renderer/hooks/useDebouncedValue'
import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import { useOutputLibraryIndexPanel } from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { useBrowseMapStore } from '@presentation/renderer/store/useBrowseMapStore'
import {
  buildSelectedGroupPhotoPins,
  buildMapGroupRecords,
  buildRepresentativeMarkerGroups,
  filterMapGroupRecords,
  findSelectedGroupPhotoPin,
  getMapZoomPolicy,
  getQuickFilterDateRange
} from '@presentation/renderer/view-models/map/mapPageSelectors'

interface BrowsePageProps {
  onNavigateToSettings?: () => void
}

const SELECTED_GROUP_PHOTO_PIN_MAX_COUNT = 24
const SELECTED_GROUP_PHOTO_PIN_MIN_ZOOM = 12.5
const FOCUSED_PHOTO_CONTEXT_MIN_ZOOM = 8.5
const MAP_PANEL_MIN_WIDTH = 480
const SIDEBAR_PANEL_MIN_WIDTH = 360
const SIDEBAR_PANEL_MAX_WIDTH = 620
type BrowsePanelTab = 'photos' | 'details'

export function BrowsePage({ onNavigateToSettings }: BrowsePageProps) {
  const {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage,
    setErrorMessage,
    reloadLibraryIndex
  } = useOutputLibraryIndexPanel()
  const searchQuery = useBrowseMapStore((state) => state.searchQuery)
  const quickFilter = useBrowseMapStore((state) => state.quickFilter)
  const dateRange = useBrowseMapStore((state) => state.dateRange)
  const mapBounds = useBrowseMapStore((state) => state.mapBounds)
  const zoomLevel = useBrowseMapStore((state) => state.zoomLevel)
  const selectedGroupId = useBrowseMapStore((state) => state.selectedGroupId)
  const setSearchQuery = useBrowseMapStore((state) => state.setSearchQuery)
  const setQuickFilter = useBrowseMapStore((state) => state.setQuickFilter)
  const setDateRange = useBrowseMapStore((state) => state.setDateRange)
  const setMapBounds = useBrowseMapStore((state) => state.setMapBounds)
  const setZoomLevel = useBrowseMapStore((state) => state.setZoomLevel)
  const setSelectedGroupId = useBrowseMapStore((state) => state.setSelectedGroupId)
  const resetFilters = useBrowseMapStore((state) => state.resetFilters)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 220)
  const [previewPhotoId, setPreviewPhotoId] = useState<string | undefined>()
  const [panelTab, setPanelTab] = useState<BrowsePanelTab>('photos')
  const [sidebarWidth, setSidebarWidth] = useState(420)
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const [isMovingGroupPhotos, setIsMovingGroupPhotos] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const splitLayoutRef = useRef<HTMLDivElement | null>(null)

  const allMapRecords = useMemo(
    () => buildMapGroupRecords(libraryIndex?.groups ?? []),
    [libraryIndex?.groups]
  )
  const filteredRecords = useMemo(
    () =>
      filterMapGroupRecords(allMapRecords, {
        searchQuery: debouncedSearchQuery,
        dateRange
      }),
    [allMapRecords, dateRange, debouncedSearchQuery]
  )
  const mappedRecords = useMemo(
    () => filteredRecords.filter((record) => record.pinLocation),
    [filteredRecords]
  )
  const unmappedRecords = useMemo(
    () => filteredRecords.filter((record) => !record.pinLocation),
    [filteredRecords]
  )
  const selectedGroup = useMemo(
    () => filteredRecords.find((record) => record.group.id === selectedGroupId) ?? null,
    [filteredRecords, selectedGroupId]
  )
  const {
    groupDetail: selectedGroupDetail,
    isLoading: isLoadingGroupDetail,
    errorMessage: groupDetailErrorMessage
  } = useLibraryGroupDetail({
    outputRoot: libraryIndex?.outputRoot ?? outputRoot,
    group: selectedGroup?.group ?? null
  })

  const mapCanvasGroups = useMemo(
    () => mappedRecords,
    [mappedRecords]
  )
  const markerGroups = useMemo(
    () =>
      buildRepresentativeMarkerGroups(filteredRecords, {
        bounds: mapBounds,
        zoomLevel
      }),
    [filteredRecords, mapBounds, zoomLevel]
  )
  const selectedPhotoPins = useMemo(
    () =>
      buildSelectedGroupPhotoPins(selectedGroupDetail, {
        maxPins: SELECTED_GROUP_PHOTO_PIN_MAX_COUNT
      }),
    [selectedGroupDetail]
  )
  const focusedPhotoPin = useMemo(
    () => findSelectedGroupPhotoPin(selectedGroupDetail, previewPhotoId),
    [previewPhotoId, selectedGroupDetail]
  )

  const mapZoomPolicy = useMemo(() => getMapZoomPolicy(zoomLevel), [zoomLevel])

  useEffect(() => {
    if (!outputRoot) {
      setSelectedGroupId(undefined)
      return
    }

    if (filteredRecords.length === 0) {
      setSelectedGroupId(undefined)
      return
    }

    const selectedStillExists = filteredRecords.some(
      (record) => record.group.id === selectedGroupId
    )

    if (selectedStillExists) {
      return
    }

    const preferredGroup = mappedRecords[0] ?? filteredRecords[0] ?? null

    if (preferredGroup) {
      setSelectedGroupId(preferredGroup.group.id)
    }
  }, [
    filteredRecords,
    mappedRecords,
    outputRoot,
    selectedGroupId,
    setSelectedGroupId
  ])

  useEffect(() => {
    if (filteredRecords.length === 1) {
      setSelectedGroupId(filteredRecords[0]?.group.id)
    }
  }, [filteredRecords, setSelectedGroupId])

  useEffect(() => {
    setPreviewPhotoId(undefined)
  }, [selectedGroupId])

  useEffect(() => {
    if (selectedGroupDetail) {
      return
    }

    setPanelTab('photos')
  }, [selectedGroupDetail])

  const handleQuickFilterChange = useCallback((nextFilter: typeof quickFilter): void => {
    setQuickFilter(nextFilter)

    if (nextFilter === 'all') {
      setDateRange({})
      return
    }

    if (nextFilter === 'custom') {
      return
    }

    setDateRange(getQuickFilterDateRange(nextFilter))
  }, [setDateRange, setQuickFilter])

  const handleCustomDateRangeChange = useCallback((nextRange: typeof dateRange): void => {
    setQuickFilter('custom')
    setDateRange(nextRange)
  }, [setDateRange, setQuickFilter])

  const handleSelectGroup = useCallback((groupId: string): void => {
    setSelectedGroupId(groupId)
    setSuccessMessage(null)
  }, [setSelectedGroupId])

  const handleViewportChange = useCallback(
    ({ bounds, zoomLevel: nextZoomLevel }: { bounds: typeof mapBounds; zoomLevel: number }) => {
      setMapBounds(bounds)
      setZoomLevel(nextZoomLevel)
    },
    [setMapBounds, setZoomLevel]
  )

  const handleSaveGroup = useCallback(async (nextGroup: {
    title: string
    companions: string[]
    notes?: string
    representativePhotoId?: string
  }): Promise<void> => {
    const currentGroup = selectedGroupDetail
    const activeOutputRoot = libraryIndex?.outputRoot ?? outputRoot

    if (!currentGroup || !activeOutputRoot) {
      return
    }

    setIsSavingGroup(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      await window.photoApp.updatePhotoGroup({
        outputRoot: activeOutputRoot,
        groupId: currentGroup.id,
        title: nextGroup.title,
        companions: nextGroup.companions,
        notes: nextGroup.notes,
        representativePhotoId: nextGroup.representativePhotoId
      })
      await reloadLibraryIndex()
      setSelectedGroupId(currentGroup.id)
      setSuccessMessage('그룹 메타데이터를 저장했습니다.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '그룹 저장에 실패했습니다.'
      )
    } finally {
      setIsSavingGroup(false)
    }
  }, [
    libraryIndex?.outputRoot,
    outputRoot,
    reloadLibraryIndex,
    selectedGroupDetail,
    setErrorMessage,
    setSelectedGroupId
  ])

  const handleMoveGroupPhotos = useCallback(async (nextMove: {
    sourceGroupId: string
    destinationGroupId: string
    photoIds: string[]
  }): Promise<void> => {
    const activeOutputRoot = libraryIndex?.outputRoot ?? outputRoot

    if (!activeOutputRoot) {
      return
    }

    setIsMovingGroupPhotos(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      await window.photoApp.movePhotosToGroup({
        outputRoot: activeOutputRoot,
        sourceGroupId: nextMove.sourceGroupId,
        destinationGroupId: nextMove.destinationGroupId,
        photoIds: nextMove.photoIds
      })
      await reloadLibraryIndex()
      setSelectedGroupId(nextMove.sourceGroupId)
      setPreviewPhotoId(undefined)
      setSuccessMessage('선택한 사진을 다른 그룹으로 이동했습니다.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 이동에 실패했습니다.'
      )
    } finally {
      setIsMovingGroupPhotos(false)
    }
  }, [
    libraryIndex?.outputRoot,
    outputRoot,
    reloadLibraryIndex,
    setErrorMessage,
    setSelectedGroupId
  ])

  const handleStartSidebarResize = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>): void => {
      const container = splitLayoutRef.current

      if (!container) {
        return
      }

      event.preventDefault()
      const startX = event.clientX
      const startWidth = sidebarWidth

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const deltaX = moveEvent.clientX - startX
        const containerWidth = container.clientWidth
        const maxByContainer = Math.max(
          SIDEBAR_PANEL_MIN_WIDTH,
          containerWidth - MAP_PANEL_MIN_WIDTH - 8
        )
        const clampedWidth = Math.min(
          Math.max(startWidth - deltaX, SIDEBAR_PANEL_MIN_WIDTH),
          Math.min(SIDEBAR_PANEL_MAX_WIDTH, maxByContainer)
        )
        setSidebarWidth(clampedWidth)
      }

      const handleMouseUp = (): void => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [sidebarWidth]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain app-scroll pr-0.5">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {groupDetailErrorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {groupDetailErrorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {!outputRoot ? (
        <div className="rounded-[18px] bg-[var(--app-surface)] p-6 text-center">
          <p className="text-base font-semibold text-[var(--app-foreground)]">
            출력 폴더를 먼저 설정하세요.
          </p>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            설정 탭에서 정리 결과 폴더를 지정하면 바로 탐색할 수 있습니다.
          </p>
          {onNavigateToSettings ? (
            <Button
              variant="primary"
              className="mt-3 rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
              onPress={onNavigateToSettings}
            >
              설정으로 이동
            </Button>
          ) : null}
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col space-y-3">
          <div className="shrink-0 rounded-[18px] bg-[var(--app-surface-strong)] p-2.5">
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:items-stretch lg:gap-3">
              <div className="flex min-h-0 min-w-0 flex-col lg:col-span-6 xl:col-span-7">
                <MapSearchBar
                  value={searchQuery}
                  resultCount={filteredRecords.length}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                />
              </div>
              <div className="flex min-h-0 min-w-0 flex-col gap-2 lg:col-span-6 lg:h-full xl:col-span-5">
                <MapFilterBar
                  section="dates"
                  quickFilter={quickFilter}
                  dateRange={dateRange}
                  onQuickFilterChange={handleQuickFilterChange}
                  onDateRangeChange={handleCustomDateRangeChange}
                  onReset={() => {
                    resetFilters()
                  }}
                />
                <MapFilterBar
                  section="quick"
                  quickFilter={quickFilter}
                  dateRange={dateRange}
                  onQuickFilterChange={handleQuickFilterChange}
                  onDateRangeChange={handleCustomDateRangeChange}
                  onReset={() => {
                    resetFilters()
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5 text-[11px] text-[var(--app-muted)]">
            <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
              필터 결과 {filteredRecords.length}개
            </span>
            <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
              지도 가능 {mappedRecords.length}개
            </span>
            <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
              GPS 없는 그룹 {unmappedRecords.length}개
            </span>
            <span className="rounded-full bg-[var(--app-surface-strong)] px-2 py-0.5">
              대표 핀 {markerGroups.length}개
            </span>
            {searchQuery ? (
              <span className="rounded-full bg-[var(--app-sidebar-hover)] px-2 py-0.5 text-[var(--app-sidebar-hover-text)]">
                검색: {searchQuery}
              </span>
            ) : null}
            {dateRange.start || dateRange.end ? (
              <span className="rounded-full bg-[var(--app-sidebar-hover)] px-2 py-0.5 text-[var(--app-sidebar-hover-text)]">
                날짜: {dateRange.start ?? '시작'} ~ {dateRange.end ?? '종료'}
              </span>
            ) : null}
          </div>

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
                outputRoot={libraryIndex?.outputRoot ?? outputRoot}
                selectedGroupId={selectedGroupId}
                selectedPhotoId={
                  previewPhotoId ??
                  selectedGroupDetail?.representativePhotoId ??
                  selectedPhotoPins[0]?.photoId
                }
                zoomLevel={zoomLevel}
                unclusteredMinZoom={mapZoomPolicy.unclusteredMinZoom}
                photoMarkerMinZoom={SELECTED_GROUP_PHOTO_PIN_MIN_ZOOM}
                focusedPhotoContextMinZoom={FOCUSED_PHOTO_CONTEXT_MIN_ZOOM}
                onSelectGroup={handleSelectGroup}
                onSelectPhoto={setPreviewPhotoId}
                onViewportChange={handleViewportChange}
              />

              <MapPhotoPreviewOverlay
                outputRoot={libraryIndex?.outputRoot ?? outputRoot}
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
              onMouseDown={handleStartSidebarResize}
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
                    outputRoot={libraryIndex?.outputRoot ?? outputRoot}
                    loadSource={loadSource}
                    isSaving={isSavingGroup}
                    isMovingPhotos={isMovingGroupPhotos}
                    onSave={handleSaveGroup}
                    onMovePhotos={handleMoveGroupPhotos}
                  />
                </div>
              ) : (
                <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
                  <MapPhotoSidebar
                    outputRoot={libraryIndex?.outputRoot ?? outputRoot}
                    selectedGroup={selectedGroup}
                    selectedGroupDetail={selectedGroupDetail}
                    selectedPhotoPinCount={selectedPhotoPins.length}
                    selectedPhotoPinMaxCount={SELECTED_GROUP_PHOTO_PIN_MAX_COUNT}
                    photoPinMinZoom={SELECTED_GROUP_PHOTO_PIN_MIN_ZOOM}
                    isLoadingGroupDetail={isLoadingGroupDetail}
                    groupDetailErrorMessage={groupDetailErrorMessage}
                    filteredGroups={filteredRecords}
                    unmappedGroups={unmappedRecords}
                    onSelectGroup={handleSelectGroup}
                    onPreviewPhoto={setPreviewPhotoId}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {isLoadingIndex ? (
        <p className="text-sm text-slate-500">출력 결과를 불러오는 중입니다...</p>
      ) : null}
    </div>
  )
}
