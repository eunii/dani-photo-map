import { describe, expect, it } from 'vitest'

import type { Photo } from '@domain/entities/Photo'
import { createPhotoGroups } from '@domain/services/PhotoGroupingService'

function createPhoto(overrides: Partial<Photo> & Pick<Photo, 'id' | 'sourceFileName'>): Photo {
  return {
    id: overrides.id,
    sourcePath: overrides.sourcePath ?? `C:/photos/${overrides.sourceFileName}`,
    sourceFileName: overrides.sourceFileName,
    sha256: overrides.sha256,
    capturedAt: overrides.capturedAt,
    capturedAtSource: overrides.capturedAtSource,
    gps: overrides.gps,
    missingGpsCategory: overrides.missingGpsCategory,
    missingGpsGroupingBasis: overrides.missingGpsGroupingBasis,
    regionName: overrides.regionName,
    outputRelativePath: overrides.outputRelativePath,
    thumbnailRelativePath: overrides.thumbnailRelativePath,
    isDuplicate: overrides.isDuplicate ?? false,
    metadataIssues: overrides.metadataIssues ?? []
  }
}

describe('PhotoGroupingService', () => {
  it('merges same region and calendar month into one group regardless of time gap', () => {
    const photos: Photo[] = [
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0001.JPG',
        regionName: 'seoul',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        }
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0002.JPG',
        regionName: 'seoul',
        capturedAt: {
          iso: '2026-04-03T16:30:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '163000'
        }
      })
    ]

    const groups = createPhotoGroups(photos)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.displayTitle).toBe('')
    expect(groups[0]?.photoIds).toEqual(['photo-1', 'photo-2'])
  })

  it('keeps base titles intact without parsing errors', () => {
    const groups = createPhotoGroups([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0001.JPG',
        regionName: 'base',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        }
      })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      title: '',
      displayTitle: '',
      groupKey: 'group|region=base|year=2026|month=04|basis=month|day=00|slot=1'
    })
  })

  it('merges dated and undated photos in the same region into one bucket (display region only when GPS present)', () => {
    const photos: Photo[] = [
      createPhoto({
        id: 'photo-a',
        sourceFileName: 'A.JPG',
        regionName: 'hwaseong-si',
        capturedAt: {
          iso: '2026-03-31T10:00:00.000Z',
          year: '2026',
          month: '03',
          day: '31',
          time: '100000'
        }
      }),
      createPhoto({
        id: 'photo-b',
        sourceFileName: 'B.JPG',
        regionName: 'hwaseong-si'
      })
    ]

    const groups = createPhotoGroups(photos)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.displayTitle).toBe('')
    expect(groups[0]?.title).toBe('')
  })

  it('selects a representative photo using gps and thumbnail quality', () => {
    const groups = createPhotoGroups([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0001.JPG',
        regionName: 'busan',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        },
        thumbnailRelativePath: 'thumb-1.webp'
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0002.JPG',
        regionName: 'busan',
        capturedAt: {
          iso: '2026-04-03T08:10:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '081000'
        },
        gps: {
          latitude: 35.1796,
          longitude: 129.0756
        },
        thumbnailRelativePath: 'thumb-2.webp',
        capturedAtSource: 'exif-date-time-original'
      })
    ])

    expect(groups[0]).toMatchObject({
      displayTitle: 'busan',
      title: 'busan',
      representativePhotoId: 'photo-2',
      representativeGps: {
        latitude: 35.1796,
        longitude: 129.0756
      },
      representativeThumbnailRelativePath: 'thumb-2.webp'
    })
  })

  it('splits missing-gps photos by month-week when requested', () => {
    const groups = createPhotoGroups([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0101.JPG',
        regionName: 'base',
        missingGpsCategory: 'missing-original-gps',
        missingGpsGroupingBasis: 'week',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        }
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0102.JPG',
        regionName: 'base',
        missingGpsCategory: 'missing-original-gps',
        missingGpsGroupingBasis: 'week',
        capturedAt: {
          iso: '2026-04-10T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '10',
          time: '080000'
        }
      })
    ])

    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.groupKey)).toEqual([
      'group|region=base|year=2026|month=04|basis=week|day=week1|slot=1',
      'group|region=base|year=2026|month=04|basis=week|day=week2|slot=2'
    ])
  })

  it('splits missing-gps photos by day when requested', () => {
    const groups = createPhotoGroups([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0201.JPG',
        regionName: 'base',
        missingGpsCategory: 'missing-original-gps',
        missingGpsGroupingBasis: 'day',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        }
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0202.JPG',
        regionName: 'base',
        missingGpsCategory: 'missing-original-gps',
        missingGpsGroupingBasis: 'day',
        capturedAt: {
          iso: '2026-04-04T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '04',
          time: '080000'
        }
      })
    ])

    expect(groups).toHaveLength(2)
    expect(groups.map((group) => group.groupKey)).toEqual([
      'group|region=base|year=2026|month=04|basis=day|day=03|slot=1',
      'group|region=base|year=2026|month=04|basis=day|day=04|slot=2'
    ])
  })

  it('keeps gps photos monthly even when missing-gps basis is day', () => {
    const groups = createPhotoGroups([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0301.JPG',
        regionName: 'seoul',
        missingGpsGroupingBasis: 'day',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        },
        gps: {
          latitude: 37.5,
          longitude: 127
        }
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0302.JPG',
        regionName: 'seoul',
        missingGpsGroupingBasis: 'day',
        capturedAt: {
          iso: '2026-04-20T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '20',
          time: '080000'
        },
        gps: {
          latitude: 37.5,
          longitude: 127
        }
      })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.groupKey).toBe(
      'group|region=seoul|year=2026|month=04|basis=month|day=00|slot=1'
    )
  })
})
