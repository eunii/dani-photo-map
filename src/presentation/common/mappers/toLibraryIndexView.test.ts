import { describe, expect, it } from 'vitest'

import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import {
  toFallbackLibraryIndexView,
  toLibraryIndexView
} from '@presentation/common/mappers/toLibraryIndexView'

function createLibraryIndex(): LibraryIndex {
  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: '2026-04-03T10:11:12.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot: 'C:/photos/output',
    photos: [
      {
        id: 'photo-1',
        sourcePath: 'C:/photos/source/IMG_0001.JPG',
        sourceFileName: 'IMG_0001.JPG',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        },
        capturedAtSource: 'exif-date-time-original',
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        originalGps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        locationSource: 'exif',
        regionName: 'seoul',
        outputRelativePath: '2026/04/seoul/IMG_0001.JPG',
        thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-2',
        sourcePath: 'C:/photos/source/IMG_0002.JPG',
        sourceFileName: 'IMG_0002.JPG',
        outputRelativePath: '2026/04/seoul/IMG_0002.JPG',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-3',
        sourcePath: 'C:/photos/source/IMG_0003.JPG',
        sourceFileName: 'IMG_0003.JPG',
        outputRelativePath: '2026/03/week1/IMG_0003.JPG',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-4',
        sourcePath: 'C:/photos/source/IMG_0004.JPG',
        sourceFileName: 'IMG_0004.JPG',
        outputRelativePath: '2026/03/week1/IMG_0004.JPG',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-5',
        sourcePath: 'C:/photos/source/IMG_0005.JPG',
        sourceFileName: 'IMG_0005.JPG',
        outputRelativePath: '2026/05/week1/IMG_0005.JPG',
        isDuplicate: false,
        metadataIssues: []
      }
    ],
    groups: [
      {
        id: 'group-1',
        groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
        title: '서울 산책',
        displayTitle: '2026-04-03 seoul',
        photoIds: ['photo-1', 'photo-2'],
        representativePhotoId: 'photo-1',
        representativeGps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
        companions: ['Alice'],
        notes: 'sample'
      },
      {
        id: 'group-2',
        groupKey: 'group|title=week1',
        title: 'week1',
        displayTitle: 'week1',
        photoIds: ['photo-3', 'photo-4', 'photo-5'],
        companions: [],
        notes: undefined
      }
    ]
  }
}

describe('toLibraryIndexView', () => {
  it('maps library index entities to renderer-friendly view data', () => {
    const view = toLibraryIndexView(createLibraryIndex())

    expect(view.outputRoot).toBe('C:/photos/output')
    expect(view.groups[0]).toMatchObject({
      id: 'group-1',
      photoCount: 2,
      representativePhotoId: 'photo-1',
      representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
      pathSegments: ['2026', '04', 'seoul']
    })
    expect(view.groups[0]?.searchText.length).toBeGreaterThan(0)
    expect(view.groups[0]?.gpsBreakdown).toBeDefined()
  })

  it('keeps each photo\'s real output path in photoRows even when the group majority-votes a different folder', () => {
    const view = toLibraryIndexView(createLibraryIndex())

    const group2 = view.groups.find((group) => group.id === 'group-2')
    expect(group2?.pathSegments).toEqual(['2026', '03', 'week1'])

    const group2Rows = view.photoRows.filter((row) => row.groupId === 'group-2')
    expect(group2Rows).toHaveLength(3)
    expect(group2Rows.map((row) => row.photo.outputRelativePath).sort()).toEqual(
      [
        '2026/03/week1/IMG_0003.JPG',
        '2026/03/week1/IMG_0004.JPG',
        '2026/05/week1/IMG_0005.JPG'
      ].sort()
    )
    expect(view.photoRows).toHaveLength(5)
  })

  it('returns an empty photoRows array for the fallback recovery view', () => {
    const fallbackView = toFallbackLibraryIndexView('C:/photos/output', '2026-04-03T10:11:12.000Z', [])

    expect(fallbackView.photoRows).toEqual([])
  })
})
