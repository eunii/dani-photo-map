import { describe, expect, it, vi } from 'vitest'

import { assignGroupDisplayTitledOutputRelativePaths } from '@application/services/assignGroupDisplayTitledOutputPaths'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import type { Photo } from '@domain/entities/Photo'

function photo(overrides: Partial<Photo> & Pick<Photo, 'id' | 'sourcePath' | 'sourceFileName'>): Photo {
  return {
    isDuplicate: false,
    metadataIssues: [],
    ...overrides
  }
}

describe('assignGroupDisplayTitledOutputRelativePaths', () => {
  it('assigns sequential collision suffixes when multiple photos share the same base name', async () => {
    const listDirectoryFileNames = vi.fn().mockResolvedValue([])
    const p1 = photo({
      id: 'a',
      sourcePath: 'C:/s/a.jpg',
      sourceFileName: 'a.jpg',
      capturedAt: {
        iso: '2026-04-03T10:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '100000'
      },
      regionName: 'seoul'
    })
    const p2 = photo({
      id: 'b',
      sourcePath: 'C:/s/b.jpg',
      sourceFileName: 'b.jpg',
      capturedAt: {
        iso: '2026-04-03T10:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '100000'
      },
      regionName: 'seoul'
    })

    const map = await assignGroupDisplayTitledOutputRelativePaths({
      photos: [p1, p2],
      photoIdToGroupFileLabel: new Map([
        ['a', 'seoul'],
        ['b', 'seoul']
      ]),
      outputRoot: 'C:/out',
      rules: defaultOrganizationRules,
      fileSystem: { listDirectoryFileNames }
    })

    expect(map.get('a')).toBe(
      '2026/04/seoul/2026-04-03_100000_seoul.jpg'
    )
    expect(map.get('b')).toBe(
      '2026/04/seoul/2026-04-03_100000_seoul_001.jpg'
    )
  })
})
