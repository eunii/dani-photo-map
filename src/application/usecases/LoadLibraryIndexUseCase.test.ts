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
      scanGroupSummaries: vi.fn()
    }
    const useCase = new LoadLibraryIndexUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:\\photos\\output'
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
      outputRoot: 'C:\\photos\\output'
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
        photos: [],
        groups: []
      }),
      save: vi.fn()
    }
    const existingOutputScanner = {
      scan: vi.fn(),
      scanGroupSummaries: vi.fn().mockResolvedValue([
        {
          id: 'folder-structure-group-1',
          groupKey: 'folder-structure-group-1',
          pathSegments: ['2026', '04', '요세미티_국립공원그룹'],
          title: '요세미티_국립공원그룹',
          displayTitle: '요세미티_국립공원그룹',
          photoCount: 2,
          representativeOutputRelativePath:
            '2026/04/요세미티_국립공원그룹/2026-04-03_080000_IMG_0001.JPG',
          representativeSourceFileName: '2026-04-03_080000_IMG_0001.JPG',
          regionLabel: '요세미티_국립공원그룹',
          earliestCapturedAt: {
            iso: '2026-04-03T08:00:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '080000'
          },
          latestCapturedAt: {
            iso: '2026-04-03T09:00:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '090000'
          },
          searchText: '요세미티 국립공원그룹'
        }
      ])
    }
    const useCase = new LoadLibraryIndexUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:\\photos\\output',
      mode: 'folder-structure-only'
    })

    expect(libraryIndexStore.load).not.toHaveBeenCalled()
    expect(existingOutputScanner.scanGroupSummaries).toHaveBeenCalledWith(
      'C:/photos/output'
    )
    expect(result.source).toBe('folder-structure')
    expect(result.index).toBeNull()
    expect(result.fallbackGroups?.[0]?.displayTitle).toBe('요세미티_국립공원그룹')
  })
})
