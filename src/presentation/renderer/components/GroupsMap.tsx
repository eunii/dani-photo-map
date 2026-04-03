import { useEffect, useMemo, useRef, useState } from 'react'

import maplibregl, { LngLatBounds, type StyleSpecification } from 'maplibre-gl'

import type { MapGroupSummary } from '@shared/types/preload'

interface GroupsMapProps {
  groups: MapGroupSummary[]
  outputRoot?: string
  selectedGroupId?: string
  hoveredGroupId?: string
  onSelectGroup?: (groupId: string) => void
  onHoverGroup?: (groupId?: string) => void
}

interface MapMarkerBinding {
  groupId: string
  marker: maplibregl.Marker
  element: HTMLButtonElement
}

const DEFAULT_CENTER: [number, number] = [127.0, 37.5]
const DEFAULT_ZOOM = 5

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

export function GroupsMap({
  groups,
  outputRoot,
  selectedGroupId,
  hoveredGroupId,
  onSelectGroup,
  onHoverGroup
}: GroupsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<MapMarkerBinding[]>([])
  const popupByGroupIdRef = useRef(new Map<string, maplibregl.Popup>())
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null)

  const hasGroups = groups.length > 0
  const mapGroups = useMemo(() => groups, [groups])

  function toFileUrl(relativePath?: string): string | undefined {
    if (!outputRoot || !relativePath) {
      return undefined
    }

    return encodeURI(
      `file:///${`${outputRoot}/${relativePath}`.replace(/\\/g, '/').replace(/^\/+/, '')}`
    )
  }

  function updateMarkerStyles(): void {
    for (const binding of markersRef.current) {
      const isSelected = binding.groupId === selectedGroupId
      const isHovered = binding.groupId === hoveredGroupId

      binding.element.className = [
        'h-4 w-4 rounded-full border-2 border-white shadow transition-all',
        isSelected
          ? 'scale-125 bg-blue-700 ring-4 ring-blue-200'
          : isHovered
            ? 'scale-110 bg-sky-500 ring-2 ring-sky-100'
            : 'bg-blue-600'
      ].join(' ')
    }
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

      map.on('error', (event) => {
        const nextMessage =
          event.error instanceof Error
            ? event.error.message
            : '지도를 불러오는 중 오류가 발생했습니다.'

        setMapErrorMessage(nextMessage)
      })
      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      mapRef.current = map
      setMapErrorMessage(null)
    } catch (error) {
      setMapErrorMessage(
        error instanceof Error
          ? error.message
          : '지도를 초기화하지 못했습니다.'
      )
    }

    return () => {
      for (const binding of markersRef.current) {
        binding.marker.remove()
      }

      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (!map || mapErrorMessage) {
      return
    }

    try {
      for (const binding of markersRef.current) {
        binding.marker.remove()
      }

      markersRef.current = []
      popupByGroupIdRef.current.clear()

      if (mapGroups.length === 0) {
        map.easeTo({
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          duration: 500
        })

        return
      }

      const bounds = new LngLatBounds()

      for (const group of mapGroups) {
        const markerElement = document.createElement('button')
        markerElement.type = 'button'
        markerElement.setAttribute('aria-label', group.title)
        markerElement.addEventListener('mouseenter', () => {
          onHoverGroup?.(group.id)
        })
        markerElement.addEventListener('mouseleave', () => {
          onHoverGroup?.(undefined)
        })

        const popupContainer = document.createElement('div')
        popupContainer.className = 'space-y-2'

        const thumbnailUrl = toFileUrl(group.representativeThumbnailRelativePath)

        if (thumbnailUrl) {
          const image = document.createElement('img')
          image.src = thumbnailUrl
          image.alt = group.title
          image.className = 'h-24 w-40 rounded-lg object-cover'
          image.addEventListener('error', () => {
            image.remove()
          })
          popupContainer.appendChild(image)
        }

        const titleElement = document.createElement('strong')
        titleElement.textContent = group.title
        popupContainer.appendChild(titleElement)

        const metaElement = document.createElement('div')
        metaElement.textContent = `사진 ${group.photoCount}장`
        popupContainer.appendChild(metaElement)

        const popup = new maplibregl.Popup({ offset: 16 }).setDOMContent(
          popupContainer
        )

        markerElement.addEventListener('click', () => {
          onSelectGroup?.(group.id)
        })

        const marker = new maplibregl.Marker({ element: markerElement })
          .setLngLat([group.longitude, group.latitude])
          .setPopup(popup)
          .addTo(map)

        markersRef.current.push({
          groupId: group.id,
          marker,
          element: markerElement
        })
        popupByGroupIdRef.current.set(group.id, popup)
        bounds.extend([group.longitude, group.latitude])
      }

      updateMarkerStyles()

      if (mapGroups.length === 1) {
        const singleGroup = mapGroups[0]

        if (!singleGroup) {
          return
        }

        map.easeTo({
          center: [singleGroup.longitude, singleGroup.latitude],
          zoom: 9,
          duration: 500
        })

        return
      }

      map.fitBounds(bounds, {
        padding: 48,
        duration: 500,
        maxZoom: 10
      })
    } catch (error) {
      setMapErrorMessage(
        error instanceof Error
          ? error.message
          : '지도 마커를 그리는 중 오류가 발생했습니다.'
      )
      for (const binding of markersRef.current) {
        binding.marker.remove()
      }
      markersRef.current = []
      popupByGroupIdRef.current.clear()
    }
  }, [mapErrorMessage, mapGroups, onHoverGroup, onSelectGroup, outputRoot])

  useEffect(() => {
    updateMarkerStyles()
  }, [hoveredGroupId, selectedGroupId])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !selectedGroupId || mapErrorMessage) {
      return
    }

    const selectedGroup = mapGroups.find((group) => group.id === selectedGroupId)

    if (!selectedGroup) {
      return
    }

    try {
      map.easeTo({
        center: [selectedGroup.longitude, selectedGroup.latitude],
        zoom: Math.min(
          11,
          Math.max(8, selectedGroup.photoCount >= 12 ? 8 : 9)
        ),
        duration: 500
      })

      popupByGroupIdRef.current.get(selectedGroup.id)?.addTo(map)
    } catch (error) {
      setMapErrorMessage(
        error instanceof Error
          ? error.message
          : '선택한 그룹을 지도에서 강조하지 못했습니다.'
      )
    }
  }, [mapErrorMessage, mapGroups, selectedGroupId])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">지도 결과</h2>
        <p className="text-xs text-slate-500">
          GPS가 있는 대표 사진 그룹을 우선 표시합니다.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div ref={containerRef} className="h-[420px] w-full" />

        {mapErrorMessage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95">
            <div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center shadow-sm">
              <p className="text-sm font-semibold text-amber-900">
                지도를 불러오지 못했습니다.
              </p>
              <p className="mt-1 text-sm text-amber-800">
                목록과 상세 패널은 계속 사용할 수 있습니다.
              </p>
              <p className="mt-2 text-xs break-all text-amber-700">
                {mapErrorMessage}
              </p>
            </div>
          </div>
        ) : null}

        {!hasGroups ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/10">
            <div className="rounded-xl bg-white/95 px-5 py-4 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                아직 표시할 그룹이 없습니다.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                GPS가 포함된 사진을 정리하면 지도에 그룹 마커가 표시됩니다.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
