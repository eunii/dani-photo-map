import maplibregl from 'maplibre-gl'

import type {
  MapGroupRecord,
  MapViewportBounds
} from '@presentation/renderer/view-models/map/mapPageSelectors'

import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  PHOTO_SELECTED_LAYER_ID,
  SELECTED_LAYER_ID
} from './photoGroupMapConstants'

export function toViewportBounds(map: maplibregl.Map): MapViewportBounds {
  const bounds = map.getBounds()

  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth()
  }
}

export function setSelectedFilter(
  map: maplibregl.Map,
  selectedGroupId?: string
): void {
  if (!map.getLayer(SELECTED_LAYER_ID)) {
    return
  }

  map.setFilter(
    SELECTED_LAYER_ID,
    selectedGroupId
      ? ['==', ['get', 'groupId'], selectedGroupId]
      : ['==', ['get', 'groupId'], '']
  )
}

export function setSelectedPhotoFilter(
  map: maplibregl.Map,
  selectedPhotoId?: string
): void {
  if (!map.getLayer(PHOTO_SELECTED_LAYER_ID)) {
    return
  }

  map.setFilter(
    PHOTO_SELECTED_LAYER_ID,
    selectedPhotoId
      ? ['==', ['get', 'photoId'], selectedPhotoId]
      : ['==', ['get', 'photoId'], '']
  )
}

export function fitToGroups(map: maplibregl.Map, groups: MapGroupRecord[]): void {
  const mappedGroups = groups.filter((group) => group.pinLocation)

  if (mappedGroups.length === 0) {
    map.easeTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      duration: 500
    })
    return
  }

  if (mappedGroups.length === 1) {
    const pinLocation = mappedGroups[0]?.pinLocation

    if (!pinLocation) {
      return
    }

    map.easeTo({
      center: [pinLocation.longitude, pinLocation.latitude],
      zoom: 6.5,
      duration: 600
    })
    return
  }

  const bounds = new maplibregl.LngLatBounds()

  for (const group of mappedGroups) {
    bounds.extend([group.pinLocation!.longitude, group.pinLocation!.latitude])
  }

  map.fitBounds(bounds, {
    padding: 80,
    duration: 700,
    maxZoom: 6
  })
}
