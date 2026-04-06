import { useCallback, useEffect, useMemo, useState } from 'react'

import { MapFilterBar } from '@presentation/renderer/components/map/MapFilterBar'
import { MapPhotoSidebar } from '@presentation/renderer/components/map/MapPhotoSidebar'
import { MapPhotoPreviewOverlay } from '@presentation/renderer/components/map/MapPhotoPreviewOverlay'
import { MapSearchBar } from '@presentation/renderer/components/map/MapSearchBar'
import { PhotoGroupMap } from '@presentation/renderer/components/map/PhotoGroupMap'
import { useDebouncedValue } from '@presentation/renderer/hooks/useDebouncedValue'
import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import { useOutputLibraryIndexPanel } from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { useBrowseMapStore } from '@presentation/renderer/store/useBrowseMapStore'
import {
  buildMapGroupRecords,
  buildRepresentativeMarkerGroups,
  filterMapGroupRecords,
  getMapZoomPolicy,
  getQuickFilterDateRange
} from '@presentation/renderer/view-models/map/mapPageSelectors'

interface BrowsePageProps {
  onNavigateToSettings?: () => void
}

export function BrowsePage({ onNavigateToSettings }: BrowsePageProps) {
  const {
    outputRoot,
    libraryIndex,
    isLoadingIndex,
    errorMessage
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
  }, [setSelectedGroupId])

  const handleViewportChange = useCallback(
    ({ bounds, zoomLevel: nextZoomLevel }: { bounds: typeof mapBounds; zoomLevel: number }) => {
      setMapBounds(bounds)
      setZoomLevel(nextZoomLevel)
    },
    [setMapBounds, setZoomLevel]
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          지도
        </h2>
        <p className="text-sm text-slate-600">
          그룹 단위로 사진을 탐색합니다.
        </p>
      </div>

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

      {!outputRoot ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-900">
            출력 폴더를 먼저 설정하세요.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            설정 탭에서 정리 결과 폴더를 지정하면 바로 탐색할 수 있습니다.
          </p>
          {onNavigateToSettings ? (
            <button
              type="button"
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={onNavigateToSettings}
            >
              설정으로 이동
            </button>
          ) : null}
        </div>
      ) : (
        <section className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <MapSearchBar
              value={searchQuery}
              resultCount={filteredRecords.length}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />

            <MapFilterBar
              quickFilter={quickFilter}
              dateRange={dateRange}
              onQuickFilterChange={handleQuickFilterChange}
              onDateRangeChange={handleCustomDateRangeChange}
              onReset={() => {
                resetFilters()
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              필터 결과 {filteredRecords.length}개
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              지도 가능 {mappedRecords.length}개
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              GPS 없는 그룹 {unmappedRecords.length}개
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              대표 핀 {markerGroups.length}개
            </span>
            {searchQuery ? (
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                검색: {searchQuery}
              </span>
            ) : null}
            {dateRange.start || dateRange.end ? (
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                날짜: {dateRange.start ?? '시작'} ~ {dateRange.end ?? '종료'}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,560px)]">
            <div className="relative h-[min(68vh,720px)] min-h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <PhotoGroupMap
                sourceGroups={mapCanvasGroups}
                markerGroups={markerGroups}
                outputRoot={libraryIndex?.outputRoot ?? outputRoot}
                selectedGroupId={selectedGroupId}
                unclusteredMinZoom={mapZoomPolicy.unclusteredMinZoom}
                onSelectGroup={handleSelectGroup}
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

            <MapPhotoSidebar
              outputRoot={libraryIndex?.outputRoot ?? outputRoot}
              selectedGroup={selectedGroup}
              selectedGroupDetail={selectedGroupDetail}
              isLoadingGroupDetail={isLoadingGroupDetail}
              groupDetailErrorMessage={groupDetailErrorMessage}
              filteredGroups={filteredRecords}
              unmappedGroups={unmappedRecords}
              onSelectGroup={handleSelectGroup}
              onPreviewPhoto={setPreviewPhotoId}
            />
          </div>
        </section>
      )}

      {isLoadingIndex ? (
        <p className="text-sm text-slate-500">출력 결과를 불러오는 중입니다...</p>
      ) : null}
    </div>
  )
}
