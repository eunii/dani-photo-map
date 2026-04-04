import { describe, expect, it, vi } from 'vitest'

import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { PreviewPendingOrganizationUseCase } from '@application/usecases/PreviewPendingOrganizationUseCase'

function createDependencies() {
  return {
    fileSystem: {
      listPhotoFiles: vi.fn<() => Promise<string[]>>(),
      listDirectoryFileNames: vi.fn<() => Promise<string[]>>().mockResolvedValue([]),
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
  it('inherits the existing title first when the same groupKey already exists', async () => {
    const dependencies = createDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0001.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: [],
      gps: {
        latitude: 37.476425,
        longitude: 127.04160277777778
      },
      capturedAt: {
        iso: '2026-04-02T05:16:15.000Z',
        year: '2026',
        month: '04',
        day: '02',
        time: '051615'
      },
      capturedAtSource: 'exif-date-time-original'
    })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('new-hash')
      .mockResolvedValueOnce('existing-output-hash-a')
      .mockResolvedValueOnce('existing-output-hash-b')
    dependencies.regionResolver.resolveName.mockResolvedValue('seoul')
    dependencies.photoPreview.createDataUrl.mockResolvedValue(
      'data:image/webp;base64,preview'
    )
    dependencies.existingOutputScanner.scan.mockResolvedValue({
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'fallback-photo-a',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-02_091013_A.jpg',
          sourceFileName: '2026-04-02_091013_A.jpg',
          capturedAt: {
            iso: '2026-04-02T09:10:13.000Z',
            year: '2026',
            month: '04',
            day: '02',
            time: '091013'
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-02_091013_A.jpg'
        },
        {
          id: 'fallback-photo-b',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-02_092012_B.jpg',
          sourceFileName: '2026-04-02_092012_B.jpg',
          capturedAt: {
            iso: '2026-04-02T09:20:12.000Z',
            year: '2026',
            month: '04',
            day: '02',
            time: '092012'
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-02_092012_B.jpg'
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
          id: 'fallback-photo-a',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-02_091013_A.jpg',
          sourceFileName: '2026-04-02_091013_A.jpg',
          capturedAt: {
            iso: '2026-04-02T09:10:13.000Z',
            year: '2026',
            month: '04',
            day: '02',
            time: '091013'
          },
          gps: {
            latitude: 37.47035555555556,
            longitude: 127.03779722222222
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-02_091013_A.jpg',
          thumbnailRelativePath: '.photo-organizer/thumbnails/a.webp',
          isDuplicate: false,
          metadataIssues: ['recovered-from-output']
        },
        {
          id: 'fallback-photo-b',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-02_092012_B.jpg',
          sourceFileName: '2026-04-02_092012_B.jpg',
          capturedAt: {
            iso: '2026-04-02T09:20:12.000Z',
            year: '2026',
            month: '04',
            day: '02',
            time: '092012'
          },
          gps: {
            latitude: 37.472725000000004,
            longitude: 127.03794166666667
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-02_092012_B.jpg',
          thumbnailRelativePath: '.photo-organizer/thumbnails/b.webp',
          isDuplicate: false,
          metadataIssues: ['recovered-from-output']
        }
      ],
      groups: [
        {
          id: 'group|region=seoul|year=2026|month=04|day=02|slot=1',
          groupKey: 'group|region=seoul|year=2026|month=04|day=02|slot=1',
          title: '2026-04-02_양재천',
          displayTitle: '2026-04-02 seoul',
          photoIds: ['fallback-photo-a', 'fallback-photo-b'],
          representativePhotoId: 'fallback-photo-a',
          representativeGps: {
            latitude: 37.47035555555556,
            longitude: 127.03779722222222
          },
          representativeThumbnailRelativePath: '.photo-organizer/thumbnails/a.webp',
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

    expect(result.groups[0]?.suggestedTitles[0]).toBe('2026-04-02_양재천')
    expect(dependencies.metadataReader.read).toHaveBeenCalledTimes(1)
  })

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
      displayTitle: '2026-04 seoul',
      suggestedTitles: ['서울 산책'],
      photoCount: 1
    })
    expect(result.groups[0]?.representativePhotos[0]).toMatchObject({
      sourceFileName: 'IMG_0001.JPG',
      hasGps: true,
      previewDataUrl: 'data:image/webp;base64,preview'
    })
  })

  it('falls back to same-day one-hour EXIF lookup when index gps suggestions are unavailable', async () => {
    const dependencies = createDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_0100.JPG'
    ])
    dependencies.metadataReader.read
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({
        metadataIssues: [],
        gps: {
          latitude: 37.5666,
          longitude: 126.9781
        }
      })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('existing-output-hash')
      .mockResolvedValueOnce('new-preview-hash')
    dependencies.regionResolver.resolveName.mockResolvedValue('seoul')
    dependencies.photoPreview.createDataUrl.mockResolvedValue(
      'data:image/webp;base64,preview'
    )
    dependencies.existingOutputScanner.scan.mockResolvedValue({
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'existing-photo-1',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-03_083000_IMG_9999.JPG',
          sourceFileName: '2026-04-03_083000_IMG_9999.JPG',
          capturedAt: {
            iso: '2026-04-03T08:30:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '083000'
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-03_083000_IMG_9999.JPG'
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
            iso: '2026-04-03T08:30:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '083000'
          },
          capturedAtSource: 'exif-date-time-original',
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-03_083000_IMG_9999.JPG',
          thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
          isDuplicate: false,
          metadataIssues: []
        }
      ],
      groups: [
        {
          id: 'group|region=seoul|year=2026|month=04|day=03|slot=2',
          groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=2',
          title: '서울 산책',
          displayTitle: '2026-04-03 seoul',
          photoIds: ['stored-photo-1'],
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

    expect(result.groups[0]?.suggestedTitles).toEqual(['서울 산책'])
    expect(dependencies.metadataReader.read).toHaveBeenCalledTimes(2)
  })
})
