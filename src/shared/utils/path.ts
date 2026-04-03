function getLeadingSeparator(path: string): string {
  if (path.startsWith('\\\\') || path.startsWith('//')) {
    return '//'
  }

  if (path.startsWith('\\') || path.startsWith('/')) {
    return '/'
  }

  return ''
}

function trimTrailingSeparator(path: string): string {
  if (path === '/' || path === '//' || /^[A-Za-z]:\/$/.test(path)) {
    return path
  }

  return path.endsWith('/') ? path.slice(0, -1) : path
}

export function normalizePathSeparators(path: string): string {
  if (!path) {
    return ''
  }

  const leadingSeparator = getLeadingSeparator(path)
  const normalizedBody = path
    .slice(leadingSeparator.length)
    .replace(/[\\/]+/g, '/')

  return trimTrailingSeparator(`${leadingSeparator}${normalizedBody}`)
}

export function joinPathSegments(...segments: string[]): string {
  const normalizedSegments = segments
    .map((segment) => normalizePathSeparators(segment))
    .filter((segment) => segment.length > 0)

  if (normalizedSegments.length === 0) {
    return ''
  }

  const firstSegment = normalizedSegments[0]!
  const restSegments = normalizedSegments.slice(1)

  return restSegments.reduce((joinedPath, segment) => {
    const trimmedSegment = segment.replace(/^\/+/, '')

    if (!joinedPath || joinedPath.endsWith('/')) {
      return `${joinedPath}${trimmedSegment}`
    }

    return `${joinedPath}/${trimmedSegment}`
  }, firstSegment)
}

export function getPathBaseName(path: string): string {
  const normalizedPath = normalizePathSeparators(path)

  if (!normalizedPath) {
    return ''
  }

  const pathWithoutTrailingSeparator = trimTrailingSeparator(normalizedPath)
  const lastSeparatorIndex = pathWithoutTrailingSeparator.lastIndexOf('/')

  if (lastSeparatorIndex < 0) {
    return pathWithoutTrailingSeparator
  }

  return pathWithoutTrailingSeparator.slice(lastSeparatorIndex + 1)
}

export function getPathDirectoryName(path: string): string {
  const normalizedPath = trimTrailingSeparator(normalizePathSeparators(path))
  const lastSeparatorIndex = normalizedPath.lastIndexOf('/')

  if (lastSeparatorIndex < 0) {
    return ''
  }

  if (lastSeparatorIndex === 0) {
    return normalizedPath.startsWith('//') ? '//' : '/'
  }

  const directoryPath = normalizedPath.slice(0, lastSeparatorIndex)

  return /^[A-Za-z]:$/.test(directoryPath) ? `${directoryPath}/` : directoryPath
}
