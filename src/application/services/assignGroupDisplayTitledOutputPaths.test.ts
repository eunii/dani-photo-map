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
      gps: {
        latitude: 37.5,
        longitude: 127
      },
      regionName: 'seoul'
    })
    const p2 = photo({
      id: 'b',
      sourcePath: 'C:/s/b.jpg',
      sourceFileName: 'a.jpg',
      capturedAt: {
        iso: '2026-04-03T10:00:00.000Z',
        year: '2026',
        month: '04',
        day: '03',
        time: '100000'
      },
      gps: {
        latitude: 37.5,
        longitude: 127
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
      '2026/04/seoul/2026-04-03_100000_a.jpg'
    )
    expect(map.get('b')).toBe(
      '2026/04/seoul/2026-04-03_100000_a_001.jpg'
    )
  })

  it('puts missing-gps photos into week folders when weekly grouping is selected', async () => {
    const listDirectoryFileNames = vi.fn().mockResolvedValue([])
    const weeklyPhoto = photo({
      id: 'weekly',
      sourcePath: 'C:/s/weekly.jpg',
      sourceFileName: 'weekly.jpg',
      capturedAt: {
        iso: '2026-04-10T10:00:00.000Z',
        year: '2026',
        month: '04',
        day: '10',
        time: '100000'
      },
      missingGpsCategory: 'missing-original-gps',
      missingGpsGroupingBasis: 'week',
      regionName: 'base'
    })

    const map = await assignGroupDisplayTitledOutputRelativePaths({
      photos: [weeklyPhoto],
      photoIdToGroupFileLabel: new Map([['weekly', 'base']]),
      outputRoot: 'C:/out',
      rules: defaultOrganizationRules,
      fileSystem: { listDirectoryFileNames }
    })

    expect(map.get('weekly')).toBe(
      '2026/04/week2/2026-04-10_100000_weekly.jpg'
    )
  })

  it('puts missing-gps photos into day folders when daily grouping is selected', async () => {
    const listDirectoryFileNames = vi.fn().mockResolvedValue([])
    const dailyPhoto = photo({
      id: 'daily',
      sourcePath: 'C:/s/daily.jpg',
      sourceFileName: 'daily.jpg',
      capturedAt: {
        iso: '2026-04-10T10:00:00.000Z',
        year: '2026',
        month: '04',
        day: '10',
        time: '100000'
      },
      missingGpsCategory: 'missing-original-gps',
      missingGpsGroupingBasis: 'day',
      regionName: 'base'
    })

    const map = await assignGroupDisplayTitledOutputRelativePaths({
      photos: [dailyPhoto],
      photoIdToGroupFileLabel: new Map([['daily', 'base']]),
      outputRoot: 'C:/out',
      rules: defaultOrganizationRules,
      fileSystem: { listDirectoryFileNames }
    })

    expect(map.get('daily')).toBe('2026/04/10/2026-04-10_100000_daily.jpg')
  })

  it('applies selected basis folders to gps-backed photos too', async () => {
    const listDirectoryFileNames = vi.fn().mockResolvedValue([])
    const gpsPhoto = photo({
      id: 'gps',
      sourcePath: 'C:/s/gps.jpg',
      sourceFileName: 'gps.jpg',
      capturedAt: {
        iso: '2026-04-10T10:00:00.000Z',
        year: '2026',
        month: '04',
        day: '10',
        time: '100000'
      },
      gps: {
        latitude: 37.5,
        longitude: 127
      },
      missingGpsGroupingBasis: 'day',
      regionName: 'seoul'
    })

    const map = await assignGroupDisplayTitledOutputRelativePaths({
      photos: [gpsPhoto],
      photoIdToGroupFileLabel: new Map([['gps', 'seoul']]),
      outputRoot: 'C:/out',
      rules: defaultOrganizationRules,
      fileSystem: { listDirectoryFileNames }
    })

    expect(map.get('gps')).toBe('2026/04/10/seoul/2026-04-10_100000_gps.jpg')
  })
})
