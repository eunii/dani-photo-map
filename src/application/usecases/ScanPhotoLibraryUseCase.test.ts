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

  it('applies provided group metadata overrides to newly organized groups', async () => {
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
      groupMetadataOverrides: [
        {
          groupKey: 'group|region=seoul|year=2026|month=04|day=00|slot=1',
          title: '서울 산책',
          companions: ['Alice', ' Bob '],
          notes: '  봄 산책 메모  '
        }
      ]
    })

    expect(getSavedIndex()?.groups[0]).toMatchObject({
      title: '서울 산책',
      displayTitle: '2026-04 seoul',
      companions: ['Alice', 'Bob'],
      notes: '봄 산책 메모'
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
    dependencies.libraryIndexStore.load.mockResolvedValue({
      version: 1,
      generatedAt: '2026-04-03T12:00:00.000Z',
      sourceRoot: 'C:/source',
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'indexed-output',
          sourcePath: 'C:/output/2026/04/busan/2026-04-01_090000_IMG_9999.JPG',
          sourceFileName: '2026-04-01_090000_IMG_9999.JPG',
          sha256: 'existing-hash',
          outputRelativePath: '2026/04/busan/2026-04-01_090000_IMG_9999.JPG',
          isDuplicate: false,
          metadataIssues: []
        }
      ],
      groups: []
    })
    dependencies.hasher.createSha256.mockResolvedValue('existing-hash')

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
    expect(dependencies.hasher.createSha256).toHaveBeenCalledTimes(1)
    expect(getSavedIndex()?.photos).toHaveLength(1)
    expect(getSavedIndex()?.photos[0]?.outputRelativePath).toBe(
      '2026/04/busan/2026-04-01_090000_IMG_9999.JPG'
    )
  })

  it('moves gps-missing photos into a selected existing group during scan without changing file hashes', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_2001.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: ['gps-missing'],
      missingGpsCategory: 'missing-original-gps',
      capturedAt: {
        iso: '2026-04-03T11:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '110000'
      }
    })
    dependencies.existingOutputScanner.scan.mockResolvedValue({
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'fallback-photo-1',
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
      version: 1,
      generatedAt: '2026-04-03T12:00:00.000Z',
      sourceRoot: 'C:/source',
      outputRoot: 'C:/output',
      photos: [
        {
          id: 'stored-photo-1',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-03_083000_IMG_9999.JPG',
          sourceFileName: '2026-04-03_083000_IMG_9999.JPG',
          sha256: 'existing-hash',
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
          thumbnailRelativePath: '.photo-organizer/thumbnails/existing.webp',
          isDuplicate: false,
          metadataIssues: []
        }
      ],
      groups: [
        {
          id: 'group|region=seoul|year=2026|month=04|day=00|slot=1',
          groupKey: 'group|region=seoul|year=2026|month=04|day=00|slot=1',
          title: '서울 산책',
          displayTitle: '2026-04 seoul',
          photoIds: ['stored-photo-1'],
          representativePhotoId: 'stored-photo-1',
          representativeGps: {
            latitude: 37.5665,
            longitude: 126.978
          },
          representativeThumbnailRelativePath: '.photo-organizer/thumbnails/existing.webp',
          companions: [],
          notes: undefined
        }
      ]
    })
    // Existing output hash comes from stored index; only the source file is hashed on disk.
    dependencies.hasher.createSha256.mockResolvedValueOnce('new-hash')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output',
      pendingGroupAssignments: [
        {
          groupKey: 'group|region=location-unknown|year=2026|month=04|day=00|slot=1',
          targetGroupId: 'group|region=seoul|year=2026|month=04|day=00|slot=1'
        }
      ]
    })

    const movedPhoto = getSavedIndex()?.photos.find((photo) => photo.id === 'photo-1')

    expect(movedPhoto).toMatchObject({
      sha256: 'new-hash',
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      },
      locationSource: 'assigned-from-group',
      regionName: 'seoul',
      outputRelativePath: '2026/04/seoul/2026-04-03_1100_서울_산책_001.JPG'
    })
    expect(movedPhoto?.originalGps).toBeUndefined()
    expect(getSavedIndex()?.groups).toHaveLength(1)
    expect(getSavedIndex()?.groups[0]?.photoIds).toEqual(['fallback-photo-1', 'photo-1'])
    expect(dependencies.fileSystem.moveFile).toHaveBeenCalled()
  })

  it('splits gps-missing preview photos into multiple named groups while leaving the rest in the default group', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_3001.JPG',
      'C:\\source\\IMG_3002.JPG',
      'C:\\source\\IMG_3003.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: ['gps-missing'],
      missingGpsCategory: 'missing-original-gps',
      capturedAt: {
        iso: '2026-04-03T11:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '110000'
      }
    })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('hash-3001')
      .mockResolvedValueOnce('hash-3002')
      .mockResolvedValueOnce('hash-3003')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output',
      pendingCustomGroupSplits: [
        {
          groupKey: 'group|region=location-unknown|year=2026|month=04|day=00|slot=1',
          splitId: 'split-a',
          title: '카페',
          photoIds: ['photo-1']
        },
        {
          groupKey: 'group|region=location-unknown|year=2026|month=04|day=00|slot=1',
          splitId: 'split-b',
          title: '실내',
          photoIds: ['photo-2']
        }
      ]
    })

    expect(getSavedIndex()?.groups.map((group) => group.title).sort()).toEqual([
      '2026-04 location-unknown',
      '실내',
      '카페'
    ].sort())
    expect(
      Object.fromEntries(
        (getSavedIndex()?.groups ?? []).map((group) => [group.title, group.photoIds])
      )
    ).toEqual({
      '2026-04 location-unknown': ['photo-3'],
      카페: ['photo-1'],
      실내: ['photo-2']
    })
    expect(getSavedIndex()?.photos.find((photo) => photo.id === 'photo-1')).toMatchObject({
      manualGroupId: 'split-a',
      manualGroupTitle: '카페'
    })
    expect(getSavedIndex()?.photos.find((photo) => photo.id === 'photo-2')).toMatchObject({
      manualGroupId: 'split-b',
      manualGroupTitle: '실내'
    })
    expect(
      getSavedIndex()?.photos.find((photo) => photo.id === 'photo-3')?.manualGroupId
    ).toBeUndefined()
    expect(
      getSavedIndex()?.photos.find((photo) => photo.id === 'photo-3')?.manualGroupTitle
    ).toBeUndefined()
  })

  it('applies default group title manual ids so same title shares one manual bucket for non-split photos', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_4001.JPG',
      'C:\\source\\IMG_4002.JPG',
      'C:\\source\\IMG_4003.JPG'
    ])
    dependencies.metadataReader.read.mockResolvedValue({
      metadataIssues: ['gps-missing'],
      missingGpsCategory: 'missing-original-gps',
      capturedAt: {
        iso: '2026-04-03T11:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '110000'
      }
    })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('hash-4001')
      .mockResolvedValueOnce('hash-4002')
      .mockResolvedValueOnce('hash-4003')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output',
      defaultTitleManualPhotoIds: [
        { photoId: 'photo-1', title: '부산  당일' },
        { photoId: 'photo-2', title: '부산 당일' }
      ]
    })

    const p1 = getSavedIndex()?.photos.find((photo) => photo.id === 'photo-1')
    const p2 = getSavedIndex()?.photos.find((photo) => photo.id === 'photo-2')
    const p3 = getSavedIndex()?.photos.find((photo) => photo.id === 'photo-3')

    expect(p1?.manualGroupTitle).toBe('부산  당일')
    expect(p2?.manualGroupTitle).toBe('부산  당일')
    expect(p1?.manualGroupId).toBe(p2?.manualGroupId)
    expect(p1?.manualGroupId).toMatch(/^manual-default-title\|/)
    expect(p3?.manualGroupId).toBeUndefined()

    const titles = (getSavedIndex()?.groups ?? []).map((g) => g.title).sort()
    expect(titles).toContain('부산  당일')
  })

  it('merges groups that share the same title into one when a representative GPS group exists', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_GPS.JPG',
      'C:\\source\\IMG_NOGPS.JPG'
    ])
    dependencies.metadataReader.read
      .mockResolvedValueOnce({
        metadataIssues: [],
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        capturedAt: {
          iso: '2026-04-03T10:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '100000'
        }
      })
      .mockResolvedValueOnce({
        metadataIssues: ['gps-missing'],
        missingGpsCategory: 'missing-original-gps',
        capturedAt: {
          iso: '2026-04-03T11:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '110000'
        }
      })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('hash-gps')
      .mockResolvedValueOnce('hash-nogps')
    dependencies.regionResolver.resolveName.mockResolvedValue('seoul')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output',
      groupMetadataOverrides: [
        {
          groupKey: 'group|region=seoul|year=2026|month=04|day=00|slot=1',
          title: '동일제목',
          companions: [],
          notes: undefined
        },
        {
          groupKey:
            'group|region=location-unknown|year=2026|month=04|day=00|slot=1',
          title: '동일제목',
          companions: [],
          notes: undefined
        }
      ]
    })

    expect(getSavedIndex()?.groups).toHaveLength(1)
    expect(getSavedIndex()?.groups[0]?.title).toBe('동일제목')
    expect(getSavedIndex()?.groups[0]?.photoIds).toHaveLength(2)
    expect(dependencies.fileSystem.moveFile).toHaveBeenCalled()
  })

  it('merges groups that share the same title when no group has representative GPS', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_A.JPG',
      'C:\\source\\IMG_B.JPG'
    ])
    const noGpsMeta = {
      metadataIssues: ['gps-missing'] as string[],
      missingGpsCategory: 'missing-original-gps' as const,
      capturedAt: {
        iso: '2026-04-03T10:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '100000'
      }
    }
    dependencies.metadataReader.read
      .mockResolvedValueOnce({ ...noGpsMeta })
      .mockResolvedValueOnce({
        ...noGpsMeta,
        capturedAt: {
          iso: '2026-05-02T10:00:00.000Z',
          year: '2026',
          month: '05',
          day: '02',
          time: '100000'
        }
      })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('hash-a')
      .mockResolvedValueOnce('hash-b')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output',
      groupMetadataOverrides: [
        {
          groupKey:
            'group|region=location-unknown|year=2026|month=04|day=00|slot=1',
          title: '무GPS동일제목',
          companions: [],
          notes: undefined
        },
        {
          groupKey:
            'group|region=location-unknown|year=2026|month=05|day=00|slot=2',
          title: '무GPS동일제목',
          companions: [],
          notes: undefined
        }
      ]
    })

    expect(getSavedIndex()?.groups).toHaveLength(1)
    expect(getSavedIndex()?.groups[0]?.title).toBe('무GPS동일제목')
    expect(getSavedIndex()?.groups[0]?.photoIds).toHaveLength(2)
    expect(dependencies.fileSystem.moveFile).toHaveBeenCalled()
  })

  it('copies only photos whose groupKey is listed in copyGroupKeysInThisRun', async () => {
    const { dependencies, getSavedIndex } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_GPS.JPG',
      'C:\\source\\IMG_NOGPS.JPG'
    ])
    dependencies.metadataReader.read
      .mockResolvedValueOnce({
        metadataIssues: [],
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        capturedAt: {
          iso: '2026-04-03T10:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '100000'
        }
      })
      .mockResolvedValueOnce({
        metadataIssues: ['gps-missing'],
        missingGpsCategory: 'missing-original-gps',
        capturedAt: {
          iso: '2026-04-03T11:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '110000'
        }
      })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('hash-gps')
      .mockResolvedValueOnce('hash-nogps')
    dependencies.regionResolver.resolveName.mockResolvedValue('seoul')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    const result = await useCase.execute({
      sourceRoot: 'C:\\source',
      outputRoot: 'C:\\output',
      copyGroupKeysInThisRun: [
        'group|region=seoul|year=2026|month=04|day=00|slot=1'
      ]
    })

    expect(result.copiedCount).toBe(1)
    expect(dependencies.fileSystem.copyFile).toHaveBeenCalledTimes(1)
    expect(getSavedIndex()?.photos).toHaveLength(1)
    expect(getSavedIndex()?.photos[0]?.regionName).toBe('seoul')
  })

  it('emits prepare then fileFlowComplete progress (copy filter: one of two photos)', async () => {
    const { dependencies } = createUseCaseDependencies()

    dependencies.fileSystem.listPhotoFiles.mockResolvedValue([
      'C:\\source\\IMG_GPS.JPG',
      'C:\\source\\IMG_NOGPS.JPG'
    ])
    dependencies.metadataReader.read
      .mockResolvedValueOnce({
        metadataIssues: [],
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        },
        capturedAt: {
          iso: '2026-04-03T10:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '100000'
        }
      })
      .mockResolvedValueOnce({
        metadataIssues: ['gps-missing'],
        missingGpsCategory: 'missing-original-gps',
        capturedAt: {
          iso: '2026-04-03T11:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '110000'
        }
      })
    dependencies.hasher.createSha256
      .mockResolvedValueOnce('hash-gps')
      .mockResolvedValueOnce('hash-nogps')
    dependencies.regionResolver.resolveName.mockResolvedValue('seoul')
    dependencies.thumbnailGenerator.generateForPhoto.mockResolvedValue('thumb.webp')

    const progress: Array<{ kind: string; completed: number; total: number }> =
      []
    const useCase = new ScanPhotoLibraryUseCase(dependencies)
    await useCase.execute(
      {
        sourceRoot: 'C:\\source',
        outputRoot: 'C:\\output',
        copyGroupKeysInThisRun: [
          'group|region=seoul|year=2026|month=04|day=00|slot=1'
        ]
      },
      {
        onScanProgress: (payload) => {
          progress.push({
            kind: payload.kind,
            completed: payload.completed,
            total: payload.total
          })
        }
      }
    )

    expect(progress.filter((p) => p.kind === 'prepare')).toEqual([
      { kind: 'prepare', completed: 1, total: 2 },
      { kind: 'prepare', completed: 2, total: 2 }
    ])
    expect(progress.filter((p) => p.kind === 'fileFlowComplete')).toEqual([
      { kind: 'fileFlowComplete', completed: 1, total: 1 }
    ])
  })
})
