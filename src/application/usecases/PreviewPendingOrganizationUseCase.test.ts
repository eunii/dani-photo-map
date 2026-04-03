import { describe, expect, it, vi } from 'vitest'

import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { PreviewPendingOrganizationUseCase } from '@application/usecases/PreviewPendingOrganizationUseCase'

function createDependencies() {
  return {
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
    photoPreview: {
      createDataUrl: vi.fn()
    },
    libraryIndexStore: {
      load: vi.fn(),
      save: vi.fn()
    },
    existingOutputScanner: {
      scan: vi.fn()
    },
    rules: defaultOrganizationRules
  }
}

describe('PreviewPendingOrganizationUseCase', () => {
  it('returns pending groups with nearby existing title suggestions', async () => {
    const dependencies = createDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0001.JPG'
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
      },
      capturedAtSource: 'exif-date-time-original'
    })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('new-hash')
      .mockResolvedValueOnce('existing-hash')
    dependencies.regionResolver.resolveName.mockResolvedValue('seoul')
    dependencies.photoPreview.createDataUrl.mockResolvedValue(
      'data:image/webp;base64,preview'
    )
    dependencies.existingOutputScanner.scan.mockResolvedValue({
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'fallback-existing-photo',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-01_090000_IMG_9999.JPG',
          sourceFileName: '2026-04-01_090000_IMG_9999.JPG',
          capturedAt: {
            iso: '2026-04-01T09:00:00.000Z',
            year: '2026',
            month: '04',
            day: '01',
            time: '090000'
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-01_090000_IMG_9999.JPG'
        }
      ]
    })
    dependencies.libraryIndexStore.load.mockResolvedValue({
      version: LIBRARY_INDEX_VERSION,
      generatedAt: '2026-04-03T10:11:12.000Z',
      sourceRoot: 'C:/photos/source',
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'stored-photo-1',
          sourcePath: 'C:/photos/source/IMG_9999.JPG',
          sourceFileName: 'IMG_9999.JPG',
          capturedAt: {
            iso: '2026-04-01T09:00:00.000Z',
            year: '2026',
            month: '04',
            day: '01',
            time: '090000'
          },
          capturedAtSource: 'exif-date-time-original',
          gps: {
            latitude: 37.5666,
            longitude: 126.9781
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-01_090000_IMG_9999.JPG',
          thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
          isDuplicate: false,
          metadataIssues: []
        }
      ],
      groups: [
        {
          id: 'group|region=seoul|year=2026|month=04|day=01|slot=1',
          groupKey: 'group|region=seoul|year=2026|month=04|day=01|slot=1',
          title: '서울 산책',
          displayTitle: '2026-04-01 seoul',
          photoIds: ['stored-photo-1'],
          representativePhotoId: 'stored-photo-1',
          representativeGps: {
            latitude: 37.5666,
            longitude: 126.9781
          },
          representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
          companions: [],
          notes: undefined
        }
      ]
    })

    const useCase = new PreviewPendingOrganizationUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output'
    })

    expect(result.scannedCount).toBe(1)
    expect(result.pendingPhotoCount).toBe(1)
    expect(result.skippedExistingCount).toBe(0)
    expect(result.groups[0]).toMatchObject({
      displayTitle: '2026-04-03 seoul',
      suggestedTitles: ['서울 산책'],
      photoCount: 1
    })
    expect(result.groups[0]?.representativePhotos[0]).toMatchObject({
      sourceFileName: 'IMG_0001.JPG',
      hasGps: true,
      previewDataUrl: 'data:image/webp;base64,preview'
    })
  })
})
