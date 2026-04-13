import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource } from 'maplibre-gl'

import type { MapGroupRecord } from '@presentation/renderer/view-models/map/mapPageSelectors'

import {
  buildFeatureCollection,
  buildPhotoFeatureCollection,
  type GroupFeatureCollection,
  type PhotoFeatureCollection
} from './photoGroupMapFeatureCollections'
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  GROUP_LAYER_ID,
  PHOTO_LAYER_ID,
  PHOTO_SELECTED_LAYER_ID,
  PHOTO_SOURCE_ID,
  SELECTED_LAYER_ID,
  SOURCE_ID
} from './photoGroupMapConstants'
import { createMapBaseRasterStyle } from './photoGroupMapBaseStyle'
import { buildFocusedPhotoMarkerElement } from './photoGroupMapMarkerDom'
import {
  clearGroupMarkers,
  type GroupMarkerBinding,
  syncGroupMarkers,
  updateGroupMarkerPresentation
} from './photoGroupMapMarkers'
import type { PhotoGroupMapProps } from './photoGroupMapProps'
import { setupPhotoGroupMapOnLoad } from './setupPhotoGroupMapOnLoad'
import {
  fitToGroups,
  setSelectedFilter,
  setSelectedPhotoFilter
} from './photoGroupMapViewport'

interface FocusedPhotoMarkerBinding {
  photoId: string
  marker: maplibregl.Marker
}

