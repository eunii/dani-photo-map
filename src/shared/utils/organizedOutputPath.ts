import { normalizePathSeparators } from '@shared/utils/path'

const ORGANIZED_YEAR_SEGMENT = /^\d{4}$/
const ORGANIZED_MONTH_SEGMENT = /^\d{2}$/

export function isOrganizedOutputDirectorySegments(
  pathSegments: string[]
): boolean {
  const year = pathSegments[0]
  const month = pathSegments[1]

  return (
    pathSegments.length >= 2 &&
    ORGANIZED_YEAR_SEGMENT.test(year ?? '') &&
    ORGANIZED_MONTH_SEGMENT.test(month ?? '')
  )
}

export function isOrganizedOutputRelativePath(
  outputRelativePath: string
): boolean {
  const segments = normalizePathSeparators(outputRelativePath)
    .split('/')
    .filter((segment) => segment.length > 0)

  if (segments.length < 3) {
    return false
  }

  return isOrganizedOutputDirectorySegments(segments.slice(0, -1))
}
