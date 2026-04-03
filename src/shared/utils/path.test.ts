import { describe, expect, it } from 'vitest'

import {
  getPathBaseName,
  getPathDirectoryName,
  joinPathSegments,
  normalizePathSeparators
} from '@shared/utils/path'

describe('path utilities', () => {
  it('normalizes Windows separators without losing the drive prefix', () => {
    expect(normalizePathSeparators('C:\\photos\\2026\\IMG_0001.JPG')).toBe(
      'C:/photos/2026/IMG_0001.JPG'
    )
  })

  it('joins absolute and relative path segments consistently', () => {
    expect(joinPathSegments('C:\\output\\', '.photo-organizer/thumbnails')).toBe(
      'C:/output/.photo-organizer/thumbnails'
    )
  })

  it('extracts basename and directory name from normalized paths', () => {
    const filePath = 'C:/output/2026/04/seoul/IMG_0001.JPG'

    expect(getPathBaseName(filePath)).toBe('IMG_0001.JPG')
    expect(getPathDirectoryName(filePath)).toBe('C:/output/2026/04/seoul')
  })
})
