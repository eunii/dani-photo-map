import { describe, expect, it } from 'vitest'

import type { GroupSummary } from '@shared/types/preload'

import {
  buildSelectedGroupPhotoPins,
  buildMapGroupRecord,
  buildVisibleMapGroups,
  deriveMapPageState,
  filterMapGroupRecords,
  getMapZoomPolicy,
  resolveGroupDisplayTitle,
  resolveGroupPinLocation
} from './mapPageSelectors'

const emptyGps = {
  exactGpsCount: 0,
  inferredGpsCount: 0,
  missingGpsCount: 0
}

function createSummary(
  overrides: Partial<GroupSummary> & Pick<GroupSummary, 'id' | 'title'>
): GroupSummary {
  return {
    id: overrides.id,
    groupKey: overrides.groupKey ?? overrides.id,
    pathSegments: overrides.pathSegments ?? ['2026', '04', 'region'],
    title: overrides.title,
    displayTitle: overrides.displayTitle ?? overrides.title,
    photoCount: overrides.photoCount ?? 0,
    representativePhotoId: overrides.representativePhotoId,
    representativeThumbnailRelativePath: overrides.representativeThumbnailRelativePath,
    representativeOutputRelativePath: overrides.representativeOutputRelativePath,
    representativeGps: overrides.representativeGps,
    companions: overrides.companions ?? [],
    notes: overrides.notes,
    regionLabel: overrides.regionLabel ?? 'Seoul',
    earliestCapturedAtIso: overrides.earliestCapturedAtIso,
    latestCapturedAtIso: overrides.latestCapturedAtIso,
    searchText: overrides.searchText ?? 'test',
    gpsBreakdown: overrides.gpsBreakdown ?? emptyGps,
    pinLocation: overrides.pinLocation ?? null,
    isUnknownLocation: overrides.isUnknownLocation ?? false
  }
}

