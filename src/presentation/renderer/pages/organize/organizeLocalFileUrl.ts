import { normalizePathSeparators } from '@shared/utils/path'

export function fileUrlFromAbsolutePath(absolutePath: string): string {
  const normalized = normalizePathSeparators(absolutePath)
  const withSlashes = normalized.replace(/\\/g, '/')

  if (/^[a-zA-Z]:\//.test(withSlashes)) {
    return `file:///${encodeURI(withSlashes)}`
  }

  return `file://${encodeURI(withSlashes)}`
}

/** Prefer preload `pathToFileURL` so Windows paths load in the renderer with `webSecurity` relaxed. */
export function localImageFileUrl(absolutePath: string): string {
  const fromPreload = window.photoApp.pathToFileUrl(absolutePath)

  if (fromPreload) {
    return fromPreload
  }

  return fileUrlFromAbsolutePath(absolutePath)
}
