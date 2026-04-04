import { describe, expect, it } from 'vitest'

import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import { toLibraryIndexView } from '@presentation/common/mappers/toLibraryIndexView'

function createLibraryIndex(): LibraryIndex {
  return {
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
        outputRelativePath: '2026/04/seoul/IMG_0001.JPG',
        thumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp',
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-2',
        sourcePath: 'C:/photos/source/IMG_0002.JPG',
        sourceFileName: 'IMG_0002.JPG',
        outputRelativePath: '2026/04/base/IMG_0002.JPG',
        isDuplicate: false,
        metadataIssues: []
      }
    ],
    groups: [
      {
        id: 'group-1',
        groupKey: 'group|region=seoul|year=2026|month=04|day=03|slot=1',
        title: '서울 산책',
        displayTitle: '2026-04-03 seoul',
        photoIds: ['photo-1', 'photo-2'],
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
  }
}

describe('toLibraryIndexView', () => {
  it('maps library index entities to renderer-friendly view data', () => {
    const view = toLibraryIndexView(createLibraryIndex())

    expect(view.outputRoot).toBe('C:/photos/output')
    expect(view.groups[0]).toMatchObject({
      id: 'group-1',
      photoCount: 2,
      representativePhotoId: 'photo-1',
      photos: [
        {
          id: 'photo-1',
          capturedAtSource: 'exif-date-time-original',
          hasGps: true
        },
        {
          id: 'photo-2',
          hasGps: false
        }
      ]
    })
    expect(view.mapGroups[0]).toMatchObject({
      id: 'group-1',
      latitude: 37.5665,
      longitude: 126.978,
      representativeThumbnailRelativePath: '.photo-organizer/thumbnails/photo-1.webp'
    })
  })
})
