import { useEffect, useMemo, useRef } from 'react'

import maplibregl, { LngLatBounds } from 'maplibre-gl'

import type { MapGroupSummary } from '@shared/types/preload'

interface GroupsMapProps {
  groups: MapGroupSummary[]
}

const DEFAULT_CENTER: [number, number] = [127.0, 37.5]
const DEFAULT_ZOOM = 5
const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json'

export function GroupsMap({ groups }: GroupsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  const hasGroups = groups.length > 0
  const mapGroups = useMemo(() => groups, [groups])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false
    })

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    return () => {
      for (const marker of markersRef.current) {
        marker.remove()
      }

      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    for (const marker of markersRef.current) {
      marker.remove()
    }

    markersRef.current = []

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
      const marker = new maplibregl.Marker({ color: '#2563eb' })
        .setLngLat([group.longitude, group.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setHTML(
            `<strong>${group.title}</strong><br/>사진 ${group.photoCount}장`
          )
        )
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([group.longitude, group.latitude])
    }

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
      duration: 500
    })
  }, [mapGroups])

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
