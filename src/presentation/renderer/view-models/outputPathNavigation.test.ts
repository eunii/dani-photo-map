import { describe, expect, it } from 'vitest'

import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'
import {
  filterRowsAtPath,
  formatPathSegmentLabel,
  listSubfoldersAtPath,
  NO_OUTPUT_PATH_SEGMENT,
  parseOutputDir,
  ROOT_LEVEL_FILES_SEGMENT
} from '@presentation/renderer/view-models/outputPathNavigation'

function row(
  id: string,
  outputRelativePath?: string,
  file = 'f.jpg'
): FlatPhotoRow {
  return {
    groupId: 'g',
    groupDisplayTitle: 'G',
    photo: {
      id,
      sourceFileName: file,
      outputRelativePath,
      hasGps: true
    }
  }
}

describe('parseOutputDir', () => {
  it('orphan when missing path', () => {
    expect(parseOutputDir(undefined)).toEqual({ kind: 'orphan' })
    expect(parseOutputDir('')).toEqual({ kind: 'orphan' })
  })

  it('root file when only filename', () => {
    expect(parseOutputDir('x.jpg')).toEqual({ kind: 'rootFile' })
  })

  it('nested dirname', () => {
    expect(parseOutputDir('2026/04/seoul/a.jpg')).toEqual({
      kind: 'nested',
      segments: ['2026', '04', 'seoul']
    })
  })
})

describe('listSubfoldersAtPath', () => {
  it('lists year folders at root', () => {
    const rows = [
      row('1', '2026/04/seoul/a.jpg'),
      row('2', '2025/03/busan/b.jpg')
    ]
    const subs = listSubfoldersAtPath(rows, [])
    const names = subs.map((s) => s.segment).filter((s) => !s.startsWith('__'))
    expect(names.sort()).toEqual(['2025', '2026'])
  })

  it('includes virtual folders at root', () => {
    const rows = [row('1', undefined), row('2', 'only.jpg')]
    const subs = listSubfoldersAtPath(rows, [])
    const segs = subs.map((s) => s.segment)
    expect(segs).toContain(NO_OUTPUT_PATH_SEGMENT)
    expect(segs).toContain(ROOT_LEVEL_FILES_SEGMENT)
  })
})

describe('filterRowsAtPath', () => {
  it('filters nested leaf folder', () => {
    const rows = [
      row('1', '2026/04/seoul/a.jpg'),
      row('2', '2026/04/seoul/b.jpg'),
      row('3', '2026/04/busan/c.jpg')
    ]
    const atSeoul = filterRowsAtPath(rows, ['2026', '04', 'seoul'])
    expect(atSeoul).toHaveLength(2)
  })
})

describe('formatPathSegmentLabel', () => {
  it('maps virtual segments', () => {
    expect(formatPathSegmentLabel(NO_OUTPUT_PATH_SEGMENT)).toBe('출력 경로 없음')
    expect(formatPathSegmentLabel(ROOT_LEVEL_FILES_SEGMENT)).toBe(
      '출력 폴더 바로 아래'
    )
    expect(formatPathSegmentLabel('2026')).toBe('2026')
  })
})
