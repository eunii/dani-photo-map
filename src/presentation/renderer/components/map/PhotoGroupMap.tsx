import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type StyleSpecification } from 'maplibre-gl'

import type {
  MapGroupRecord,
  MapViewportBounds
} from '@presentation/renderer/view-models/map/mapPageSelectors'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'

interface PhotoGroupMapProps {
  sourceGroups: MapGroupRecord[]
  markerGroups: MapGroupRecord[]
  outputRoot?: string
  selectedGroupId?: string
  unclusteredMinZoom: number
  onSelectGroup: (groupId: string) => void
  onViewportChange: (state: {
    bounds: MapViewportBounds
    zoomLevel: number
  }) => void
}

interface GroupFeatureProperties {
  groupId: string
  title: string
  photoCount: number
  score: number
  regionLabel: string
}

interface PointGeometry {
  type: 'Point'
  coordinates: [number, number]
}

interface GroupFeature {
  type: 'Feature'
  geometry: PointGeometry
  properties: GroupFeatureProperties
}

interface GroupFeatureCollection {
  type: 'FeatureCollection'
  features: GroupFeature[]
}

const DEFAULT_CENTER: [number, number] = [127.0, 30.0]
const DEFAULT_ZOOM = 1.6
const SOURCE_ID = 'photo-groups'
const CLUSTER_LAYER_ID = 'photo-group-clusters'
const CLUSTER_COUNT_LAYER_ID = 'photo-group-cluster-count'
const GROUP_LAYER_ID = 'photo-group-points'
const SELECTED_LAYER_ID = 'photo-group-selected'

interface GroupMarkerBinding {
  groupId: string
  marker: maplibregl.Marker
  element: HTMLButtonElement
}

function createMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm'
      }
    ]
  }
}

function buildFeatureCollection(
  groups: MapGroupRecord[]
): GroupFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: groups
      .filter((group) => group.pinLocation)
      .map(
        (group): GroupFeature => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              group.pinLocation!.longitude,
              group.pinLocation!.latitude
            ]
          },
          properties: {
            groupId: group.group.id,
            title: group.displayTitle,
            photoCount: group.group.photoCount,
            score: group.score,
            regionLabel: group.regionLabel
          }
        })
      )
  }
}

function toViewportBounds(map: maplibregl.Map): MapViewportBounds {
  const bounds = map.getBounds()

  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth()
  }
}

function setSelectedFilter(map: maplibregl.Map, selectedGroupId?: string): void {
  if (!map.getLayer(SELECTED_LAYER_ID)) {
    return
  }

  map.setFilter(
    SELECTED_LAYER_ID,
    selectedGroupId ? ['==', ['get', 'groupId'], selectedGroupId] : ['==', ['get', 'groupId'], '']
  )
}

