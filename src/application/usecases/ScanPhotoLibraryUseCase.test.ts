import { describe, expect, it, vi } from 'vitest'

import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { PhotoFileConflictError } from '@application/ports/PhotoLibraryFileSystemPort'
import { ScanPhotoLibraryUseCase } from '@application/usecases/ScanPhotoLibraryUseCase'

function createUseCaseDependencies() {
  let savedIndex: LibraryIndex | null = null

  return {
    dependencies: {
      fileSystem: {
        listPhotoFiles: vi.fn<() => Promise<string[]>>(),
        listDirectoryFileNames: vi.fn<() => Promise<string[]>>(),
        ensureDirectory: vi.fn<() => Promise<void>>(),
        copyFile: vi.fn<() => Promise<void>>(),
        moveFile: vi.fn<() => Promise<void>>()
      },
      metadataReader: {
        read: vi.fn()
      },
      hasher: {
        createSha256: vi.fn()
      },
      regionResolver: {
        resolveName: vi.fn()
      },
      thumbnailGenerator: {
        generateForPhoto: vi.fn()
      },
      libraryIndexStore: {
        load: vi.fn(),
        save: vi.fn(async (index: LibraryIndex) => {
          savedIndex = index
        })
      },
      existingOutputScanner: {
        scan: vi.fn().mockResolvedValue({
          outputRoot: 'C:/output',
          photos: []
        })
      },
      rules: defaultOrganizationRules
    },
    getSavedIndex() {
      return savedIndex
    }
  }
}

