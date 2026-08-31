import { describe, expect, it } from 'vitest'

import {
  matchesOutputPath,
  NO_OUTPUT_PATH_SEGMENT,
  ROOT_LEVEL_FILES_SEGMENT
} from '@shared/utils/outputRelativePath'

describe('matchesOutputPath', () => {
  it('matches a nested path exactly', () => {
    expect(
      matchesOutputPath('2026/04/seoul/a.jpg', ['2026', '04', 'seoul'])
    ).toBe(true)
    expect(
      matchesOutputPath('2026/05/seoul/a.jpg', ['2026', '04', 'seoul'])
    ).toBe(false)
    expect(matchesOutputPath('2026/04/seoul/a.jpg', ['2026', '04'])).toBe(false)
  })

  it('matches the virtual orphan/root-file segments', () => {
    expect(matchesOutputPath(undefined, [NO_OUTPUT_PATH_SEGMENT])).toBe(true)
    expect(matchesOutputPath('a.jpg', [NO_OUTPUT_PATH_SEGMENT])).toBe(false)
    expect(matchesOutputPath('a.jpg', [ROOT_LEVEL_FILES_SEGMENT])).toBe(true)
    expect(
      matchesOutputPath('2026/a.jpg', [ROOT_LEVEL_FILES_SEGMENT])
    ).toBe(false)
  })

  it('never matches the library root (empty pathSegments)', () => {
    expect(matchesOutputPath('2026/04/seoul/a.jpg', [])).toBe(false)
    expect(matchesOutputPath(undefined, [])).toBe(false)
  })
})
