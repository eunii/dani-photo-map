import { describe, expect, it } from 'vitest'

import {
  isOrganizedOutputDirectorySegments,
  isOrganizedOutputRelativePath
} from '@shared/utils/organizedOutputPath'

describe('organizedOutputPath', () => {
  it('accepts year/month output folders used by this app', () => {
    expect(isOrganizedOutputDirectorySegments(['2026', '04'])).toBe(true)
    expect(isOrganizedOutputDirectorySegments(['2026', '04', 'seoul'])).toBe(
      true
    )
    expect(isOrganizedOutputRelativePath('2026/04/seoul/a.jpg')).toBe(true)
    expect(isOrganizedOutputRelativePath('2026/04/10/a.jpg')).toBe(true)
    expect(isOrganizedOutputRelativePath('2026\\04\\week2\\a.mp4')).toBe(true)
  })

  it('rejects source dump folders such as 201809__', () => {
    expect(isOrganizedOutputDirectorySegments(['201809__'])).toBe(false)
    expect(
      isOrganizedOutputDirectorySegments(['아이폰13', '201809__'])
    ).toBe(false)
    expect(
      isOrganizedOutputRelativePath('아이폰13/201809__/IMG_0310.JPG')
    ).toBe(false)
    expect(isOrganizedOutputRelativePath('201809__/IMG_0310.JPG')).toBe(false)
  })
})
