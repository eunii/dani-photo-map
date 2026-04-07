import { describe, expect, it, vi } from 'vitest'

import {
  LIBRARY_INDEX_VERSION
} from '@domain/entities/LibraryIndex'
import { LoadLibraryGroupDetailUseCase } from '@application/usecases/LoadLibraryGroupDetailUseCase'

describe('LoadLibraryGroupDetailUseCase', () => {
  it('rebuilds the current output with stored gps metadata when the stored group id no longer matches', async () => {
    const libraryIndexStore = {
      load: vi.fn().mockResolvedValue({
        version: LIBRARY_INDEX_VERSION,
        generatedAt: '2026-04-03T10:11:12.000Z',
        sourceRoot: 'C:/photos/source',
        outputRoot: 'C:/photos/output',
        photos: [
          {
            id: 'stored-photo-1',
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
              latitude: 36.5786,
              longitude: -118.2923
            },
            originalGps: {
              latitude: 36.5786,
              longitude: -118.2923
            },
            thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
            regionName: 'california',
            folderGroupingLabel: '요세미티_국립공원그룹',
            outputRelativePath:
              '2026/04/요세미티_국립공원그룹/2026-04-03_080000_IMG_0001.JPG',
            isDuplicate: false,
            metadataIssues: []
          }
        ],
        groups: [
          {
            id: 'legacy-group-id',
            groupKey: 'legacy-group-id',
            title: '서울 산책',
            displayTitle: '서울 산책',
            photoIds: ['stored-photo-1'],
            representativePhotoId: 'stored-photo-1',
            representativeGps: {
              latitude: 36.5786,
              longitude: -118.2923
            },
            representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
            companions: [],
            notes: undefined
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
    const useCase = new LoadLibraryGroupDetailUseCase(
      libraryIndexStore,
      existingOutputScanner
    )

    const result = await useCase.execute({
      outputRoot: 'C:/photos/output',
      groupId:
        'group|region=%EC%9A%94%EC%84%B8%EB%AF%B8%ED%8B%B0_%EA%B5%AD%EB%A6%BD%EA%B3%B5%EC%9B%90%EA%B7%B8%EB%A3%B9|year=2026|month=04|basis=month|day=00|slot=1',
      pathSegments: ['2026', '04', '요세미티_국립공원그룹']
    })

    expect(existingOutputScanner.scan).toHaveBeenCalledWith('C:/photos/output')
    expect(existingOutputScanner.scanGroupPhotos).not.toHaveBeenCalled()
    expect(result.group).toMatchObject({
      displayTitle: '요세미티_국립공원그룹',
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
      thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp'
    })
  })
})
