import { describe, expect, it, vi } from 'vitest'

import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import { MovePhotosToGroupUseCase } from '@application/usecases/MovePhotosToGroupUseCase'

function createFileSystem() {
  return {
    listPhotoFiles: vi.fn(),
    listDirectoryFileNames: vi.fn().mockResolvedValue([]),
    ensureDirectory: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn(),
    moveFile: vi.fn().mockResolvedValue(undefined)
  }
}

function createLibraryIndex(): LibraryIndex {
  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: '2026-04-03T10:11:12.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot: 'C:/photos/output',
    photos: [
      {
        id: 'source-photo-1',
        sourcePath: 'C:/photos/output/2026/04/base/IMG_0001.JPG',
        sourceFileName: 'IMG_0001.JPG',
        sha256: 'hash-1',
        capturedAt: {
          iso: '2026-04-03T11:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '110000'
        },
        outputRelativePath: '2026/04/base/IMG_0001.JPG',
        isDuplicate: false,
        metadataIssues: ['gps-missing'],
        missingGpsCategory: 'missing-original-gps',
        locationSource: 'none'
      },
      {
        id: 'destination-photo-1',
        sourcePath: 'C:/photos/output/2026/04/seoul/2026-04-03_083000_IMG_9999.JPG',
        sourceFileName: '2026-04-03_083000_IMG_9999.JPG',
        sha256: 'hash-2',
        capturedAt: {
          iso: '2026-04-03T08:30:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '083000'
        },
        originalGps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        locationSource: 'exif',
        regionName: 'seoul',
        outputRelativePath: '2026/04/seoul/2026-04-03_083000_IMG_9999.JPG',
        thumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp',
        isDuplicate: false,
        metadataIssues: []
      }
    ],
    groups: [
      {
        id: 'group-source',
        groupKey: 'group|region=base|year=2026|month=04|day=03|slot=1',
        title: '2026-04-03 base',
        displayTitle: '2026-04-03 base',
        photoIds: ['source-photo-1'],
        companions: [],
        notes: undefined
      },
      {
        id: 'group-destination',
        groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
        title: '서울 산책',
        displayTitle: '2026-04-03 seoul',
        photoIds: ['destination-photo-1'],
        representativePhotoId: 'destination-photo-1',
        representativeGps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp',
        companions: [],
        notes: undefined
      }
    ]
  }
}

describe('MovePhotosToGroupUseCase', () => {
  it('moves selected photos into a gps-backed group and keeps original gps untouched', async () => {
    const fileSystem = createFileSystem()
    const savedIndexes: LibraryIndex[] = []
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn(async (index: LibraryIndex) => {
        savedIndexes.push(index)
      })
    }
    const useCase = new MovePhotosToGroupUseCase(store, fileSystem)

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      sourceGroupId: 'group-source',
      destinationGroupId: 'group-destination',
      photoIds: ['source-photo-1']
    })

    const movedPhoto = updatedIndex.photos.find((photo) => photo.id === 'source-photo-1')

    expect(movedPhoto).toMatchObject({
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      },
      locationSource: 'assigned-from-group',
      regionName: 'seoul',
      outputRelativePath: '2026/04/seoul/2026-04-03_1100_서울_산책_001.JPG'
    })
    expect(movedPhoto?.originalGps).toBeUndefined()
    expect(updatedIndex.groups.find((group) => group.id === 'group-source')).toBeUndefined()
    expect(updatedIndex.groups.find((group) => group.id === 'group-destination'))
      .toMatchObject({
        photoIds: ['destination-photo-1', 'source-photo-1'],
        representativeGps: {
          latitude: 37.5665,
          longitude: 126.978
        }
      })
    expect(fileSystem.moveFile).toHaveBeenCalled()
    expect(savedIndexes).toHaveLength(1)
  })

  it('rejects moving photos into a destination group without representative gps', async () => {
    const fileSystem = createFileSystem()
    const index = createLibraryIndex()
    const destinationGroup = index.groups[1]!
    const destinationPhoto = index.photos[1]!

    index.groups[1] = {
      ...destinationGroup,
      representativePhotoId: undefined,
      representativeGps: undefined
    }
    index.photos[1] = {
      ...destinationPhoto,
      gps: undefined,
      originalGps: undefined,
      locationSource: 'none',
      regionName: undefined
    }
    const store = {
      load: vi.fn().mockResolvedValue(index),
      save: vi.fn()
    }
    const useCase = new MovePhotosToGroupUseCase(store, fileSystem)

    await expect(
      useCase.execute({
        outputRoot: 'C:/photos/output',
        sourceGroupId: 'group-source',
        destinationGroupId: 'group-destination',
        photoIds: ['source-photo-1']
      })
    ).rejects.toThrow('Destination group must have representative GPS.')
  })
})
