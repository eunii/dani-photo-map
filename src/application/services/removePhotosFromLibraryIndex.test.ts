import { describe, expect, it } from 'vitest'

import { removePhotosFromLibraryIndex } from '@application/services/removePhotosFromLibraryIndex'
import { LIBRARY_INDEX_VERSION, type LibraryIndex } from '@domain/entities/LibraryIndex'

describe('removePhotosFromLibraryIndex', () => {
  it('drops photos and removes empty groups', () => {
    const index: LibraryIndex = {
      version: LIBRARY_INDEX_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      sourceRoot: 'C:/s',
      outputRoot: 'C:/o',
      photos: [
        {
          id: 'a',
          sourcePath: 'C:/s/a.jpg',
          sourceFileName: 'a.jpg',
          isDuplicate: false,
          metadataIssues: []
        },
        {
          id: 'b',
          sourcePath: 'C:/s/b.jpg',
          sourceFileName: 'b.jpg',
          isDuplicate: false,
          metadataIssues: []
        }
      ],
      groups: [
        {
          id: 'g1',
          groupKey: 'g1',
          title: 'G',
          displayTitle: 'G',
          photoIds: ['a'],
          companions: []
        },
        {
          id: 'g2',
          groupKey: 'g2',
          title: 'H',
          displayTitle: 'H',
          photoIds: ['b'],
          companions: []
        }
      ]
    }

    const next = removePhotosFromLibraryIndex(index, new Set(['a']))

    expect(next.photos.map((p) => p.id)).toEqual(['b'])
    expect(next.groups).toHaveLength(1)
    expect(next.groups[0]?.id).toBe('g2')
  })
})
