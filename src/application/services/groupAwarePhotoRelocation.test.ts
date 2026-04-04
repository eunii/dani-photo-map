import { describe, expect, it } from 'vitest'

import { toRenameablePhoto } from '@application/services/groupAwarePhotoRelocation'
import type { Photo } from '@domain/entities/Photo'

function minimalPhoto(
  overrides: Partial<Photo> & Pick<Photo, 'id' | 'outputRelativePath'>
): Photo {
  return {
    sourcePath: 'C:/in.jpg',
    sourceFileName: 'in.jpg',
    isDuplicate: false,
    metadataIssues: [],
    ...overrides
  }
}

describe('toRenameablePhoto', () => {
  it('returns null when output path has fewer than year/month/file', () => {
    expect(
      toRenameablePhoto(
        minimalPhoto({
          id: 'p1',
          outputRelativePath: '2026/photo.jpg'
        })
      )
    ).toBeNull()
  })

  it('uses base when path is year/month/file and regionName is missing', () => {
    const r = toRenameablePhoto(
      minimalPhoto({
        id: 'p1',
        outputRelativePath: '2026/04/2026-04-03_080000_IMG.JPG'
      })
    )
    expect(r).not.toBeNull()
    expect(r?.regionName).toBe('base')
  })

  it('uses parent folder as region when path has four or more segments', () => {
    const r = toRenameablePhoto(
      minimalPhoto({
        id: 'p1',
        outputRelativePath: '2026/04/seoul/2026-04-03_080000_IMG.JPG'
      })
    )
    expect(r?.regionName).toBe('seoul')
  })
})
