import { describe, expect, it, vi } from 'vitest'

import { GenerateMissingThumbnailsUseCase } from '@application/usecases/GenerateMissingThumbnailsUseCase'
import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'

function createLibraryIndex(): LibraryIndex {
  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: '2026-04-03T10:11:12.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot: 'C:/photos/output',
    photos: [
      {
        id: 'photo-1',
        sourcePath: 'C:/photos/source/IMG_0001.HEIC',
        sourceFileName: 'IMG_0001.HEIC',
        outputRelativePath: '2026/04/seoul/IMG_0001.HEIC',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-2',
        sourcePath: 'C:/photos/source/IMG_0002.JPG',
        sourceFileName: 'IMG_0002.JPG',
        outputRelativePath: '2026/04/seoul/IMG_0002.JPG',
        thumbnailRelativePath: '.photo-organizer/thumbnails/photo-2.webp',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-3',
        sourcePath: 'C:/photos/source/IMG_0003.HEIC',
        sourceFileName: 'IMG_0003.HEIC',
        outputRelativePath: '2026/05/seoul/IMG_0003.HEIC',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-4',
        sourcePath: 'C:/photos/source/clip.MOV',
        sourceFileName: 'clip.MOV',
        outputRelativePath: '2026/04/seoul/clip.MOV',
        isDuplicate: false,
        metadataIssues: []
      }
    ],
    groups: [
      {
        id: 'group-1',
        groupKey: 'group|region=seoul|year=2026|month=04|day=00|slot=1',
        title: '서울 산책',
        displayTitle: '서울 산책',
        photoIds: ['photo-1', 'photo-2', 'photo-4'],
        representativePhotoId: 'photo-1',
        companions: [],
        notes: undefined
      },
      {
        id: 'group-2',
        groupKey: 'group|region=seoul|year=2026|month=05|day=00|slot=1',
        title: '서울 산책 2',
        displayTitle: '서울 산책 2',
        photoIds: ['photo-3'],
        companions: [],
        notes: undefined
      }
    ]
  }
}

describe('GenerateMissingThumbnailsUseCase', () => {
  it('generates thumbnails only for photos missing one under the requested path, and syncs the group representative thumbnail', async () => {
    const savedIndexes: LibraryIndex[] = []
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn(async (index: LibraryIndex) => {
        savedIndexes.push(index)
      })
    }
    const thumbnailGenerator = {
      generateForPhoto: vi.fn().mockResolvedValue('abc123.webp')
    }
    const useCase = new GenerateMissingThumbnailsUseCase(store, thumbnailGenerator)

    const result = await useCase.execute({
      outputRoot: 'C:/photos/output',
      pathSegments: ['2026', '04', 'seoul']
    })

    expect(thumbnailGenerator.generateForPhoto).toHaveBeenCalledTimes(1)
    expect(thumbnailGenerator.generateForPhoto).toHaveBeenCalledWith(
      'C:/photos/output/2026/04/seoul/IMG_0001.HEIC'
    )
    expect(result.attemptedCount).toBe(1)
    expect(result.succeededCount).toBe(1)
    expect(result.failedCount).toBe(0)

    const updatedPhoto = result.index.photos.find((p) => p.id === 'photo-1')
    expect(updatedPhoto?.thumbnailRelativePath).toBe(
      '.photo-organizer/thumbnails/abc123.webp'
    )

    const updatedGroup = result.index.groups.find((g) => g.id === 'group-1')
    expect(updatedGroup?.representativeThumbnailRelativePath).toBe(
      '.photo-organizer/thumbnails/abc123.webp'
    )

    expect(savedIndexes).toHaveLength(1)
  })

  it('counts failures without saving when every attempt fails', async () => {
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn()
    }
    const thumbnailGenerator = {
      generateForPhoto: vi.fn().mockRejectedValue(new Error('decode failed'))
    }
    const useCase = new GenerateMissingThumbnailsUseCase(store, thumbnailGenerator)

    const result = await useCase.execute({
      outputRoot: 'C:/photos/output',
      pathSegments: ['2026', '04', 'seoul']
    })

    expect(result.attemptedCount).toBe(1)
    expect(result.succeededCount).toBe(0)
    expect(result.failedCount).toBe(1)
    expect(store.save).not.toHaveBeenCalled()
  })

  it('does not attempt photos already at the folder that have a thumbnail, are videos, or live under a different path', async () => {
    const store = {
      load: vi.fn().mockResolvedValue(createLibraryIndex()),
      save: vi.fn()
    }
    const thumbnailGenerator = {
      generateForPhoto: vi.fn().mockResolvedValue('unused.webp')
    }
    const useCase = new GenerateMissingThumbnailsUseCase(store, thumbnailGenerator)

    const result = await useCase.execute({
      outputRoot: 'C:/photos/output',
      pathSegments: ['2026', '99', 'nowhere']
    })

    expect(result.attemptedCount).toBe(0)
    expect(thumbnailGenerator.generateForPhoto).not.toHaveBeenCalled()
  })
})
