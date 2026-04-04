import { describe, expect, it, vi } from 'vitest'

import { movePhotosIntoGroup } from '@application/services/movePhotosIntoGroup'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'

function basePhoto(overrides: Partial<Photo> & Pick<Photo, 'id'>): Photo {
  return {
    sourcePath: `C:/in/${overrides.id}.jpg`,
    sourceFileName: `${overrides.id}.jpg`,
    isDuplicate: false,
    metadataIssues: [],
    ...overrides
  }
}

describe('movePhotosIntoGroup', () => {
  it('fills missing capturedAt on moved photos from destination group photos', async () => {
    const destCaptured = {
      iso: '2026-03-31T12:00:00.000Z',
      year: '2026',
      month: '03',
      day: '31',
      time: '120000'
    }
    const destPhoto = basePhoto({
      id: 'dest-1',
      capturedAt: destCaptured,
      capturedAtSource: 'exif-date-time-original',
      gps: { latitude: 37.3, longitude: 127.0 },
      regionName: 'gyeonggi-do',
      outputRelativePath: '2026/03/gyeonggi-do/2026-03-31_1200_t_001.jpg',
      locationSource: 'exif'
    })
    const movingPhoto = basePhoto({
      id: 'move-1',
      gps: undefined,
      regionName: 'base',
      outputRelativePath: '0000/00/base/p_001.jpg',
      locationSource: 'none'
    })
    const destinationGroup: PhotoGroup = {
      id: 'g-dest',
      groupKey: 'gk-dest',
      title: '2026-03-31 gyeonggi-do',
      displayTitle: '2026-03-31 gyeonggi-do',
      photoIds: ['dest-1'],
      representativePhotoId: 'dest-1',
      representativeGps: destPhoto.gps,
      companions: []
    }
    const sourceGroup: PhotoGroup = {
      id: 'g-src',
      groupKey: 'gk-src',
      title: 'pending',
      displayTitle: 'pending',
      photoIds: ['move-1'],
      representativePhotoId: 'move-1',
      companions: []
    }
    const index: LibraryIndex = {
      version: 1,
      generatedAt: new Date().toISOString(),
      sourceRoot: 'C:/in',
      outputRoot: 'C:/out',
      photos: [destPhoto, movingPhoto],
      groups: [destinationGroup, sourceGroup]
    }
    const fileSystem = {
      ensureDirectory: vi.fn().mockResolvedValue(undefined),
      listDirectoryFileNames: vi.fn().mockResolvedValue([]),
      moveFile: vi.fn().mockResolvedValue(undefined)
    }

    const result = await movePhotosIntoGroup({
      index,
      outputRoot: 'C:/out',
      sourceGroupId: 'g-src',
      destinationGroupId: 'g-dest',
      photoIds: ['move-1'],
      fileSystem,
      rules: defaultOrganizationRules
    })

    const moved = result.photos.find((photo) => photo.id === 'move-1')

    expect(moved?.capturedAt?.year).toBe('2026')
    expect(moved?.capturedAt?.month).toBe('03')
    expect(moved?.capturedAtSource).toBe('exif-date-time-original')
    expect(moved?.outputRelativePath?.startsWith('2026/03/')).toBe(true)

    const mergedDest = result.groups.find((group) => group.id === 'g-dest')

    expect(mergedDest?.title).toBe('2026-03-31 gyeonggi-do')
    expect(mergedDest?.displayTitle).toBe('2026-03-31 gyeonggi-do')
  })

  it('falls back to YYYY-MM-DD in destination group title when no donor date exists', async () => {
    const destPhoto = basePhoto({
      id: 'dest-2',
      capturedAt: undefined,
      gps: { latitude: 37.3, longitude: 127.0 },
      regionName: 'gyeonggi-do',
      outputRelativePath: '2026/03/gyeonggi-do/x.jpg',
      locationSource: 'exif'
    })
    const movingPhoto = basePhoto({
      id: 'move-2',
      outputRelativePath: '0000/00/base/p_002.jpg',
      locationSource: 'none'
    })
    const destinationGroup: PhotoGroup = {
      id: 'g-dest2',
      groupKey: 'gk-dest2',
      title: '2026-04-10 gyeonggi',
      displayTitle: '2026-04-10 gyeonggi',
      photoIds: ['dest-2'],
      representativePhotoId: 'dest-2',
      representativeGps: destPhoto.gps,
      companions: []
    }
    const sourceGroup: PhotoGroup = {
      id: 'g-src2',
      groupKey: 'gk-src2',
      title: 'src',
      displayTitle: 'src',
      photoIds: ['move-2'],
      companions: []
    }
    const index: LibraryIndex = {
      version: 1,
      generatedAt: new Date().toISOString(),
      sourceRoot: 'C:/in',
      outputRoot: 'C:/out',
      photos: [destPhoto, movingPhoto],
      groups: [destinationGroup, sourceGroup]
    }
    const fileSystem = {
      ensureDirectory: vi.fn().mockResolvedValue(undefined),
      listDirectoryFileNames: vi.fn().mockResolvedValue([]),
      moveFile: vi.fn().mockResolvedValue(undefined)
    }

    const result = await movePhotosIntoGroup({
      index,
      outputRoot: 'C:/out',
      sourceGroupId: 'g-src2',
      destinationGroupId: 'g-dest2',
      photoIds: ['move-2'],
      fileSystem,
      rules: defaultOrganizationRules
    })

    const moved = result.photos.find((photo) => photo.id === 'move-2')

    expect(moved?.capturedAt?.year).toBe('2026')
    expect(moved?.capturedAt?.month).toBe('04')
    expect(moved?.capturedAt?.day).toBe('10')
    expect(moved?.capturedAtSource).toBe('inferred-from-group-title')
  })

  it('uses unknown region label when destination has GPS but region cannot be inferred from paths', async () => {
    const destCaptured = {
      iso: '2026-03-31T12:00:00.000Z',
      year: '2026',
      month: '03',
      day: '31',
      time: '120000'
    }
    const destPhoto = basePhoto({
      id: 'dest-no-region-path',
      capturedAt: destCaptured,
      capturedAtSource: 'exif-date-time-original',
      gps: { latitude: 37.3, longitude: 127.0 },
      regionName: undefined,
      outputRelativePath: '2026/03/2026-03-31_120000_dest.jpg',
      locationSource: 'exif'
    })
    const movingPhoto = basePhoto({
      id: 'move-no-region-fallback',
      gps: undefined,
      regionName: 'base',
      outputRelativePath: '0000/00/base/p_003.jpg',
      locationSource: 'none'
    })
    const destinationGroup: PhotoGroup = {
      id: 'g-dest-noregion',
      groupKey: 'gk-dest-noregion',
      title: '2026-03-31 seoul',
      displayTitle: '2026-03-31 seoul',
      photoIds: ['dest-no-region-path'],
      representativePhotoId: 'dest-no-region-path',
      representativeGps: destPhoto.gps,
      companions: []
    }
    const sourceGroup: PhotoGroup = {
      id: 'g-src-noregion',
      groupKey: 'gk-src-noregion',
      title: 'pending',
      displayTitle: 'pending',
      photoIds: ['move-no-region-fallback'],
      representativePhotoId: 'move-no-region-fallback',
      companions: []
    }
    const index: LibraryIndex = {
      version: 1,
      generatedAt: new Date().toISOString(),
      sourceRoot: 'C:/in',
      outputRoot: 'C:/out',
      photos: [destPhoto, movingPhoto],
      groups: [destinationGroup, sourceGroup]
    }
    const fileSystem = {
      ensureDirectory: vi.fn().mockResolvedValue(undefined),
      listDirectoryFileNames: vi.fn().mockResolvedValue([]),
      moveFile: vi.fn().mockResolvedValue(undefined)
    }

    const result = await movePhotosIntoGroup({
      index,
      outputRoot: 'C:/out',
      sourceGroupId: 'g-src-noregion',
      destinationGroupId: 'g-dest-noregion',
      photoIds: ['move-no-region-fallback'],
      fileSystem,
      rules: defaultOrganizationRules
    })

    const moved = result.photos.find((photo) => photo.id === 'move-no-region-fallback')

    expect(moved?.gps).toEqual(destPhoto.gps)
    expect(moved?.regionName).toBe('base')
    expect(moved?.outputRelativePath?.startsWith('2026/03/')).toBe(true)
  })
})
