import type { MutableRefObject } from 'react'
import maplibregl, { type GeoJSONSource } from 'maplibre-gl'

import type { MapGroupRecord } from '@presentation/renderer/view-models/map/mapPageSelectors'
import type { MapViewportBounds } from '@presentation/renderer/view-models/map/mapPageSelectors'

import type {
  GroupFeatureCollection,
  PhotoFeatureCollection,
  PointGeometry
} from './photoGroupMapFeatureCollections'
import {
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
  GROUP_LAYER_ID,
  PHOTO_LAYER_ID,
  PHOTO_SELECTED_LAYER_ID,
  PHOTO_SOURCE_ID,
  SELECTED_LAYER_ID,
  SOURCE_ID
} from './photoGroupMapConstants'
import {
  fitToGroups,
  setSelectedFilter,
  setSelectedPhotoFilter,
  toViewportBounds
} from './photoGroupMapViewport'

export interface PhotoGroupMapLoadContext {
  featureCollectionRef: MutableRefObject<GroupFeatureCollection>
  photoFeatureCollectionRef: MutableRefObject<PhotoFeatureCollection>
  groupsRef: MutableRefObject<MapGroupRecord[]>
  onSelectGroupRef: MutableRefObject<(id: string) => void>
  onSelectPhotoRef: MutableRefObject<(id: string) => void>
  onViewportChangeRef: MutableRefObject<
    (state: { bounds: MapViewportBounds; zoomLevel: number }) => void
  >
  moveDebounceRef: MutableRefObject<number | null>
  unclusteredMinZoomRef: MutableRefObject<number>
  photoMarkerMinZoomRef: MutableRefObject<number>
  hasInitialFitRef: MutableRefObject<boolean>
  initialUnclusteredMinZoom: number
  initialPhotoMarkerMinZoom: number
  initialSelectedGroupId?: string
  initialSelectedPhotoId?: string
  updateMarkerPresentation: () => void
}

export function setupPhotoGroupMapOnLoad(
  map: maplibregl.Map,
  ctx: PhotoGroupMapLoadContext
): void {
  map.on('load', () => {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: ctx.featureCollectionRef.current,
      cluster: true,
      clusterRadius: 54,
      clusterMaxZoom: 13
    })
    map.addSource(PHOTO_SOURCE_ID, {
      type: 'geojson',
      data: ctx.photoFeatureCollectionRef.current
    })

    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#0f172a',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          18,
          10,
          24,
          30,
          30
        ],
        'circle-opacity': 0.88
      }
    })

    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    })

    map.addLayer({
      id: GROUP_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      minzoom: ctx.initialUnclusteredMinZoom,
      paint: {
        'circle-color': '#2563eb',
        'circle-radius': 1,
        'circle-stroke-width': 0,
        'circle-opacity': 0
      }
    })

    map.addLayer({
      id: SELECTED_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['get', 'groupId'], ''],
      minzoom: ctx.initialUnclusteredMinZoom,
      paint: {
        'circle-color': '#1d4ed8',
        'circle-radius': 1,
        'circle-stroke-width': 0,
        'circle-stroke-color': '#bfdbfe',
        'circle-opacity': 0
      }
    })

    map.addLayer({
      id: PHOTO_LAYER_ID,
      type: 'circle',
      source: PHOTO_SOURCE_ID,
      minzoom: ctx.initialPhotoMarkerMinZoom,
      paint: {
        'circle-color': [
          'case',
          ['boolean', ['get', 'isRepresentative'], false],
          '#f59e0b',
          '#0ea5e9'
        ],
        'circle-radius': [
          'case',
          ['boolean', ['get', 'isRepresentative'], false],
          6,
          4.5
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.92
      }
    })

    map.addLayer({
      id: PHOTO_SELECTED_LAYER_ID,
      type: 'circle',
      source: PHOTO_SOURCE_ID,
      filter: ['==', ['get', 'photoId'], ''],
      minzoom: ctx.initialPhotoMarkerMinZoom,
      paint: {
        'circle-color': '#1d4ed8',
        'circle-radius': 9,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#bfdbfe',
        'circle-opacity': 0.34
      }
    })

    map.on('click', CLUSTER_LAYER_ID, async (event) => {
      const feature = event.features?.[0]
      const clusterId = feature?.properties?.cluster_id

      if (!feature || clusterId === undefined) {
        return
      }

      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined

      if (!source) {
        return
      }

      const expansionZoom = await source.getClusterExpansionZoom(clusterId)
      const coordinates = (feature.geometry as PointGeometry).coordinates

      map.easeTo({
        center: [coordinates[0], coordinates[1]],
        zoom: Math.max(expansionZoom, map.getZoom() + 1),
        duration: 500
      })
    })

    map.on('click', GROUP_LAYER_ID, (event) => {
      const feature = event.features?.[0]
      const groupId = feature?.properties?.groupId

      if (typeof groupId === 'string') {
        ctx.onSelectGroupRef.current(groupId)
      }
    })

    map.on('click', PHOTO_LAYER_ID, (event) => {
      const feature = event.features?.[0]
      const photoId = feature?.properties?.photoId
      const coordinates = (feature?.geometry as PointGeometry | undefined)
        ?.coordinates

      if (typeof photoId !== 'string') {
        return
      }

      ctx.onSelectPhotoRef.current(photoId)

      if (!coordinates) {
        return
      }

      map.stop()
      map.easeTo({
        center: [coordinates[0], coordinates[1]],
        zoom: Math.max(
          map.getZoom(),
          ctx.photoMarkerMinZoomRef.current + 0.5
        ),
        duration: 350,
        essential: true
      })
    })

    const setPointerCursor = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const clearPointerCursor = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('mouseenter', CLUSTER_LAYER_ID, setPointerCursor)
    map.on('mouseleave', CLUSTER_LAYER_ID, clearPointerCursor)
    map.on('mouseenter', GROUP_LAYER_ID, setPointerCursor)
    map.on('mouseleave', GROUP_LAYER_ID, clearPointerCursor)
    map.on('mouseenter', PHOTO_LAYER_ID, setPointerCursor)
    map.on('mouseleave', PHOTO_LAYER_ID, clearPointerCursor)

    map.on('move', () => {
      if (ctx.moveDebounceRef.current !== null) {
        window.clearTimeout(ctx.moveDebounceRef.current)
      }

      ctx.moveDebounceRef.current = window.setTimeout(() => {
        ctx.onViewportChangeRef.current({
          bounds: toViewportBounds(map),
          zoomLevel: map.getZoom()
        })
      }, 120)
    })

    setSelectedFilter(map, ctx.initialSelectedGroupId)
    setSelectedPhotoFilter(map, ctx.initialSelectedPhotoId)
    ctx.updateMarkerPresentation()

    ctx.onViewportChangeRef.current({
      bounds: toViewportBounds(map),
      zoomLevel: map.getZoom()
    })

    if (!ctx.hasInitialFitRef.current) {
      fitToGroups(map, ctx.groupsRef.current)
      ctx.hasInitialFitRef.current = true
    }
  })
}
