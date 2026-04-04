import { describe, expect, it, vi } from 'vitest'

import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import { UpdatePhotoGroupUseCase } from '@application/usecases/UpdatePhotoGroupUseCase'

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
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        outputRelativePath: '2026/04/seoul/IMG_0001.JPG',
        thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-2',
        sourcePath: 'C:/photos/source/IMG_0002.JPG',
        sourceFileName: 'IMG_0002.JPG',
        capturedAt: {
          iso: '2026-04-03T09:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '090000'
        },
        gps: {
          latitude: 35.1796,
          longitude: 129.0756
        },
        outputRelativePath: '2026/04/busan/IMG_0002.JPG',
        thumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp',
        isDuplicate: false,
        metadataIssues: []
      }
    ],
    groups: [
      {
        id: 'group-1',
        groupKey: 'group|region=seoul|year=2026|month=04|day=00|slot=1',
        title: '2026-04 seoul',
        displayTitle: '2026-04 seoul',
        photoIds: ['photo-1', 'photo-2'],
        representativePhotoId: 'photo-1',
        representativeGps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
        companions: [],
        notes: undefined
      }
    ]
  }
}

describe('UpdatePhotoGroupUseCase', () => {
  it('updates editable group fields and syncs representative metadata', async () => {
    const savedIndexes: LibraryIndex[] = []
    const fileSystem = createFileSystem()
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn(async (index: LibraryIndex) => {
        savedIndexes.push(index)
      })
    }
    const useCase = new UpdatePhotoGroupUseCase(store, fileSystem)

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:\\photos\\output',
      groupId: 'group-1',
      title: '부산 당일치기',
      companions: ['Alice', ' Bob ', 'Alice'],
      notes: '  저녁 바다 산책  ',
      representativePhotoId: 'photo-2'
    })

    expect(updatedIndex.groups[0]).toMatchObject({
      title: '부산 당일치기',
      companions: ['Alice', 'Bob'],
      notes: '저녁 바다 산책',
      representativePhotoId: 'photo-2',
      representativeGps: {
        latitude: 35.1796,
        longitude: 129.0756
      },
      representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp'
    })
    expect(updatedIndex.photos[0]?.outputRelativePath).toBe(
      '2026/04/seoul/2026-04-03_0800_부산_당일치기_001.JPG'
    )
    expect(updatedIndex.photos[1]?.outputRelativePath).toBe(
      '2026/04/busan/2026-04-03_0900_부산_당일치기_001.JPG'
    )
    expect(fileSystem.moveFile).toHaveBeenCalled()
    expect(savedIndexes).toHaveLength(1)
  })

  it('falls back to displayTitle when the edited title is blank', async () => {
    const fileSystem = createFileSystem()
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn()
    }
    const useCase = new UpdatePhotoGroupUseCase(store, fileSystem)

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      groupId: 'group-1',
      title: '   ',
      companions: [],
      notes: '   '
    })

    expect(updatedIndex.groups[0]).toMatchObject({
      title: '2026-04 seoul',
      notes: undefined
    })
  })

  it('starts from the highest conflicting sequence number plus one', async () => {
    const fileSystem = createFileSystem()
    fileSystem.listDirectoryFileNames
      .mockResolvedValueOnce([
        '2026-04-03_0800_부산_당일치기_001.JPG',
        '2026-04-03_0800_부산_당일치기_003.JPG'
      ])
      .mockResolvedValueOnce([])
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn()
    }
    const useCase = new UpdatePhotoGroupUseCase(store, fileSystem)

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      groupId: 'group-1',
      title: '부산 당일치기',
      companions: []
    })

    expect(updatedIndex.photos[0]?.outputRelativePath).toBe(
      '2026/04/seoul/2026-04-03_0800_부산_당일치기_004.JPG'
    )
  })

  it('rebuilds the library from existing output when index.json is missing', async () => {
    const savedIndexes: LibraryIndex[] = []
    const fileSystem = createFileSystem()
    const store = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (index: LibraryIndex) => {
        savedIndexes.push(index)
      })
    }
    const existingOutputScanner = {
      scan: vi.fn().mockResolvedValue({
        outputRoot: 'C:/photos/output',
        photos: [
          {
            id: 'fallback-photo-1',
            sourcePath:
              'C:/photos/output/2026/04/seoul/2026-04-03_080000_IMG_0001.JPG',
            sourceFileName: '2026-04-03_080000_IMG_0001.JPG',
            capturedAt: {
              iso: '2026-04-03T08:00:00.000Z',
              year: '2026',
              month: '04',
              day: '03',
              time: '080000'
            },
            regionName: 'seoul',
            outputRelativePath: '2026/04/seoul/2026-04-03_080000_IMG_0001.JPG'
          }
        ]
      })
    }
    const useCase = new UpdatePhotoGroupUseCase(
      store,
      fileSystem,
      existingOutputScanner
    )

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      groupId: 'group|region=seoul|year=2026|month=04|day=00|slot=1',
      title: '서울 산책',
      companions: ['Alice']
    })

    expect(existingOutputScanner.scan).toHaveBeenCalledWith('C:/photos/output')
    expect(updatedIndex.groups[0]).toMatchObject({
      title: '서울 산책',
      companions: ['Alice']
    })
    expect(savedIndexes).toHaveLength(1)
  })

  it('merges another group into the gps-backed group when titles match after save', async () => {
    const savedIndexes: LibraryIndex[] = []
    const fileSystem = createFileSystem()
    const index: LibraryIndex = {
      ...createLibraryIndex(),
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
          gps: { latitude: 37.5665, longitude: 126.978 },
          outputRelativePath: '2026/04/seoul/IMG_0001.JPG',
          thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
          isDuplicate: false,
          metadataIssues: []
        },
        {
          id: 'photo-2',
          sourcePath: 'C:/photos/source/IMG_0002.JPG',
          sourceFileName: 'IMG_0002.JPG',
          capturedAt: {
            iso: '2026-04-03T09:00:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '090000'
          },
          outputRelativePath: '2026/04/base/IMG_0002.JPG',
          thumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp',
          isDuplicate: false,
          metadataIssues: ['gps-missing'],
          missingGpsCategory: 'missing-original-gps',
          locationSource: 'none'
        }
      ],
      groups: [
        {
          id: 'group-seoul',
          groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
          title: '공통제목',
          displayTitle: '2026-04-03 seoul',
          photoIds: ['photo-1'],
          representativePhotoId: 'photo-1',
          representativeGps: {
            latitude: 37.5665,
            longitude: 126.978
          },
          representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
          companions: [],
          notes: undefined
        },
        {
          id: 'group-unknown',
          groupKey:
            'group|region=base|year=2026|month=04|day=03|slot=1',
          title: '임시제목',
          displayTitle: '2026-04-03 base',
          photoIds: ['photo-2'],
          companions: [],
          notes: undefined
        }
      ]
    }
    const store = {
      load: vi.fn().mockResolvedValue(index),
      save: vi.fn(async (saved: LibraryIndex) => {
        savedIndexes.push(saved)
      })
    }
    const useCase = new UpdatePhotoGroupUseCase(store, fileSystem)

    const result = await useCase.execute({
      outputRoot: 'C:/photos/output',
      groupId: 'group-unknown',
      title: '공통제목',
      companions: []
    })

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.photoIds).toEqual(['photo-1', 'photo-2'])
    expect(result.groups[0]?.title).toBe('공통제목')
    expect(fileSystem.moveFile).toHaveBeenCalled()
    expect(savedIndexes).toHaveLength(1)
    expect(savedIndexes[0]?.groups).toHaveLength(1)
  })
})
