import { describe, expect, it } from 'vitest'

import {
  isHeicLikeLibraryFileName,
  isPhotoLibraryMediaFileName,
  isVideoLibraryFileName,
  shouldSkipEmbeddedMetadata,
  shouldSkipInlinePreviewImage
} from '@shared/constants/mediaExtensions'

describe('mediaExtensions', () => {
  it('accepts photos and videos that this library copies', () => {
    expect(isPhotoLibraryMediaFileName('IMG_0001.JPG')).toBe(true)
    expect(isPhotoLibraryMediaFileName('clip.HEIC')).toBe(true)
    expect(isPhotoLibraryMediaFileName('D:/photos/clip.MP4')).toBe(true)
    expect(isPhotoLibraryMediaFileName('live.MOV')).toBe(true)
    expect(isPhotoLibraryMediaFileName('notes.txt')).toBe(false)
    expect(isVideoLibraryFileName('clip.mp4')).toBe(true)
    expect(isVideoLibraryFileName('IMG_0001.JPG')).toBe(false)
    expect(isHeicLikeLibraryFileName('IMG_0001.HEIC')).toBe(true)
    expect(shouldSkipInlinePreviewImage('clip.MOV')).toBe(true)
    expect(shouldSkipInlinePreviewImage('IMG_0001.HEIC')).toBe(true)
    expect(shouldSkipInlinePreviewImage('IMG_0001.JPG')).toBe(false)
    expect(shouldSkipEmbeddedMetadata('IMG_0001.HEIC')).toBe(true)
    expect(shouldSkipEmbeddedMetadata('clip.MOV')).toBe(true)
    expect(shouldSkipEmbeddedMetadata('clip.mp4')).toBe(true)
    expect(shouldSkipEmbeddedMetadata('IMG_0001.JPG')).toBe(false)
  })
})
