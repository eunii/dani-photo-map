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
        ensureDirectory: vi.fn<() => Promise<void>>(),
        copyFile: vi.fn<() => Promise<void>>()
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

  it('skips a photo when copy destination already exists and records a structured failure', async () => {
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
})