function fitToGroups(map: maplibregl.Map, groups: MapGroupRecord[]): void {
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

export function PhotoGroupMap({
  sourceGroups,
  markerGroups,
  outputRoot,
  selectedGroupId,
  unclusteredMinZoom,
  onSelectGroup,
  onViewportChange
}: PhotoGroupMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<GroupMarkerBinding[]>([])
  const moveDebounceRef = useRef<number | null>(null)
  const hasInitialFitRef = useRef(false)
  const onSelectGroupRef = useRef(onSelectGroup)
  const onViewportChangeRef = useRef(onViewportChange)
  const featureCollection = useMemo(
    () => buildFeatureCollection(sourceGroups),
    [sourceGroups]
  )
  const groupsRef = useRef<MapGroupRecord[]>(sourceGroups)
  const featureCollectionRef = useRef(featureCollection)
  const lastSelectedGroupIdRef = useRef<string | undefined>(undefined)
  const unclusteredMinZoomRef = useRef(unclusteredMinZoom)
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null)

  groupsRef.current = sourceGroups
  featureCollectionRef.current = featureCollection
  onSelectGroupRef.current = onSelectGroup
  onViewportChangeRef.current = onViewportChange
  unclusteredMinZoomRef.current = unclusteredMinZoom

  function clearMarkers(): void {
    for (const binding of markersRef.current) {
      binding.marker.remove()
    }

    markersRef.current = []
  }

  function updateMarkerPresentation(): void {
    for (const binding of markersRef.current) {
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

  function buildMarkerElement(group: MapGroupRecord): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-label', group.displayTitle)
    button.style.width = '58px'
    button.style.height = '58px'
    button.style.transformOrigin = 'center center'
    button.style.backgroundColor = '#e2e8f0'

    const thumbnailUrl = outputRoot
      ? toOutputFileUrl(
          outputRoot,
          group.group.representativeThumbnailRelativePath ??
            group.group.photos[0]?.thumbnailRelativePath ??
            group.group.photos[0]?.outputRelativePath
        )
      : undefined

    const placeholder = document.createElement('div')
    placeholder.className =
      'flex h-full w-full items-center justify-center bg-slate-200 text-[10px] font-semibold tracking-wide text-slate-700'
    placeholder.textContent = 'PHOTO'
    button.appendChild(placeholder)

    if (thumbnailUrl) {
      const image = document.createElement('img')
      image.src = thumbnailUrl
      image.alt = group.displayTitle
      image.className = 'absolute inset-0 h-full w-full object-cover'
      image.loading = 'lazy'
      image.addEventListener('load', () => {
        placeholder.style.display = 'none'
      })
      image.addEventListener('error', () => {
        image.remove()
        placeholder.style.display = 'flex'
      })
      button.appendChild(image)
    }

    button.addEventListener('click', () => {
      onSelectGroupRef.current(group.group.id)

      if (!group.pinLocation) {
        return
      }

      const map = mapRef.current

      if (!map) {
        return
      }

      map.stop()
      map.easeTo({
        center: [group.pinLocation.longitude, group.pinLocation.latitude],
        zoom: Math.min(map.getZoom() + 1.25, 17),
        duration: 450,
        essential: true
      })
    })

    return button
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: createMapStyle(),
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')

      map.on('load', () => {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: featureCollectionRef.current,
          cluster: true,
          clusterRadius: 54,
          clusterMaxZoom: 13
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
          minzoom: unclusteredMinZoom,
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
          minzoom: unclusteredMinZoom,
          paint: {
            'circle-color': '#1d4ed8',
            'circle-radius': 1,
            'circle-stroke-width': 0,
            'circle-stroke-color': '#bfdbfe',
            'circle-opacity': 0
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
              onSelectGroupRef.current(groupId)
          }
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

        map.on('move', () => {
          updateMarkerPresentation()

          if (moveDebounceRef.current !== null) {
            window.clearTimeout(moveDebounceRef.current)
          }

          moveDebounceRef.current = window.setTimeout(() => {
            onViewportChangeRef.current({
              bounds: toViewportBounds(map),
              zoomLevel: map.getZoom()
            })
          }, 120)
        })

        map.on('zoom', () => {
          updateMarkerPresentation()
        })

        updateMarkerPresentation()

        onViewportChangeRef.current({
          bounds: toViewportBounds(map),
          zoomLevel: map.getZoom()
        })

        if (!hasInitialFitRef.current) {
          fitToGroups(map, groupsRef.current)
          hasInitialFitRef.current = true
        }
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

      clearMarkers()
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
    clearMarkers()

    for (const group of markerGroups) {
      if (!group.pinLocation) {
        continue
      }

      const markerElement = buildMarkerElement(group)
      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center'
      })
        .setLngLat([group.pinLocation.longitude, group.pinLocation.latitude])
        .addTo(map)

      markersRef.current.push({
        groupId: group.group.id,
        marker,
        element: markerElement
      })
    }

    updateMarkerPresentation()

    window.requestAnimationFrame(() => {
      updateMarkerPresentation()
    })

    if (!hasInitialFitRef.current) {
      fitToGroups(map, sourceGroups)
      hasInitialFitRef.current = true
    }
  }, [featureCollection, markerGroups, outputRoot, sourceGroups])

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

    updateMarkerPresentation()
  }, [unclusteredMinZoom])

  useEffect(() => {
    updateMarkerPresentation()
  }, [selectedGroupId])

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
    selectedGroupId
  ])

  return (
    <div className="relative h-full overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-slate-950/80 px-4 py-3 text-xs text-white shadow-lg">
        <p className="font-semibold">Map-based Photo Group Explorer</p>
        <p className="mt-1 text-slate-200">
          그룹 핀, 클러스터, bounds 기반 샘플링으로 탐색합니다.
        </p>
      </div>

      {mapErrorMessage ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95">
          <div className="max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-amber-900">
              지도를 불러오지 못했습니다.
            </p>
            <p className="mt-1 text-sm text-amber-700">
              검색 결과와 그룹 정보는 계속 볼 수 있습니다.
            </p>
            <p className="mt-2 text-xs break-all text-amber-700">{mapErrorMessage}</p>
          </div>
        </div>
      ) : null}

      {sourceGroups.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/10">
          <div className="rounded-2xl bg-white/95 px-6 py-5 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              현재 지도에 표시할 그룹이 없습니다.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              검색을 바꾸거나 날짜 필터를 조정해 보세요.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
