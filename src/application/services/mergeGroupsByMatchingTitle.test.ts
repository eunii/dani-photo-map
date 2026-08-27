import { describe, expect, it, vi } from 'vitest'

import { mergeGroupsByMatchingTitle } from '@application/services/mergeGroupsByMatchingTitle'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'

function photo(overrides: Partial<Photo> & Pick<Photo, 'id'>): Photo {
  return {
    sourcePath: `C:/in/${overrides.id}.jpg`,
    sourceFileName: `${overrides.id}.jpg`,
    isDuplicate: false,
    metadataIssues: [],
    ...overrides
  }
}

function group(overrides: Partial<PhotoGroup> & Pick<PhotoGroup, 'id' | 'photoIds'>): PhotoGroup {
  return {
    groupKey: overrides.id,
    title: '동일제목',
    displayTitle: '동일제목',
    companions: [],
    ...overrides
  }
}

describe('mergeGroupsByMatchingTitle', () => {
  it('keeps the already saved group as destination when merging a newly copied GPS group', async () => {
    const existingPhoto = photo({
      id: 'existing-1',
      capturedAt: {
        iso: '2018-09-01T10:00:00.000Z',
        year: '2018',
        month: '09',
        day: '01',
        time: '100000'
      },
      outputRelativePath: '2018/09/동일제목/2018-09-01_100000_existing-1.jpg'
    })
    const incomingPhoto = photo({
      id: 'incoming-1',
      gps: { latitude: 37.5, longitude: 127.0 },
      regionName: 'seoul',
      capturedAt: {
        iso: '2018-09-02T10:00:00.000Z',
        year: '2018',
        month: '09',
        day: '02',
        time: '100000'
      },
      outputRelativePath: '2018/09/동일제목/2018-09-02_100000_incoming-1.jpg'
    })
    const existingGroup = group({
      id: 'g-existing',
      photoIds: ['existing-1'],
      representativePhotoId: 'existing-1'
    })
    const incomingGroup = group({
      id: 'g-incoming',
      photoIds: ['incoming-1'],
      representativePhotoId: 'incoming-1',
      representativeGps: incomingPhoto.gps
    })
    const index: LibraryIndex = {
      version: 1,
      generatedAt: '2018-09-02T00:00:00.000Z',
      sourceRoot: 'C:/in',
      outputRoot: 'C:/out',
      photos: [existingPhoto, incomingPhoto],
      groups: [incomingGroup, existingGroup]
    }
    const fileSystem = {
      ensureDirectory: vi.fn().mockResolvedValue(undefined),
      listDirectoryFileNames: vi.fn().mockResolvedValue([
        '2018-09-01_100000_existing-1.jpg',
        '2018-09-02_100000_incoming-1.jpg'
      ]),
      moveFile: vi.fn().mockResolvedValue(undefined)
    }

    const result = await mergeGroupsByMatchingTitle({
      index,
      outputRoot: 'C:/out',
      fileSystem,
      rules: defaultOrganizationRules,
      incomingPhotoIds: new Set(['incoming-1'])
    })

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.id).toBe('g-existing')
    expect(result.groups[0]?.photoIds.sort()).toEqual(['existing-1', 'incoming-1'])

    const movedSources = fileSystem.moveFile.mock.calls.map((call) => call[0])
    expect(
      movedSources.some((sourcePath) =>
        String(sourcePath).includes('incoming-1.jpg')
      )
    ).toBe(true)
    expect(
      movedSources.some((sourcePath) =>
        String(sourcePath).includes('existing-1.jpg')
      )
    ).toBe(false)
  })
})
