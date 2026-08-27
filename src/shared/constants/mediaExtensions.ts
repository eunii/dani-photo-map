const IMAGE_LIBRARY_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
  '.webp'
] as const

const VIDEO_LIBRARY_EXTENSIONS = ['.mp4', '.mov', '.m4v'] as const

const VIDEO_LIBRARY_EXTENSION_SET = new Set<string>(VIDEO_LIBRARY_EXTENSIONS)
const HEIC_LIKE_EXTENSION_SET = new Set<string>(['.heic', '.heif'])
const PHOTO_LIBRARY_MEDIA_EXTENSION_SET = new Set<string>([
  ...IMAGE_LIBRARY_EXTENSIONS,
  ...VIDEO_LIBRARY_EXTENSIONS
])

export function mediaExtensionOf(fileName: string): string {
  const normalized = fileName.replaceAll('\\', '/')
  const baseName = normalized.slice(normalized.lastIndexOf('/') + 1)
  const dotIndex = baseName.lastIndexOf('.')

  if (dotIndex <= 0) {
    return ''
  }

  return baseName.slice(dotIndex).toLowerCase()
}

export function isPhotoLibraryMediaFileName(fileName: string): boolean {
  return PHOTO_LIBRARY_MEDIA_EXTENSION_SET.has(mediaExtensionOf(fileName))
}

export function isVideoLibraryFileName(fileName: string): boolean {
  return VIDEO_LIBRARY_EXTENSION_SET.has(mediaExtensionOf(fileName))
}

export function isHeicLikeLibraryFileName(fileName: string): boolean {
  return HEIC_LIKE_EXTENSION_SET.has(mediaExtensionOf(fileName))
}

export function shouldSkipInlinePreviewImage(fileName: string): boolean {
  return isVideoLibraryFileName(fileName) || isHeicLikeLibraryFileName(fileName)
}

export function shouldSkipEmbeddedMetadata(fileName: string): boolean {
  return isVideoLibraryFileName(fileName) || isHeicLikeLibraryFileName(fileName)
}
