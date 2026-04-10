import { describe, expect, it } from 'vitest'

import {
  flattenLibraryGroupsToPhotos,
  sortFlatPhotoRows
} from '@presentation/renderer/view-models/flattenLibraryPhotos'
import type { GroupDetail } from '@shared/types/preload'
import { createGroupDetailFixture } from '@/test/factories/createGroupDetailFixture'

function group(
  id: string,
  displayTitle: string,
  photos: Array<{
    id: string
    sourceFileName: string
    capturedAtIso?: string
  }>
): GroupDetail {
  return createGroupDetailFixture({
    id,
    title: displayTitle,
    displayTitle,
    photos: photos.map((p) => ({
      id: p.id,
      sourceFileName: p.sourceFileName,
      capturedAtIso: p.capturedAtIso,
      hasGps: true
    }))
  })
}

describe('flattenLibraryGroupsToPhotos', () => {
  it('flattens all photos with group context', () => {
    const rows = flattenLibraryGroupsToPhotos([
      group('g1', 'Trip', [
        { id: 'a', sourceFileName: 'a.jpg', capturedAtIso: '2020-01-01T12:00:00.000Z' }
      ]),
      group('g2', 'Home', [{ id: 'b', sourceFileName: 'b.jpg' }])
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.groupId).toBe('g1')
    expect(rows[1]?.photo.id).toBe('b')
  })

  it('dedupes photo ids', () => {
    const g = group('g1', 'X', [{ id: 'dup', sourceFileName: 'x.jpg' }])
    const rows = flattenLibraryGroupsToPhotos([g, { ...g, id: 'g2' }])
    expect(rows).toHaveLength(1)
  })

  it('uses title when set, otherwise strips leading date from displayTitle', () => {
    const rows = flattenLibraryGroupsToPhotos([
      createGroupDetailFixture({
        id: 'g1',
        title: '',
        displayTitle: '2026-04 seoul',
        photos: [
          {
            id: 'a',
            sourceFileName: 'a.jpg',
            hasGps: true
          }
        ]
      })
    ])
    expect(rows[0]?.groupDisplayTitle).toBe('seoul')
  })
})

describe('sortFlatPhotoRows', () => {
  it('sorts by filename ascending', () => {
    const rows = flattenLibraryGroupsToPhotos([
      group('g1', 'A', [
        { id: '2', sourceFileName: 'b.jpg' },
        { id: '1', sourceFileName: 'a.jpg' }
      ])
    ])
    const sorted = sortFlatPhotoRows(rows, 'filename-asc')
    expect(sorted.map((r) => r.photo.sourceFileName)).toEqual(['a.jpg', 'b.jpg'])
  })

  it('sorts by capture date descending', () => {
    const rows = flattenLibraryGroupsToPhotos([
      group('g1', 'A', [
        { id: 'old', sourceFileName: 'o.jpg', capturedAtIso: '2019-01-01T00:00:00.000Z' },
        { id: 'new', sourceFileName: 'n.jpg', capturedAtIso: '2024-01-01T00:00:00.000Z' }
      ])
    ])
    const sorted = sortFlatPhotoRows(rows, 'captured-desc')
    expect(sorted.map((r) => r.photo.id)).toEqual(['new', 'old'])
  })
})
