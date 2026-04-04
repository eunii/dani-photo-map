import { describe, expect, it, vi } from 'vitest'

import {
  buildExistingOutputHashSet,
  sha256ByOutputRelativePathFromStoredIndex
} from '@application/services/buildExistingOutputHashSet'
import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'

describe('sha256ByOutputRelativePathFromStoredIndex', () => {
  it('returns empty map when stored index is null', () => {
    expect(sha256ByOutputRelativePathFromStoredIndex(null).size).toBe(0)
  })

  it('maps outputRelativePath to sha256 when both are present', () => {
    const map = sha256ByOutputRelativePathFromStoredIndex({
      version: LIBRARY_INDEX_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      sourceRoot: 'C:/s',
      outputRoot: 'C:/o',
      photos: [
        {
          id: 'a',
          sourcePath: 'C:/o/a.jpg',
          sourceFileName: 'a.jpg',
          sha256: 'aaa',
          outputRelativePath: '2026/04/x/a.jpg',
          isDuplicate: false,
          metadataIssues: []
        },
        {
          id: 'b',
          sourcePath: 'C:/o/b.jpg',
          sourceFileName: 'b.jpg',
          outputRelativePath: '2026/04/x/b.jpg',
          isDuplicate: false,
          metadataIssues: []
        }
      ],
      groups: []
    })

    expect(map.get('2026/04/x/a.jpg')).toBe('aaa')
    expect(map.has('2026/04/x/b.jpg')).toBe(false)
  })
})

describe('buildExistingOutputHashSet', () => {
  it('adds hashes from stored index without calling hasher for those paths', async () => {
    const createSha256 = vi.fn().mockResolvedValue('disk-hash')

    const { hashes } = await buildExistingOutputHashSet({
      snapshot: {
        outputRoot: 'C:/o',
        photos: [
          {
            id: 'snap-1',
            sourcePath: 'C:/o/2026/04/a.jpg',
            sourceFileName: 'a.jpg',
            outputRelativePath: '2026/04/a.jpg'
          }
        ]
      },
      storedIndex: {
        version: LIBRARY_INDEX_VERSION,
        generatedAt: '2026-01-01T00:00:00.000Z',
        sourceRoot: 'C:/s',
        outputRoot: 'C:/o',
        photos: [
          {
            id: 'stored-1',
            sourcePath: 'C:/o/2026/04/a.jpg',
            sourceFileName: 'a.jpg',
            sha256: 'from-index',
            outputRelativePath: '2026/04/a.jpg',
            isDuplicate: false,
            metadataIssues: []
          }
        ],
        groups: []
      },
      hasher: { createSha256 }
    })

    expect(hashes.has('from-index')).toBe(true)
    expect(createSha256).not.toHaveBeenCalled()
  })

  it('falls back to hasher when stored index has no hash for that path', async () => {
    const createSha256 = vi.fn().mockResolvedValue('from-disk')

    const { hashes, hashToOutputRelativePath } = await buildExistingOutputHashSet({
      snapshot: {
        outputRoot: 'C:/o',
        photos: [
          {
            id: 'snap-1',
            sourcePath: 'C:/o/2026/04/a.jpg',
            sourceFileName: 'a.jpg',
            outputRelativePath: '2026/04/a.jpg'
          }
        ]
      },
      storedIndex: null,
      hasher: { createSha256 }
    })

    expect(hashes.has('from-disk')).toBe(true)
    expect(hashToOutputRelativePath.get('from-disk')).toBe('2026/04/a.jpg')
    expect(createSha256).toHaveBeenCalledOnce()
    expect(createSha256).toHaveBeenCalledWith('C:/o/2026/04/a.jpg')
  })
})
