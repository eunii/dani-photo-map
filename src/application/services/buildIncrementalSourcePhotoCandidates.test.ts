import { describe, expect, it, vi } from 'vitest'

import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import { LIBRARY_INDEX_VERSION } from '@domain/entities/LibraryIndex'
import { buildIncrementalSourcePhotoCandidates } from '@application/services/buildIncrementalSourcePhotoCandidates'

function createStoredIndex(): LibraryIndex {
  return {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: '2026-04-10T00:00:00.000Z',
    sourceRoot: 'C:/photos/source',
    outputRoot: 'C:/photos/output',
    photos: [
      {
        id: 'photo-1',
        sourcePath: 'C:/photos/source/a.jpg',
        sourceFileName: 'a.jpg',
        sourceFingerprint: {
          sizeBytes: 100,
          modifiedAtMs: 1_710_000_000_000
        },
        isDuplicate: false,
        metadataIssues: []
      },
      {
        id: 'photo-2',
        sourcePath: 'C:/photos/source/b.jpg',
        sourceFileName: 'b.jpg',
        sourceFingerprint: {
          sizeBytes: 200,
          modifiedAtMs: 1_720_000_000_000
        },
        isDuplicate: false,
        metadataIssues: []
      }
    ],
    groups: []
  }
}

describe('buildIncrementalSourcePhotoCandidates', () => {
  it('skips unchanged files when stored fingerprint matches', async () => {
    const fileSystem = {
      getPhotoFileFingerprint: vi.fn(async (absolutePath: string) => {
        if (absolutePath.endsWith('/a.jpg')) {
          return {
            sizeBytes: 100,
            modifiedAtMs: 1_710_000_000_000
          }
        }

        return {
          sizeBytes: 250,
          modifiedAtMs: 1_730_000_000_000
        }
      })
    }

    const result = await buildIncrementalSourcePhotoCandidates({
      listedPhotoPaths: ['C:/photos/source/a.jpg', 'C:/photos/source/b.jpg'],
      sourceRoot: 'C:/photos/source',
      storedIndex: createStoredIndex(),
      fileSystem
    })

    expect(result.skippedUnchangedCount).toBe(1)
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0]).toMatchObject({
      sourcePath: 'C:/photos/source/b.jpg',
      sourceFileName: 'b.jpg',
      sourceFingerprint: {
        sizeBytes: 250,
        modifiedAtMs: 1_730_000_000_000
      }
    })
  })

  it('falls back to full scan when sourceRoot changed', async () => {
    const fileSystem = {
      getPhotoFileFingerprint: vi.fn()
    }

    const result = await buildIncrementalSourcePhotoCandidates({
      listedPhotoPaths: ['C:/photos/source/a.jpg'],
      sourceRoot: 'C:/photos/other',
      storedIndex: createStoredIndex(),
      fileSystem
    })

    expect(result.skippedUnchangedCount).toBe(0)
    expect(result.candidates).toEqual([
      {
        sourcePath: 'C:/photos/source/a.jpg',
        sourceFileName: 'a.jpg'
      }
    ])
    expect(fileSystem.getPhotoFileFingerprint).not.toHaveBeenCalled()
  })
})
