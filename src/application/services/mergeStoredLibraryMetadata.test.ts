import { describe, expect, it } from 'vitest'

import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'

describe('mergeStoredLibraryMetadata', () => {
  it('preserves sha256 and duplicateOfPhotoId from stored photos by output path', () => {
    const rebuilt = {
      version: LIBRARY_INDEX_VERSION,
      generatedAt: '2026-01-02T00:00:00.000Z',
      sourceRoot: 'C:/s',
      outputRoot: 'C:/o',
      photos: [
        {
          id: 'rebuilt-1',
          sourcePath: 'C:/o/out/a.jpg',
          sourceFileName: 'a.jpg',
          outputRelativePath: '2026/04/a.jpg',
          isDuplicate: false,
          metadataIssues: ['recovered-from-output'] as string[]
        }
      ],
      groups: []
    }

    const stored = {
      version: LIBRARY_INDEX_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      sourceRoot: 'C:/s',
      outputRoot: 'C:/o',
      photos: [
        {
          id: 'old-1',
          sourcePath: 'C:/o/out/a.jpg',
          sourceFileName: 'a.jpg',
          sha256: 'abc123',
          duplicateOfPhotoId: 'canonical-1',
          outputRelativePath: '2026/04/a.jpg',
          isDuplicate: true,
          metadataIssues: [] as string[]
        }
      ],
      groups: []
    }

    const merged = mergeStoredLibraryMetadata(rebuilt, stored)
    const photo = merged.photos[0]

    expect(photo?.sha256).toBe('abc123')
    expect(photo?.duplicateOfPhotoId).toBe('canonical-1')
  })
})
