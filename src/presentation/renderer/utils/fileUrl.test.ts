import { describe, expect, it } from 'vitest'

import { toDisplayThumbUrl } from '@presentation/renderer/utils/fileUrl'

describe('toDisplayThumbUrl', () => {
  it('prefers the generated thumbnail when present', () => {
    const url = toDisplayThumbUrl(
      'C:/photos/output',
      '.photo-organizer/thumbnails/a.webp',
      '2026/04/seoul/IMG_0001.HEIC'
    )
    expect(url).toContain('.photo-organizer/thumbnails/a.webp')
  })

  it('falls back to the original file when it is not HEIC-like', () => {
    const url = toDisplayThumbUrl(
      'C:/photos/output',
      undefined,
      '2026/04/seoul/IMG_0001.JPG'
    )
    expect(url).toContain('IMG_0001.JPG')
  })

  it('never falls back to a raw HEIC/HEIF original (Chromium cannot decode it)', () => {
    expect(
      toDisplayThumbUrl('C:/photos/output', undefined, '2026/04/seoul/IMG_0001.HEIC')
    ).toBeUndefined()
    expect(
      toDisplayThumbUrl('C:/photos/output', undefined, '2026/04/seoul/IMG_0001.heif')
    ).toBeUndefined()
  })

  it('returns undefined without an output root', () => {
    expect(
      toDisplayThumbUrl(undefined, undefined, '2026/04/seoul/IMG_0001.JPG')
    ).toBeUndefined()
  })
})