describe('mapPageSelectors', () => {
  it('uses summary pinLocation (original GPS preferred in index pipeline)', () => {
    const group = createSummary({
      id: 'group-1',
      title: 'Trip',
      displayTitle: '2026-04-02_양재천',
      representativeGps: { latitude: 10, longitude: 10 },
      pinLocation: {
        latitude: 37.5,
        longitude: 127.0,
        source: 'photo-original-gps'
      },
      gpsBreakdown: { exactGpsCount: 2, inferredGpsCount: 0, missingGpsCount: 0 }
    })

    expect(resolveGroupPinLocation(group)).toEqual({
      latitude: 37.5,
      longitude: 127.0,
      source: 'photo-original-gps'
    })
  })

  it('falls back to representativeGps when pinLocation is representative source', () => {
    const group = createSummary({
      id: 'group-2',
      title: '',
      displayTitle: '',
      representativeGps: { latitude: 48.8, longitude: 2.3 },
      pinLocation: {
        latitude: 48.8,
        longitude: 2.3,
        source: 'representative-gps'
      },
      gpsBreakdown: { exactGpsCount: 0, inferredGpsCount: 0, missingGpsCount: 1 }
    })

    expect(resolveGroupPinLocation(group)).toEqual({
      latitude: 48.8,
      longitude: 2.3,
      source: 'representative-gps'
    })
  })

  it('resolves display title with cleaned title and unknown fallback', () => {
    expect(
      resolveGroupDisplayTitle(
        createSummary({
          id: 'group-3',
          title: '',
          displayTitle: '2026-04-02_양재천',
          regionLabel: 'Seoul'
        })
      )
    ).toBe('양재천')

    expect(
      resolveGroupDisplayTitle(
        createSummary({
          id: 'group-4',
          title: '',
          displayTitle: 'location-unknown',
          regionLabel: 'Unknown Location',
          isUnknownLocation: true
        })
      )
    ).toBe('Unknown Location')
  })

  it('filters groups by search query and date range', () => {
    const records = [
      buildMapGroupRecord(
        createSummary({
          id: 'seoul',
          title: 'Seoul Walk',
          displayTitle: '2026-04-02 Seoul Walk',
          regionLabel: 'Seoul',
          latestCapturedAtIso: '2026-04-02T11:00:00.000Z',
          earliestCapturedAtIso: '2026-04-02T11:00:00.000Z',
          searchText: 'seoul walk han.jpg',
          pinLocation: {
            latitude: 37.5,
            longitude: 127.0,
            source: 'photo-original-gps'
          },
          gpsBreakdown: { exactGpsCount: 1, inferredGpsCount: 0, missingGpsCount: 0 }
        })
      ),
      buildMapGroupRecord(
        createSummary({
          id: 'busan',
          title: 'Busan',
          displayTitle: 'Busan',
          regionLabel: 'Busan',
          latestCapturedAtIso: '2025-01-01T11:00:00.000Z',
          earliestCapturedAtIso: '2025-01-01T11:00:00.000Z',
          searchText: 'busan beach.jpg',
          pinLocation: {
            latitude: 35.1,
            longitude: 129.0,
            source: 'photo-original-gps'
          },
          gpsBreakdown: { exactGpsCount: 1, inferredGpsCount: 0, missingGpsCount: 0 }
        })
      )
    ]

    expect(
      filterMapGroupRecords(records, {
        searchQuery: 'han',
        dateRange: { start: '2026-04-01', end: '2026-04-03' }
      }).map((record) => record.group.id)
    ).toEqual(['seoul'])
  })

  it('samples representative groups per region at low zoom', () => {
    const visibleGroups = buildVisibleMapGroups(
      [
        buildMapGroupRecord(
          createSummary({
            id: 'seoul-high',
            title: 'Seoul High',
            displayTitle: 'Seoul High',
            photoCount: 20,
            regionLabel: 'Seoul',
            latestCapturedAtIso: '2026-04-03T10:00:00.000Z',
            pinLocation: {
              latitude: 37.5,
              longitude: 127.0,
              source: 'photo-original-gps'
            },
            gpsBreakdown: { exactGpsCount: 1, inferredGpsCount: 0, missingGpsCount: 0 }
          })
        ),
        buildMapGroupRecord(
          createSummary({
            id: 'seoul-low',
            title: 'Seoul Low',
            displayTitle: 'Seoul Low',
            photoCount: 2,
            regionLabel: 'Seoul',
            latestCapturedAtIso: '2024-04-03T10:00:00.000Z',
            pinLocation: {
              latitude: 37.6,
              longitude: 127.1,
              source: 'photo-original-gps'
            },
            gpsBreakdown: { exactGpsCount: 1, inferredGpsCount: 0, missingGpsCount: 0 }
          })
        ),
        buildMapGroupRecord(
          createSummary({
            id: 'busan-high',
            title: 'Busan High',
            displayTitle: 'Busan High',
            photoCount: 15,
            regionLabel: 'Busan',
            latestCapturedAtIso: '2026-04-01T10:00:00.000Z',
            pinLocation: {
              latitude: 35.1,
              longitude: 129.0,
              source: 'photo-original-gps'
            },
            gpsBreakdown: { exactGpsCount: 1, inferredGpsCount: 0, missingGpsCount: 0 }
          })
        )
      ],
      {
        zoomLevel: 2,
        bounds: null
      }
    )

    expect(visibleGroups.map((record) => record.group.id)).toEqual([
      'seoul-high',
      'busan-high'
    ])
  })

  it('derives mapped and unmapped groups together for page state', () => {
    const state = deriveMapPageState(
      [
        createSummary({
          id: 'mapped',
          title: 'Mapped',
          displayTitle: 'Mapped',
          regionLabel: 'Seoul',
          latestCapturedAtIso: '2026-04-01T10:00:00.000Z',
          searchText: 'mapped seoul',
          pinLocation: {
            latitude: 37.5,
            longitude: 127.0,
            source: 'photo-original-gps'
          },
          gpsBreakdown: { exactGpsCount: 1, inferredGpsCount: 0, missingGpsCount: 0 }
        }),
        createSummary({
          id: 'unmapped',
          title: 'No GPS',
          displayTitle: 'No GPS',
          regionLabel: 'Unknown Location',
          searchText: 'nogps',
          pinLocation: null,
          isUnknownLocation: true,
          gpsBreakdown: { exactGpsCount: 0, inferredGpsCount: 0, missingGpsCount: 1 }
        })
      ],
      {
        searchQuery: '',
        dateRange: null,
        bounds: null,
        zoomLevel: 8,
        selectedGroupId: 'unmapped'
      }
    )

    expect(state.mappedGroups.map((record) => record.group.id)).toEqual(['mapped'])
    expect(state.unmappedGroups.map((record) => record.group.id)).toEqual([
      'unmapped'
    ])
    expect(state.selectedGroup?.group.id).toBe('unmapped')
  })

  it('uses a world-view zoom policy that hides raw pins until zoomed in', () => {
    expect(getMapZoomPolicy(2)).toMatchObject({
      unclusteredMinZoom: 3.5,
      perRegionLimit: 1
    })
  })

  it('derives selected-group photo pins from gps photos only and prioritizes representative/recent photos', () => {
    const pins = buildSelectedGroupPhotoPins(
      {
        id: 'group-1',
        groupKey: 'group-1',
        pathSegments: ['2026', '04', 'yosemite'],
        title: 'Yosemite',
        displayTitle: 'Yosemite',
        photoCount: 3,
        photoIds: ['photo-1', 'photo-2', 'photo-3'],
        representativePhotoId: 'photo-2',
        representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp',
        representativeGps: {
          latitude: 36.57,
          longitude: -118.29
        },
        companions: [],
        photos: [
          {
            id: 'photo-1',
            sourceFileName: 'IMG_0001.JPG',
            capturedAtIso: '2026-04-03T08:00:00.000Z',
            originalGps: {
              latitude: 36.57,
              longitude: -118.29
            },
            gps: {
              latitude: 36.57,
              longitude: -118.29
            },
            locationSource: 'exif',
            thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
            outputRelativePath: '2026/04/yosemite/IMG_0001.JPG',
            hasGps: true
          },
          {
            id: 'photo-2',
            sourceFileName: 'IMG_0002.JPG',
            capturedAtIso: '2026-04-05T08:00:00.000Z',
            originalGps: {
              latitude: 36.58,
              longitude: -118.28
            },
            gps: {
              latitude: 36.58,
              longitude: -118.28
            },
            locationSource: 'exif',
            thumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp',
            outputRelativePath: '2026/04/yosemite/IMG_0002.JPG',
            hasGps: true
          },
          {
            id: 'photo-3',
            sourceFileName: 'IMG_0003.JPG',
            capturedAtIso: '2026-04-06T08:00:00.000Z',
            hasGps: false
          }
        ]
      },
      {
        maxPins: 2
      }
    )

    expect(pins).toHaveLength(2)
    expect(pins.map((pin) => pin.photoId)).toEqual(['photo-2', 'photo-1'])
    expect(pins[0]).toMatchObject({
      isRepresentative: true,
      gpsSource: 'original-gps'
    })
  })
})
