import { describe, expect, it, vi } from 'vitest'

import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'
import { LoadLibraryIndexUseCase } from '@application/usecases/LoadLibraryIndexUseCase'

describe('LoadLibraryIndexUseCase', () => {
  it('merges stored metadata with the scanned output snapshot', async () => {
    const libraryIndexStore = {
      load: vi.fn().mockResolvedValue({
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
            capturedAtSource: 'exif-date-time-original',
            gps: {
              latitude: 37.5665,
              longitude: 126.978
            },
            regionName: 'seoul',
            outputRelativePath: '2026/04/seoul/2026-04-03_080000_IMG_0001.JPG',
            thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
            isDuplicate: false,
            metadataIssues: []
          }
        ],
        groups: [
          {
            id: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
            groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
            title: '서울 산책',
            displayTitle: '2026-04-03 seoul',
            photoIds: ['photo-1'],
            representativePhotoId: 'photo-1',
            representativeGps: {
              latitude: 37.5665,
              longitude: 126.978
            },
            representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
            companions: ['Alice'],
            notes: 'sample'
          }
        ]
      }),
      save: vi.fn()
    }
    const existingOutputScanner = {
      scan: vi.fn(),
      scanGroupSummaries: vi.fn(),
      scanGroupPhotos: vi.fn()
    }
    const useCase = new LoadLibraryIndexUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:\\photos\\output',
      mode: 'default'
    })

    expect(libraryIndexStore.load).toHaveBeenCalledWith('C:/photos/output')
    expect(existingOutputScanner.scan).not.toHaveBeenCalled()
    expect(result.source).toBe('merged')
    expect(result.index?.groups[0]).toMatchObject({
      title: '서울 산책',
      companions: ['Alice'],
      notes: 'sample'
    })
    expect(result.index?.photos[0]).toMatchObject({
      gps: {
        latitude: 37.5665,
        longitude: 126.978
      }
    })
    expect(libraryIndexStore.save).not.toHaveBeenCalled()
  })

  it('falls back to scanning existing output when index loading fails', async () => {
    const libraryIndexStore = {
      load: vi.fn().mockRejectedValue(new Error('invalid json')),
      save: vi.fn()
    }
    const existingOutputScanner = {
      scan: vi.fn(),
      scanGroupPhotos: vi.fn(),
      scanGroupSummaries: vi.fn().mockResolvedValue([
        {
          id: 'fallback-group-1',
          groupKey: 'fallback-group-1',
          pathSegments: ['2026', '04', 'seoul'],
          title: 'seoul',
          displayTitle: 'seoul',
          photoCount: 1,
          representativeOutputRelativePath:
            '2026/04/seoul/2026-04-03_080000_IMG_0001.JPG',
          representativeSourceFileName: '2026-04-03_080000_IMG_0001.JPG',
          regionLabel: 'seoul',
          earliestCapturedAt: {
            iso: '2026-04-03T08:00:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '080000'
          },
          latestCapturedAt: {
            iso: '2026-04-03T08:00:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '080000'
          },
          searchText: 'seoul 2026-04-03_080000_img_0001.jpg'
        }
      ])
    }
    const useCase = new LoadLibraryIndexUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:\\photos\\output',
      mode: 'default'
    })

    expect(existingOutputScanner.scanGroupSummaries).toHaveBeenCalledWith(
      'C:/photos/output'
    )
    expect(result.source).toBe('fallback')
    expect(result.index).toBeNull()
    expect(result.fallbackGroups).toHaveLength(1)
    expect(libraryIndexStore.save).not.toHaveBeenCalled()
  })

  it('forces folder structure scan even when a stored index exists', async () => {
    const libraryIndexStore = {
      load: vi.fn().mockResolvedValue({
        version: LIBRARY_INDEX_VERSION,
        generatedAt: '2026-04-03T10:11:12.000Z',
        sourceRoot: 'C:/photos/source',
        outputRoot: 'C:/photos/output',
        photos: [
          {
            id: 'stored-photo-1',
            sourcePath:
              'C:/photos/source/2026-04-03_080000_IMG_0001.JPG',
            sourceFileName: '2026-04-03_080000_IMG_0001.JPG',
            capturedAt: {
              iso: '2026-04-03T08:00:00.000Z',
              year: '2026',
              month: '04',
              day: '03',
              time: '080000'
            },
            gps: {
              latitude: 36.5786,
              longitude: -118.2923
            },
            originalGps: {
              latitude: 36.5786,
              longitude: -118.2923
            },
            regionName: 'california',
            outputRelativePath:
              '2026/04/요세미티_국립공원그룹/2026-04-03_080000_IMG_0001.JPG',
            thumbnailRelativePath: '.photo-organizer/thumbnails/stored-photo-1.webp',
            isDuplicate: false,
            metadataIssues: []
          }
        ],
        groups: [
          {
            id: 'group|region=%EC%9A%94%EC%84%B8%EB%AF%B8%ED%8B%B0_%EA%B5%AD%EB%A6%BD%EA%B3%B5%EC%9B%90%EA%B7%B8%EB%A3%B9|year=2026|month=04|basis=month|day=00|slot=1',
            groupKey:
              'group|region=%EC%9A%94%EC%84%B8%EB%AF%B8%ED%8B%B0_%EA%B5%AD%EB%A6%BD%EA%B3%B5%EC%9B%90%EA%B7%B8%EB%A3%B9|year=2026|month=04|basis=month|day=00|slot=1',
            title: '요세미티_국립공원그룹',
            displayTitle: '요세미티_국립공원그룹',
            photoIds: ['stored-photo-1'],
            representativePhotoId: 'stored-photo-1',
            representativeGps: {
              latitude: 36.5786,
              longitude: -118.2923
            },
            representativeThumbnailRelativePath:
              '.photo-organizer/thumbnails/stored-photo-1.webp',
            companions: [],
            notes: 'saved'
          }
        ]
      }),
      save: vi.fn()
    }
    const existingOutputScanner = {
      scan: vi.fn().mockResolvedValue({
        outputRoot: 'C:/photos/output',
        photos: [
          {
            id: 'recovered-photo-1',
            sourcePath:
              'C:/photos/output/2026/04/요세미티_국립공원그룹/2026-04-03_080000_IMG_0001.JPG',
            sourceFileName: '2026-04-03_080000_IMG_0001.JPG',
            capturedAt: {
              iso: '2026-04-03T08:00:00.000Z',
              year: '2026',
              month: '04',
              day: '03',
              time: '080000'
            },
            regionName: '요세미티_국립공원그룹',
            folderGroupingLabel: '요세미티_국립공원그룹',
            outputRelativePath:
              '2026/04/요세미티_국립공원그룹/2026-04-03_080000_IMG_0001.JPG'
          }
        ]
      }),
      scanGroupSummaries: vi.fn(),
      scanGroupPhotos: vi.fn()
    }
    const useCase = new LoadLibraryIndexUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:\\photos\\output',
      mode: 'folder-structure-only'
    })

    expect(libraryIndexStore.load).toHaveBeenCalledWith(
      'C:/photos/output'
    )
    expect(existingOutputScanner.scan).toHaveBeenCalledWith('C:/photos/output')
    expect(existingOutputScanner.scanGroupSummaries).not.toHaveBeenCalled()
    expect(result.source).toBe('folder-structure')
    expect(result.fallbackGroups).toBeNull()
    expect(result.index?.groups[0]).toMatchObject({
      title: '요세미티_국립공원그룹',
      representativeGps: {
        latitude: 36.5786,
        longitude: -118.2923
      }
    })
    expect(result.index?.photos[0]).toMatchObject({
      gps: {
        latitude: 36.5786,
        longitude: -118.2923
      },
      thumbnailRelativePath: '.photo-organizer/thumbnails/stored-photo-1.webp'
    })
  })
})
