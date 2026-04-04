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
    expect(groups[0]?.displayTitle).toBe('2026-04 seoul')
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
      title: '2026-04 base',
      displayTitle: '2026-04 base',
      groupKey: 'group|region=base|year=2026|month=04|day=00|slot=1'
    })
  })

  it('merges dated and undated photos in the same region into one bucket with earliest valid date in title', () => {
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
    expect(groups[0]?.displayTitle).toBe('2026-03 hwaseong-si')
    expect(groups[0]?.title).toBe('2026-03 hwaseong-si')
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
      representativePhotoId: 'photo-2',
      representativeGps: {
        latitude: 35.1796,
        longitude: 129.0756
      },
      representativeThumbnailRelativePath: 'thumb-2.webp'
    })
  })
})
