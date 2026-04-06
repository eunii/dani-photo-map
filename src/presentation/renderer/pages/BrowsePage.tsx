import { useCallback, useEffect, useMemo, useState } from 'react'

import { MapFilterBar } from '@presentation/renderer/components/map/MapFilterBar'
import { MapPhotoSidebar } from '@presentation/renderer/components/map/MapPhotoSidebar'
import { MapPhotoPreviewOverlay } from '@presentation/renderer/components/map/MapPhotoPreviewOverlay'
import { MapSearchBar } from '@presentation/renderer/components/map/MapSearchBar'
import { PhotoGroupMap } from '@presentation/renderer/components/map/PhotoGroupMap'
import { useDebouncedValue } from '@presentation/renderer/hooks/useDebouncedValue'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { useBrowseMapStore } from '@presentation/renderer/store/useBrowseMapStore'
import {
  buildMapGroupRecords,
  buildRepresentativeMarkerGroups,
  filterMapGroupRecords,
  getMapZoomPolicy,
  getQuickFilterDateRange
} from '@presentation/renderer/view-models/map/mapPageSelectors'

export function BrowsePage() {
  const {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage,
    selectOutputRoot,
    reloadLibraryIndex
  } = useOutputLibraryIndexPanel()
  const sourceBadge = getLoadSourceBadge(loadSource)
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
    <div className="space-y-5">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          지도 기반 사진 그룹 탐색
        </h1>
        <p className="max-w-4xl text-base leading-7 text-slate-600">
          지도는 사진 개별 좌표가 아니라 그룹 탐색을 위한 메인 인터페이스입니다.
          검색과 날짜 필터가 지도와 바텀시트에 함께 반영되고, GPS 없는 사진도
          그룹 안에서 함께 탐색할 수 있습니다.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">출력 폴더</h2>
            <p className="min-h-12 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              {outputRoot || '아직 선택되지 않았습니다.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!outputRoot || isLoadingIndex}
              onClick={() => void reloadLibraryIndex()}
            >
              {isLoadingIndex ? '불러오는 중...' : '다시 불러오기'}
            </button>
          </div>
        </div>
      </section>

      {sourceBadge ? (
        <section className={`rounded-2xl border px-4 py-3 text-sm ${sourceBadge.tone}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold">
              {sourceBadge.label}
            </span>
            <p>{sourceBadge.description}</p>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!outputRoot ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-base font-semibold text-slate-900">
            조회할 출력 폴더를 선택하세요.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            기존 정리 결과가 있는 폴더를 선택하면 지도 탐색 화면을 바로
            불러옵니다.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
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

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="relative h-[78vh] min-h-[720px]">
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
                group={selectedGroup?.group}
                photoId={previewPhotoId}
                onChangePhoto={setPreviewPhotoId}
                onClose={() => setPreviewPhotoId(undefined)}
              />
            </div>

            <MapPhotoSidebar
              outputRoot={libraryIndex?.outputRoot ?? outputRoot}
              selectedGroup={selectedGroup}
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
