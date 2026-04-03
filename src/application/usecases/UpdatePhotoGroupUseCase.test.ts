import { describe, expect, it, vi } from 'vitest'

import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import { UpdatePhotoGroupUseCase } from '@application/usecases/UpdatePhotoGroupUseCase'

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
        groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
        title: '2026-04-03 seoul',
        displayTitle: '2026-04-03 seoul',
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
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn(async (index: LibraryIndex) => {
        savedIndexes.push(index)
      })
    }
    const useCase = new UpdatePhotoGroupUseCase(store)

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
    expect(savedIndexes).toHaveLength(1)
  })

  it('falls back to displayTitle when the edited title is blank', async () => {
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn()
    }
    const useCase = new UpdatePhotoGroupUseCase(store)

    const updatedIndex = await useCase.execute({
      outputRoot: 'C:/photos/output',
      groupId: 'group-1',
      title: '   ',
      companions: [],
      notes: '   '
    })

    expect(updatedIndex.groups[0]).toMatchObject({
      title: '2026-04-03 seoul',
      notes: undefined
    })
  })
})
