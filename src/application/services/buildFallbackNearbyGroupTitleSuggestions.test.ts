import { describe, expect, it, vi } from 'vitest'

import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'
import { buildFallbackNearbyGroupTitleSuggestions } from '@application/services/buildFallbackNearbyGroupTitleSuggestions'

describe('buildFallbackNearbyGroupTitleSuggestions', () => {
  it('returns a title when an existing output photo is on the same day within one hour and nearby', async () => {
    const metadataReader = {
      read: vi.fn().mockResolvedValue({
        metadataIssues: [],
        gps: {
          latitude: 37.5666,
          longitude: 126.9781
        }
      })
    }

    const suggestions = await buildFallbackNearbyGroupTitleSuggestions({
      currentGroup: {
        id: 'preview-group-1',
        representativeGps: {
          latitude: 37.5665,
          longitude: 126.978
        }
      },
      currentCapturedAtIso: '2026-04-03T08:00:00.000Z',
      existingOutputPhotos: [
        {
          id: 'existing-photo-1',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-03_083000_IMG_0001.JPG',
          sourceFileName: '2026-04-03_083000_IMG_0001.JPG',
          capturedAt: {
            iso: '2026-04-03T08:30:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '083000'
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-03_083000_IMG_0001.JPG'
        }
      ],
      existingIndex: {
        version: LIBRARY_INDEX_VERSION,
        generatedAt: '2026-04-03T10:11:12.000Z',
        sourceRoot: 'C:/photos/source',
        outputRoot: 'C:/output',
        photos: [
          {
            id: 'rebuilt-photo-1',
            sourcePath: 'C:/output/2026/04/seoul/2026-04-03_083000_IMG_0001.JPG',
            sourceFileName: '2026-04-03_083000_IMG_0001.JPG',
            outputRelativePath: '2026/04/seoul/2026-04-03_083000_IMG_0001.JPG',
            isDuplicate: false,
            metadataIssues: ['recovered-from-output']
          }
        ],
        groups: [
          {
            id: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
            groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
            title: '서울 산책',
            displayTitle: '2026-04-03 seoul',
            photoIds: ['rebuilt-photo-1'],
            companions: []
          }
        ]
      },
      metadataReader
    })

    expect(suggestions).toEqual(['서울 산책'])
  })

  it('excludes photos outside the one hour window', async () => {
    const metadataReader = {
      read: vi.fn().mockResolvedValue({
        metadataIssues: [],
        gps: {
          latitude: 37.5666,
          longitude: 126.9781
        }
      })
    }

    const suggestions = await buildFallbackNearbyGroupTitleSuggestions({
      currentGroup: {
        id: 'preview-group-1',
        representativeGps: {
          latitude: 37.5665,
          longitude: 126.978
        }
      },
      currentCapturedAtIso: '2026-04-03T08:00:00.000Z',
      existingOutputPhotos: [
        {
          id: 'existing-photo-1',
          sourcePath: 'C:/output/2026/04/seoul/2026-04-03_101500_IMG_0001.JPG',
          sourceFileName: '2026-04-03_101500_IMG_0001.JPG',
          capturedAt: {
            iso: '2026-04-03T10:15:00.000Z',
            year: '2026',
            month: '04',
            day: '03',
            time: '101500'
          },
          regionName: 'seoul',
          outputRelativePath: '2026/04/seoul/2026-04-03_101500_IMG_0001.JPG'
        }
      ],
      existingIndex: {
        version: LIBRARY_INDEX_VERSION,
        generatedAt: '2026-04-03T10:11:12.000Z',
        sourceRoot: 'C:/photos/source',
        outputRoot: 'C:/output',
        photos: [
          {
            id: 'rebuilt-photo-1',
            sourcePath: 'C:/output/2026/04/seoul/2026-04-03_101500_IMG_0001.JPG',
            sourceFileName: '2026-04-03_101500_IMG_0001.JPG',
            outputRelativePath: '2026/04/seoul/2026-04-03_101500_IMG_0001.JPG',
            isDuplicate: false,
            metadataIssues: ['recovered-from-output']
          }
        ],
        groups: [
          {
            id: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
            groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
            title: '서울 산책',
            displayTitle: '2026-04-03 seoul',
            photoIds: ['rebuilt-photo-1'],
            companions: []
          }
        ]
      },
      metadataReader
    })

    expect(suggestions).toEqual([])
    expect(metadataReader.read).not.toHaveBeenCalled()
  })
})
