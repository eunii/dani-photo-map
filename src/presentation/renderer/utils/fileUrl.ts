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