describe('ScanPhotoLibraryUseCase', () => {
  it('collects non-fatal metadata and thumbnail warnings while keeping the photo', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0001.JPG'
    ])
    dependencies.metadataReader.read.mockRejectedValue(new Error('bad exif'))
    dependencies.hasher.createSha256.mockResolvedValue('hash-1')
    dependencies.thumbnailGenerator.generateForPhoto.mockRejectedValue(
      new Error('sharp failed')
    )

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output'
    })

    expect(result.scannedCount).toBe(1)
    expect(result.keptCount).toBe(1)
    expect(result.copiedCount).toBe(1)
    expect(result.skippedExistingCount).toBe(0)
    expect(result.failureCount).toBe(0)
    expect(result.warningCount).toBe(2)
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'metadata-read-failed',
      'thumbnail-generation-failed'
    ])
    expect(getSavedIndex()?.photos[0]?.metadataIssues).toEqual([
      'metadata-read-failed',
      'thumbnail-generation-failed'
    ])
  })

  it('records a structured failure when a unique photo cannot be copied', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0001.JPG',
      'C:\\source\\IMG_0002.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({})
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('hash-1')
      .mockResolvedValueOnce('hash-2')
    dependencies.fileSystem.copyFile
      .mockRejectedValueOnce(
        new PhotoFileConflictError(
          'C:/output/0000/00/location-unknown/0000-00-00_000000_IMG_0001.JPG'
        )
      )
      .mockResolvedValueOnce(undefined)
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output'
    })

    expect(result.scannedCount).toBe(2)
    expect(result.keptCount).toBe(1)
    expect(result.copiedCount).toBe(1)
    expect(result.skippedExistingCount).toBe(0)
    expect(result.failureCount).toBe(1)
    expect(result.warningCount).toBe(0)
    expect(result.issues[0]).toMatchObject({
      code: 'copy-destination-conflict',
      severity: 'error',
      stage: 'copy',
      sourcePath: 'C:/source/IMG_0001.JPG'
    })
    expect(getSavedIndex()?.photos).toHaveLength(1)
    expect(getSavedIndex()?.photos[0]?.sourceFileName).toBe('IMG_0002.JPG')
  })

  it('marks later files as duplicates when hashes match', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0001.JPG',
      'C:\\source\\IMG_0002.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: []
    })
    dependencies.hasher.createSha256.mockResolvedValue('same-hash')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output'
    })

    expect(result.duplicateCount).toBe(1)
    expect(result.keptCount).toBe(1)
    expect(result.copiedCount).toBe(1)
    expect(getSavedIndex()?.photos).toHaveLength(1)
    expect(getSavedIndex()?.photos[0]?.isDuplicate).toBe(false)
    expect(getSavedIndex()?.photos[0]?.thumbnailRelativePath).toBe(
      '.photo-organizer/thumbnails/thumb.webp'
    )
    expect(dependencies.fileSystem.copyFile).toHaveBeenCalledTimes(1)
  })

  it('keeps the older duplicate as the canonical photo even when it appears later', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0002.JPG',
      'C:\\source\\IMG_0001.JPG'
    ])
    dependencies.metadataReader.read
      .mockResolvedValueOnce({
        capturedAt: {
          iso: '2026-04-03T10:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '100000'
        },
        capturedAtSource: 'exif-date-time-original',
        metadataIssues: []
      })
      .mockResolvedValueOnce({
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        },
        capturedAtSource: 'exif-date-time-original',
        metadataIssues: []
      })
    dependencies.hasher.createSha256.mockResolvedValue('same-hash')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output'
    })

    expect(result.duplicateCount).toBe(1)
    expect(result.keptCount).toBe(1)
    expect(getSavedIndex()?.photos).toMatchObject([
      {
        id: 'photo-2',
        sourceFileName: 'IMG_0001.JPG',
        isDuplicate: false
      }
    ])
    expect(dependencies.fileSystem.copyFile).toHaveBeenCalledWith(
      'C:/source/IMG_0001.JPG',
      'C:/output/2026/04/location-unknown/2026-04-03_080000_IMG_0001.JPG'
    )
  })

  it('records a region resolve warning and falls back to unknown region', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0001.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: [],
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      }
    })
    dependencies.hasher.createSha256.mockResolvedValue('hash-1')
    dependencies.regionResolver.resolveName.mockRejectedValue(
      new Error('resolver unavailable')
    )
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output'
    })

    expect(result.warningCount).toBe(1)
    expect(result.issues[0]).toMatchObject({
      code: 'region-resolve-failed',
      severity: 'warning',
      stage: 'region-resolve'
    })
    expect(getSavedIndex()?.photos[0]).toMatchObject({
      regionName: 'location-unknown',
      metadataIssues: ['region-resolve-failed']
    })
  })

  it('applies provided group title overrides to newly organized groups', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_1001.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: [],
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      },
      capturedAt: {
        iso: '2026-04-03T08:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '080000'
      }
    })
    dependencies.hasher.createSha256.mockResolvedValue('hash-title-1')
    dependencies.regionResolver.resolveName.mockResolvedValue('seoul')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output',
      groupTitleOverrides: [
        {
          groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
          title: '서울 산책'
        }
      ]
    })

    expect(getSavedIndex()?.groups[0]).toMatchObject({
      title: '서울 산책',
      displayTitle: '2026-04-03 seoul'
    })
  })

  it('skips copying when the same SHA-256 already exists anywhere in the output', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0003.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: [],
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      }
    })
    dependencies.existingOutputScanner.scan.mockResolvedValue({
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'fallback-photo-a',
          sourcePath: 'C:/output/2026/04/busan/2026-04-01_090000_IMG_9999.JPG',
          sourceFileName: '2026-04-01_090000_IMG_9999.JPG',
          capturedAt: {
            iso: '2026-04-01T09:00:00.000Z',
            year: '2026',
            month: '04',
            day: '01',
            time: '090000'
          },
          regionName: 'busan',
          outputRelativePath: '2026/04/busan/2026-04-01_090000_IMG_9999.JPG'
        }
      ]
    })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('existing-hash')
      .mockResolvedValueOnce('existing-hash')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output'
    })

    expect(result.scannedCount).toBe(1)
    expect(result.keptCount).toBe(0)
    expect(result.copiedCount).toBe(0)
    expect(result.skippedExistingCount).toBe(1)
    expect(dependencies.fileSystem.copyFile).not.toHaveBeenCalled()
    expect(getSavedIndex()?.photos).toHaveLength(1)
    expect(getSavedIndex()?.photos[0]?.outputRelativePath).toBe(
      '2026/04/busan/2026-04-01_090000_IMG_9999.JPG'
    )
  })
})
