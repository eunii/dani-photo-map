import type { MutableRefObject } from 'react'
import maplibregl from 'maplibre-gl'

import type { MapGroupRecord } from '@presentation/renderer/view-models/map/mapPageSelectors'

import {
  buildGroupMarkerElement,
  getMarkerRenderKey
} from './photoGroupMapMarkerDom'

export interface GroupMarkerBinding {
  groupId: string
  marker: maplibregl.Marker
  element: HTMLButtonElement
  markerKey: string
}

export function clearGroupMarkers(
  markersRef: MutableRefObject<Map<string, GroupMarkerBinding>>
): void {
  for (const binding of markersRef.current.values()) {
    binding.marker.remove()
  }

  markersRef.current.clear()
}

export function updateGroupMarkerPresentation(
  markersRef: MutableRefObject<Map<string, GroupMarkerBinding>>,
  selectedGroupId?: string
): void {
  for (const binding of markersRef.current.values()) {
    const isSelected = binding.groupId === selectedGroupId

    binding.element.className = [
      'relative flex items-center justify-center overflow-hidden rounded-xl border-2 bg-white shadow-lg transition-all',
      isSelected
        ? 'border-blue-500 ring-4 ring-blue-200'
        : 'border-white hover:border-slate-200'
    ].join(' ')
    binding.element.style.display = 'block'
    binding.element.style.zIndex = isSelected ? '3' : '2'
  }
}

function createGroupMarkerBinding(
  map: maplibregl.Map,
  group: MapGroupRecord,
  outputRoot: string | undefined,
  onSelectGroupRef: MutableRefObject<(groupId: string) => void>,
  mapRef: MutableRefObject<maplibregl.Map | null>
): GroupMarkerBinding {
  const markerElement = buildGroupMarkerElement(group, outputRoot, {
    onSelectGroup: (groupId) => onSelectGroupRef.current(groupId),
    getMap: () => mapRef.current
  })
  const marker = new maplibregl.Marker({
    element: markerElement,
    anchor: 'center'
  })
    .setLngLat([group.pinLocation!.longitude, group.pinLocation!.latitude])
    .addTo(map)

  return {
    groupId: group.group.id,
    marker,
    element: markerElement,
    markerKey: getMarkerRenderKey(group, outputRoot)
  }
}

export function syncGroupMarkers(
  map: maplibregl.Map,
  markersRef: MutableRefObject<Map<string, GroupMarkerBinding>>,
  markerGroups: MapGroupRecord[],
  outputRoot: string | undefined,
  onSelectGroupRef: MutableRefObject<(groupId: string) => void>,
  mapRef: MutableRefObject<maplibregl.Map | null>
): void {
  const nextGroupIds = new Set<string>()

  for (const group of markerGroups) {
    if (!group.pinLocation) {
      continue
    }

    nextGroupIds.add(group.group.id)
    const existingBinding = markersRef.current.get(group.group.id)
    const nextMarkerKey = getMarkerRenderKey(group, outputRoot)

    if (existingBinding && existingBinding.markerKey === nextMarkerKey) {
      existingBinding.marker.setLngLat([
        group.pinLocation.longitude,
        group.pinLocation.latitude
      ])
      continue
    }

    existingBinding?.marker.remove()
    markersRef.current.set(
      group.group.id,
      createGroupMarkerBinding(
        map,
        group,
        outputRoot,
        onSelectGroupRef,
        mapRef
      )
    )
  }

  for (const [groupId, binding] of markersRef.current.entries()) {
    if (nextGroupIds.has(groupId)) {
      continue
    }

    binding.marker.remove()
    markersRef.current.delete(groupId)
  }
}
