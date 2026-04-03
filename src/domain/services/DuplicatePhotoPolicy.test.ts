import { describe, expect, it } from 'vitest'

import type { Photo } from '@domain/entities/Photo'
import { selectCanonicalDuplicatePhoto } from '@domain/services/DuplicatePhotoPolicy'

function createPhoto(overrides: Partial<Photo> & Pick<Photo, 'id' | 'sourceFileName'>): Photo {
  return {
    id: overrides.id,
    sourcePath: overrides.sourcePath ?? `C:/photos/${overrides.sourceFileName}`,
    sourceFileName: overrides.sourceFileName,
    sha256: overrides.sha256,
    duplicateOfPhotoId: overrides.duplicateOfPhotoId,
    capturedAt: overrides.capturedAt,
    capturedAtSource: overrides.capturedAtSource,
    gps: overrides.gps,
    regionName: overrides.regionName,
    outputRelativePath: overrides.outputRelativePath,
    thumbnailRelativePath: overrides.thumbnailRelativePath,
    isDuplicate: overrides.isDuplicate ?? false,
    metadataIssues: overrides.metadataIssues ?? []
  }
}

describe('DuplicatePhotoPolicy', () => {
  it('prefers the earlier captured photo as the canonical duplicate', () => {
    const canonicalPhoto = selectCanonicalDuplicatePhoto([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0001.JPG',
        capturedAt: {
          iso: '2026-04-03T09:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '090000'
        },
        capturedAtSource: 'exif-date-time-original'
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0002.JPG',
        capturedAt: {
          iso: '2026-04-03T08:00:00.000Z',
          year: '2026',
          month: '04',
          day: '03',
          time: '080000'
        },
        capturedAtSource: 'exif-date-time-original'
      })
    ])

    expect(canonicalPhoto?.id).toBe('photo-2')
  })

  it('falls back to stronger timestamp source and then path when capture time is tied', () => {
    const canonicalPhoto = selectCanonicalDuplicatePhoto([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0001.JPG',
        sourcePath: 'C:/photos/b/IMG_0001.JPG',
        capturedAtSource: 'file-modified-at'
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0002.JPG',
        sourcePath: 'C:/photos/a/IMG_0002.JPG',
        capturedAtSource: 'exif-create-date'
      })
    ])

    expect(canonicalPhoto?.id).toBe('photo-2')
  })
})
