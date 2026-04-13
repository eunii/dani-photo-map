import type { MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useDebouncedValue } from '@presentation/renderer/hooks/useDebouncedValue'
import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import { useOutputLibraryIndexPanel } from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { useBrowseMapStore } from '@presentation/renderer/store/useBrowseMapStore'
import type {
  DateQuickFilter,
  DateRangeFilter,
  MapViewportBounds
} from '@presentation/renderer/view-models/map/mapPageSelectors'
import {
  buildSelectedGroupPhotoPins,
  buildMapGroupRecords,
  buildRepresentativeMarkerGroups,
  filterMapGroupRecords,
  findSelectedGroupPhotoPin,
  getMapZoomPolicy,
  getQuickFilterDateRange
} from '@presentation/renderer/view-models/map/mapPageSelectors'

import {
  MAP_PANEL_MIN_WIDTH,
  SELECTED_GROUP_PHOTO_PIN_MAX_COUNT,
  SIDEBAR_PANEL_MAX_WIDTH,
  SIDEBAR_PANEL_MIN_WIDTH,
  type BrowsePanelTab
} from './browsePageConstants'

export function useBrowsePage() {
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
    () =>
      filteredRecords.find((record) => record.group.id === selectedGroupId) ??
      null,
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

  const mapCanvasGroups = useMemo(() => mappedRecords, [mappedRecords])
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

  const handleQuickFilterChange = useCallback(
    (nextFilter: DateQuickFilter): void => {
      setQuickFilter(nextFilter)

      if (nextFilter === 'all') {
        setDateRange({})
        return
      }

      if (nextFilter === 'custom') {
        return
      }

      setDateRange(getQuickFilterDateRange(nextFilter))
    },
    [setDateRange, setQuickFilter]
  )

  const handleCustomDateRangeChange = useCallback(
    (nextRange: DateRangeFilter): void => {
      setQuickFilter('custom')
      setDateRange(nextRange)
    },
    [setDateRange, setQuickFilter]
  )

  const handleSelectGroup = useCallback(
    (groupId: string): void => {
      setSelectedGroupId(groupId)
      setSuccessMessage(null)
    },
    [setSelectedGroupId]
  )

  const handleViewportChange = useCallback(
    ({
      bounds,
      zoomLevel: nextZoomLevel
    }: {
      bounds: MapViewportBounds
      zoomLevel: number
    }) => {
      setMapBounds(bounds)
      setZoomLevel(nextZoomLevel)
    },
    [setMapBounds, setZoomLevel]
  )

  const handleSaveGroup = useCallback(
    async (nextGroup: {
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
    },
    [
      libraryIndex?.outputRoot,
      outputRoot,
      reloadLibraryIndex,
      selectedGroupDetail,
      setErrorMessage,
      setSelectedGroupId
    ]
  )

  const handleMoveGroupPhotos = useCallback(
    async (nextMove: {
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
    },
    [
      libraryIndex?.outputRoot,
      outputRoot,
      reloadLibraryIndex,
      setErrorMessage,
      setSelectedGroupId
    ]
  )

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

  return {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage,
    groupDetailErrorMessage,
    successMessage,
    searchQuery,
    setSearchQuery,
    quickFilter,
    dateRange,
    zoomLevel,
    selectedGroupId,
    resetFilters,
    filteredRecords,
    mappedRecords,
    unmappedRecords,
    selectedGroup,
    selectedGroupDetail,
    isLoadingGroupDetail,
    mapCanvasGroups,
    markerGroups,
    selectedPhotoPins,
    focusedPhotoPin,
    previewPhotoId,
    setPreviewPhotoId,
    panelTab,
    setPanelTab,
    sidebarWidth,
    splitLayoutRef,
    mapZoomPolicy,
    isSavingGroup,
    isMovingGroupPhotos,
    handleQuickFilterChange,
    handleCustomDateRangeChange,
    handleSelectGroup,
    handleViewportChange,
    handleSaveGroup,
    handleMoveGroupPhotos,
    handleStartSidebarResize
  }
}
