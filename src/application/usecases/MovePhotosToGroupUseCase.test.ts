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
    moveFile: vi.fn().mockResolvedValue(undefined),
    removeFileIfExists: vi.fn().mockResolvedValue(undefined),
    removeDirectoryRecursiveIfExists: vi.fn().mockResolvedValue(undefined)
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

function createTwoSourceGroupsLibraryIndex(): LibraryIndex {
  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: '2026-04-03T10:11:12.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot: 'C:/photos/output',
    photos: [
      {
        id: 'photo-a',
        sourcePath: 'C:/photos/output/2026/04/base-a/IMG_A.JPG',
        sourceFileName: 'IMG_A.JPG',
        sha256: 'hash-a',
        capturedAt: {
          iso: '2026-04-03T09:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '090000'
        },
        outputRelativePath: '2026/04/base-a/IMG_A.JPG',
        isDuplicate: false,
        metadataIssues: [],
        locationSource: 'exif',
        regionName: 'base-a',
        gps: { latitude: 37.0, longitude: 127.0 }
      },
      {
        id: 'photo-b',
        sourcePath: 'C:/photos/output/2026/04/base-b/IMG_B.JPG',
        sourceFileName: 'IMG_B.JPG',
        sha256: 'hash-b',
        capturedAt: {
          iso: '2026-04-03T10:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '100000'
        },
        outputRelativePath: '2026/04/base-b/IMG_B.JPG',
        isDuplicate: false,
        metadataIssues: [],
        locationSource: 'exif',
        regionName: 'base-b',
        gps: { latitude: 36.0, longitude: 128.0 }
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
        id: 'group-a',
        groupKey: 'group|region=base-a|year=2026|month=04|day=03|slot=1',
        title: 'base-a day',
        displayTitle: 'base-a day',
        photoIds: ['photo-a'],
        companions: [],
        notes: undefined
      },
      {
        id: 'group-b',
        groupKey: 'group|region=base-b|year=2026|month=04|day=03|slot=1',
        title: 'base-b day',
        displayTitle: 'base-b day',
        photoIds: ['photo-b'],
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
      outputRelativePath: '2026/04/서울_산책/2026-04-03_110000_IMG_0001_001.JPG'
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

  it('allows moving into a destination group without representative gps when the use case relaxes validation', async () => {
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

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      sourceGroupId: 'group-source',
      destinationGroupId: 'group-destination',
      photoIds: ['source-photo-1']
    })

    expect(
      updatedIndex.groups.find((group) => group.id === 'group-destination')
        ?.photoIds
    ).toEqual(['destination-photo-1', 'source-photo-1'])
    expect(store.save).toHaveBeenCalled()
    expect(fileSystem.moveFile).toHaveBeenCalled()
  })

  it('moves photos from multiple source groups when sourceGroupId is omitted', async () => {
    const fileSystem = createFileSystem()
    const store = {
      load: vi.fn().mockResolvedValue(createTwoSourceGroupsLibraryIndex()),
      save: vi.fn()
    }
    const useCase = new MovePhotosToGroupUseCase(store, fileSystem)

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      destinationGroupId: 'group-destination',
      photoIds: ['photo-a', 'photo-b']
    })

    const dest = updatedIndex.groups.find((group) => group.id === 'group-destination')

    expect([...(dest?.photoIds ?? [])].sort()).toEqual(
      ['destination-photo-1', 'photo-a', 'photo-b'].sort()
    )
    expect(updatedIndex.groups.find((group) => group.id === 'group-a')).toBeUndefined()
    expect(updatedIndex.groups.find((group) => group.id === 'group-b')).toBeUndefined()
    expect(store.save).toHaveBeenCalled()
    expect(fileSystem.moveFile.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('creates a new group and moves photos into it when newGroup is set', async () => {
    const fileSystem = createFileSystem()
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn()
    }
    const useCase = new MovePhotosToGroupUseCase(store, fileSystem)

    const title = 'x-new-manual-group-unique-001'
    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      newGroup: { title },
      photoIds: ['source-photo-1']
    })

    const manualGroup = updatedIndex.groups.find(
      (group) => group.title === title && group.id.startsWith('group|manual-')
    )

    expect(manualGroup?.photoIds).toEqual(['source-photo-1'])
    expect(updatedIndex.groups.find((group) => group.id === 'group-source')).toBeUndefined()
    expect(store.save).toHaveBeenCalled()
    expect(fileSystem.moveFile).toHaveBeenCalled()
  })
})
