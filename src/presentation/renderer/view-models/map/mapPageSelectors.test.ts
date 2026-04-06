import { describe, expect, it } from 'vitest'

import type { GroupDetail, GroupPhotoSummary } from '@shared/types/preload'

import {
  buildMapGroupRecord,
  buildVisibleMapGroups,
  deriveMapPageState,
  filterMapGroupRecords,
  getMapZoomPolicy,
  resolveGroupDisplayTitle,
  resolveGroupPinLocation
} from './mapPageSelectors'

function createPhoto(
  overrides: Partial<GroupPhotoSummary> & Pick<GroupPhotoSummary, 'id' | 'sourceFileName'>
): GroupPhotoSummary {
  return {
    id: overrides.id,
    sourceFileName: overrides.sourceFileName,
    capturedAtIso: overrides.capturedAtIso,
    capturedAtSource: overrides.capturedAtSource,
    originalGps: overrides.originalGps,
    gps: overrides.gps,
    locationSource: overrides.locationSource,
    regionName: overrides.regionName,
    thumbnailRelativePath: overrides.thumbnailRelativePath,
    outputRelativePath: overrides.outputRelativePath,
    hasGps: overrides.hasGps ?? Boolean(overrides.gps),
    missingGpsCategory: overrides.missingGpsCategory
  }
}

function createGroup(
  overrides: Partial<GroupDetail> & Pick<GroupDetail, 'id' | 'title'>
): GroupDetail {
  return {
    id: overrides.id,
    title: overrides.title,
    groupKey: overrides.groupKey ?? overrides.id,
    displayTitle: overrides.displayTitle ?? overrides.title,
    photoCount: overrides.photoCount ?? overrides.photos?.length ?? 0,
    photoIds:
      overrides.photoIds ?? overrides.photos?.map((photo) => photo.id) ?? [],
    representativePhotoId: overrides.representativePhotoId,
    representativeThumbnailRelativePath:
      overrides.representativeThumbnailRelativePath,
    representativeGps: overrides.representativeGps,
    companions: overrides.companions ?? [],
    notes: overrides.notes,
    photos: overrides.photos ?? []
  }
}

describe('mapPageSelectors', () => {
  it('prefers the most recent originalGps photo for pin location', () => {
    const group = createGroup({
      id: 'group-1',
      title: 'Trip',
      displayTitle: '2026-04-02_양재천',
      representativeGps: { latitude: 10, longitude: 10 },
      photos: [
        createPhoto({
          id: 'p1',
          sourceFileName: 'old.jpg',
          capturedAtIso: '2026-04-01T09:00:00.000Z',
          originalGps: { latitude: 37.5, longitude: 127.0 },
          gps: { latitude: 37.5, longitude: 127.0 },
          locationSource: 'exif',
          regionName: 'Seoul'
        }),
        createPhoto({
          id: 'p2',
          sourceFileName: 'newer-inferred.jpg',
          capturedAtIso: '2026-04-03T09:00:00.000Z',
          gps: { latitude: 35.0, longitude: 129.0 },
          locationSource: 'assigned-from-group',
          regionName: 'Busan'
        })
      ]
    })

    expect(resolveGroupPinLocation(group)).toEqual({
      latitude: 37.5,
      longitude: 127.0,
      source: 'photo-original-gps'
    })
  })

  it('falls back to representativeGps when no photo gps exists', () => {
    const group = createGroup({
      id: 'group-2',
      title: '',
      displayTitle: '',
      representativeGps: { latitude: 48.8, longitude: 2.3 },
      photos: [createPhoto({ id: 'p1', sourceFileName: 'a.jpg', hasGps: false })]
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
        createGroup({
          id: 'group-3',
          title: '',
          displayTitle: '2026-04-02_양재천',
          photos: []
        })
      )
    ).toBe('양재천')

    expect(
      resolveGroupDisplayTitle(
        createGroup({
          id: 'group-4',
          title: '',
          displayTitle: 'location-unknown',
          photos: []
        })
      )
    ).toBe('Unknown Location')
  })

  it('filters groups by search query and date range', () => {
    const records = [
      buildMapGroupRecord(
        createGroup({
          id: 'seoul',
          title: 'Seoul Walk',
          displayTitle: '2026-04-02 Seoul Walk',
          photos: [
            createPhoto({
              id: 'p1',
              sourceFileName: 'han.jpg',
              capturedAtIso: '2026-04-02T11:00:00.000Z',
              gps: { latitude: 37.5, longitude: 127.0 },
              originalGps: { latitude: 37.5, longitude: 127.0 },
              locationSource: 'exif',
              regionName: 'Seoul'
            })
          ]
        })
      ),
      buildMapGroupRecord(
        createGroup({
          id: 'busan',
          title: 'Busan',
          displayTitle: 'Busan',
          photos: [
            createPhoto({
              id: 'p2',
              sourceFileName: 'beach.jpg',
              capturedAtIso: '2025-01-01T11:00:00.000Z',
              gps: { latitude: 35.1, longitude: 129.0 },
              originalGps: { latitude: 35.1, longitude: 129.0 },
              locationSource: 'exif',
              regionName: 'Busan'
            })
          ]
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
          createGroup({
            id: 'seoul-high',
            title: 'Seoul High',
            displayTitle: 'Seoul High',
            photoCount: 20,
            photos: [
              createPhoto({
                id: 'p1',
                sourceFileName: 'a.jpg',
                capturedAtIso: '2026-04-03T10:00:00.000Z',
                gps: { latitude: 37.5, longitude: 127.0 },
                originalGps: { latitude: 37.5, longitude: 127.0 },
                locationSource: 'exif',
                regionName: 'Seoul'
              })
            ]
          })
        ),
        buildMapGroupRecord(
          createGroup({
            id: 'seoul-low',
            title: 'Seoul Low',
            displayTitle: 'Seoul Low',
            photoCount: 2,
            photos: [
              createPhoto({
                id: 'p2',
                sourceFileName: 'b.jpg',
                capturedAtIso: '2024-04-03T10:00:00.000Z',
                gps: { latitude: 37.6, longitude: 127.1 },
                originalGps: { latitude: 37.6, longitude: 127.1 },
                locationSource: 'exif',
                regionName: 'Seoul'
              })
            ]
          })
        ),
        buildMapGroupRecord(
          createGroup({
            id: 'busan-high',
            title: 'Busan High',
            displayTitle: 'Busan High',
            photoCount: 15,
            photos: [
              createPhoto({
                id: 'p3',
                sourceFileName: 'c.jpg',
                capturedAtIso: '2026-04-01T10:00:00.000Z',
                gps: { latitude: 35.1, longitude: 129.0 },
                originalGps: { latitude: 35.1, longitude: 129.0 },
                locationSource: 'exif',
                regionName: 'Busan'
              })
            ]
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
        createGroup({
          id: 'mapped',
          title: 'Mapped',
          displayTitle: 'Mapped',
          photos: [
            createPhoto({
              id: 'p1',
              sourceFileName: 'mapped.jpg',
              capturedAtIso: '2026-04-01T10:00:00.000Z',
              gps: { latitude: 37.5, longitude: 127.0 },
              originalGps: { latitude: 37.5, longitude: 127.0 },
              locationSource: 'exif',
              regionName: 'Seoul'
            })
          ]
        }),
        createGroup({
          id: 'unmapped',
          title: 'No GPS',
          displayTitle: 'No GPS',
          photos: [createPhoto({ id: 'p2', sourceFileName: 'nogps.jpg' })]
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
})
