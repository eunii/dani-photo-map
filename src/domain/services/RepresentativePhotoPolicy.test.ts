import { describe, expect, it } from 'vitest'

import type { Photo } from '@domain/entities/Photo'
import { selectRepresentativePhoto } from '@domain/services/RepresentativePhotoPolicy'

function createPhoto(overrides: Partial<Photo> & Pick<Photo, 'id' | 'sourceFileName'>): Photo {
  return {
    id: overrides.id,
    sourcePath: overrides.sourcePath ?? `C:/photos/${overrides.sourceFileName}`,
    sourceFileName: overrides.sourceFileName,
    sha256: overrides.sha256,
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

describe('RepresentativePhotoPolicy', () => {
  it('prefers photos with gps over photos without gps', () => {
    const representative = selectRepresentativePhoto([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0001.JPG',
        thumbnailRelativePath: 'thumb-1.webp'
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0002.JPG',
        gps: {
          latitude: 37.5665,
          longitude: 126.978
        }
      })
    ])

    expect(representative?.id).toBe('photo-2')
  })

  it('breaks ties using thumbnail availability and capturedAt source quality', () => {
    const representative = selectRepresentativePhoto([
      createPhoto({
        id: 'photo-1',
        sourceFileName: 'IMG_0001.JPG',
        capturedAtSource: 'file-modified-at'
      }),
      createPhoto({
        id: 'photo-2',
        sourceFileName: 'IMG_0002.JPG',
        thumbnailRelativePath: 'thumb-2.webp',
        capturedAtSource: 'exif-create-date'
      })
    ])

    expect(representative?.id).toBe('photo-2')
  })
})
