import { isHeicLikeLibraryFileName } from '@shared/constants/mediaExtensions'

/** Build a `file://` URL for a path under the library output root (Windows-safe). */
export function toOutputFileUrl(
  outputRoot: string,
  relativePath?: string
): string | undefined {
  if (!relativePath) {
    return undefined
  }

  return encodeURI(
    `file:///${`${outputRoot}/${relativePath}`.replace(/\\/g, '/').replace(/^\/+/, '')}`
  )
}

/**
 * Thumbnail URL for display, preferring the generated webp thumbnail.
 * Never falls back to a raw HEIC/HEIF original — Chromium can't decode those
 * in an `<img>`, so a photo without a thumbnail yet renders as "no preview"
 * instead of a broken-image icon.
 */
export function toDisplayThumbUrl(
  outputRoot: string | undefined,
  thumbnailRelativePath?: string,
  outputRelativePath?: string
): string | undefined {
  if (!outputRoot) {
    return undefined
  }

  const thumbUrl = toOutputFileUrl(outputRoot, thumbnailRelativePath)
  if (thumbUrl) {
    return thumbUrl
  }

  if (outputRelativePath && isHeicLikeLibraryFileName(outputRelativePath)) {
    return undefined
  }

  return toOutputFileUrl(outputRoot, outputRelativePath)
}