export function usePhotoGroupMap(props: PhotoGroupMapProps) {
  const {
    sourceGroups,
    markerGroups,
    selectedPhotoPins,
    focusedPhotoPin,
    outputRoot,
    selectedGroupId,
    selectedPhotoId,
    zoomLevel,
    unclusteredMinZoom,
    photoMarkerMinZoom,
    focusedPhotoContextMinZoom,
    onSelectGroup,
    onSelectPhoto,
    onViewportChange
  } = props

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, GroupMarkerBinding>>(new Map())
  const focusedPhotoMarkerRef = useRef<FocusedPhotoMarkerBinding | null>(null)
  const moveDebounceRef = useRef<number | null>(null)
  const hasInitialFitRef = useRef(false)
  const onSelectGroupRef = useRef(onSelectGroup)
  const onSelectPhotoRef = useRef(onSelectPhoto)
  const onViewportChangeRef = useRef(onViewportChange)
  const featureCollection = useMemo(
    () => buildFeatureCollection(sourceGroups),
    [sourceGroups]
  )
  const photoFeatureCollection = useMemo(
    () => buildPhotoFeatureCollection(selectedPhotoPins),
    [selectedPhotoPins]
  )
  const groupsRef = useRef<MapGroupRecord[]>(sourceGroups)
  const featureCollectionRef = useRef<GroupFeatureCollection>(featureCollection)
  const photoFeatureCollectionRef =
    useRef<PhotoFeatureCollection>(photoFeatureCollection)
  const lastSelectedGroupIdRef = useRef<string | undefined>(undefined)
  const lastFocusedPhotoIdRef = useRef<string | undefined>(undefined)
  const unclusteredMinZoomRef = useRef(unclusteredMinZoom)
  const photoMarkerMinZoomRef = useRef(photoMarkerMinZoom)
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null)

  groupsRef.current = sourceGroups
  featureCollectionRef.current = featureCollection
  photoFeatureCollectionRef.current = photoFeatureCollection
  onSelectGroupRef.current = onSelectGroup
  onSelectPhotoRef.current = onSelectPhoto
  onViewportChangeRef.current = onViewportChange
  unclusteredMinZoomRef.current = unclusteredMinZoom
  photoMarkerMinZoomRef.current = photoMarkerMinZoom

  function clearFocusedPhotoMarker(): void {
    focusedPhotoMarkerRef.current?.marker.remove()
    focusedPhotoMarkerRef.current = null
  }

  function updateMarkerPresentation(): void {
    updateGroupMarkerPresentation(markersRef, selectedGroupId)
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: createMapBaseRasterStyle(),
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')

      setupPhotoGroupMapOnLoad(map, {
        featureCollectionRef,
        photoFeatureCollectionRef,
        groupsRef,
        onSelectGroupRef,
        onSelectPhotoRef,
        onViewportChangeRef,
        moveDebounceRef,
        unclusteredMinZoomRef,
        photoMarkerMinZoomRef,
        hasInitialFitRef,
        initialUnclusteredMinZoom: unclusteredMinZoom,
        initialPhotoMarkerMinZoom: photoMarkerMinZoom,
        initialSelectedGroupId: selectedGroupId,
        initialSelectedPhotoId: selectedPhotoId,
        updateMarkerPresentation
      })

      map.on('error', (event) => {
        const nextMessage =
          event.error instanceof Error
            ? event.error.message
            : '지도를 불러오는 중 오류가 발생했습니다.'

        setMapErrorMessage(nextMessage)
      })

      mapRef.current = map
    } catch (error) {
      setMapErrorMessage(
        error instanceof Error ? error.message : '지도를 초기화하지 못했습니다.'
      )
    }

    return () => {
      if (moveDebounceRef.current !== null) {
        window.clearTimeout(moveDebounceRef.current)
      }

      clearGroupMarkers(markersRef)
      clearFocusedPhotoMarker()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded() || !map.getSource(SOURCE_ID)) {
      return
    }

    const source = map.getSource(SOURCE_ID) as GeoJSONSource
    source.setData(featureCollection)
    const photoSource = map.getSource(PHOTO_SOURCE_ID) as GeoJSONSource | undefined
    photoSource?.setData(photoFeatureCollection)

    if (!hasInitialFitRef.current) {
      fitToGroups(map, sourceGroups)
      hasInitialFitRef.current = true
    }
  }, [featureCollection, photoFeatureCollection, sourceGroups])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    syncGroupMarkers(
      map,
      markersRef,
      markerGroups,
      outputRoot,
      onSelectGroupRef,
      mapRef
    )
    updateMarkerPresentation()

    window.requestAnimationFrame(() => {
      updateMarkerPresentation()
    })
  }, [markerGroups, outputRoot])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    if (map.getLayer(GROUP_LAYER_ID)) {
      map.setLayerZoomRange(GROUP_LAYER_ID, unclusteredMinZoom, 24)
    }

    if (map.getLayer(SELECTED_LAYER_ID)) {
      map.setLayerZoomRange(SELECTED_LAYER_ID, unclusteredMinZoom, 24)
    }

    if (map.getLayer(PHOTO_LAYER_ID)) {
      map.setLayerZoomRange(PHOTO_LAYER_ID, photoMarkerMinZoom, 24)
    }

    if (map.getLayer(PHOTO_SELECTED_LAYER_ID)) {
      map.setLayerZoomRange(PHOTO_SELECTED_LAYER_ID, photoMarkerMinZoom, 24)
    }

    updateMarkerPresentation()
  }, [photoMarkerMinZoom, unclusteredMinZoom])

  useEffect(() => {
    updateMarkerPresentation()
  }, [selectedGroupId])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    if (!focusedPhotoPin || zoomLevel < focusedPhotoContextMinZoom) {
      clearFocusedPhotoMarker()
      return
    }

    if (focusedPhotoMarkerRef.current?.photoId === focusedPhotoPin.photoId) {
      focusedPhotoMarkerRef.current.marker.setLngLat([
        focusedPhotoPin.longitude,
        focusedPhotoPin.latitude
      ])
      return
    }

    clearFocusedPhotoMarker()

    const markerElement = buildFocusedPhotoMarkerElement(
      focusedPhotoPin,
      outputRoot,
      {
        onSelectPhoto: (photoId) => onSelectPhotoRef.current(photoId)
      }
    )
    const marker = new maplibregl.Marker({
      element: markerElement,
      anchor: 'bottom'
    })
      .setLngLat([focusedPhotoPin.longitude, focusedPhotoPin.latitude])
      .addTo(map)

    focusedPhotoMarkerRef.current = {
      photoId: focusedPhotoPin.photoId,
      marker
    }
  }, [
    focusedPhotoPin?.latitude,
    focusedPhotoPin?.longitude,
    focusedPhotoPin?.outputRelativePath,
    focusedPhotoPin?.photoId,
    focusedPhotoPin?.thumbnailRelativePath,
    focusedPhotoContextMinZoom,
    outputRoot,
    zoomLevel
  ])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    setSelectedPhotoFilter(map, selectedPhotoId)
  }, [selectedPhotoId])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    if (!focusedPhotoPin) {
      lastFocusedPhotoIdRef.current = undefined
      return
    }

    if (lastFocusedPhotoIdRef.current === focusedPhotoPin.photoId) {
      return
    }

    lastFocusedPhotoIdRef.current = focusedPhotoPin.photoId
    map.stop()
    map.easeTo({
      center: [focusedPhotoPin.longitude, focusedPhotoPin.latitude],
      zoom: Math.max(map.getZoom(), photoMarkerMinZoom + 0.75),
      bearing: 0,
      pitch: 0,
      duration: 420,
      essential: true
    })
  }, [
    focusedPhotoPin?.latitude,
    focusedPhotoPin?.longitude,
    focusedPhotoPin?.photoId,
    photoMarkerMinZoom
  ])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded() || !focusedPhotoPin) {
      return
    }

    if (zoomLevel < focusedPhotoContextMinZoom) {
      return
    }

    map.stop()
    map.easeTo({
      center: [focusedPhotoPin.longitude, focusedPhotoPin.latitude],
      zoom: map.getZoom(),
      duration: 180,
      essential: true
    })
  }, [
    focusedPhotoContextMinZoom,
    focusedPhotoPin?.latitude,
    focusedPhotoPin?.longitude,
    focusedPhotoPin?.photoId,
    zoomLevel
  ])

  const selectedGroup = useMemo(
    () => sourceGroups.find((group) => group.group.id === selectedGroupId),
    [sourceGroups, selectedGroupId]
  )

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    setSelectedFilter(map, selectedGroupId)
    setSelectedPhotoFilter(map, selectedPhotoId)

    if (!selectedGroup?.pinLocation) {
      lastSelectedGroupIdRef.current = selectedGroupId
      updateMarkerPresentation()
      return
    }

    if (lastSelectedGroupIdRef.current === selectedGroupId) {
      updateMarkerPresentation()
      return
    }

    lastSelectedGroupIdRef.current = selectedGroupId
    updateMarkerPresentation()
    map.stop()

    map.easeTo({
      center: [
        selectedGroup.pinLocation.longitude,
        selectedGroup.pinLocation.latitude
      ],
      zoom: 12,
      bearing: 0,
      pitch: 0,
      duration: 650,
      essential: true
    })
  }, [
    selectedGroup?.pinLocation?.latitude,
    selectedGroup?.pinLocation?.longitude,
    selectedGroupId,
    selectedPhotoId
  ])

  return {
    containerRef,
    mapErrorMessage,
    sourceGroupCount: sourceGroups.length
  }
}
