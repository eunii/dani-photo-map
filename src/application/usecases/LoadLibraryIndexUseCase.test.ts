import { describe, expect, it, vi } from 'vitest'

import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'
import { LoadLibraryIndexUseCase } from '@application/usecases/LoadLibraryIndexUseCase'

describe('LoadLibraryIndexUseCase', () => {
  it('normalizes the output root before delegating to the store', async () => {
    const libraryIndexStore = {
      load: vi.fn().mockResolvedValue({
        version: LIBRARY_INDEX_VERSION,
        generatedAt: '2026-04-03T10:11:12.000Z',
        sourceRoot: 'C:/photos/source',
        outputRoot: 'C:/photos/output',
        photos: [],
        groups: []
      }),
      save: vi.fn()
    }
    const existingOutputScanner = {
      scan: vi.fn()
    }
    const useCase = new LoadLibraryIndexUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:\\photos\\output'
    })

    expect(libraryIndexStore.load).toHaveBeenCalledWith('C:/photos/output')
    expect(result.source).toBe('index')
    expect(existingOutputScanner.scan).not.toHaveBeenCalled()
  })

  it('falls back to scanning existing output when index loading fails', async () => {
    const libraryIndexStore = {
      load: vi.fn().mockRejectedValue(new Error('invalid json')),
      save: vi.fn()
    }
    const existingOutputScanner = {
      scan: vi.fn().mockResolvedValue({
        outputRoot: 'C:/photos/output',
        photos: [
          {
            id: 'fallback-photo-1',
            sourcePath: 'C:/photos/output/2026/04/seoul/2026-04-03_080000_IMG_0001.JPG',
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
    const useCase = new LoadLibraryIndexUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:\\photos\\output'
    })

    expect(existingOutputScanner.scan).toHaveBeenCalledWith('C:/photos/output')
    expect(result.source).toBe('fallback')
    expect(result.index?.groups).toHaveLength(1)
  })
})
