import type { GroupSummary } from '@shared/types/preload'

import { formatPathSegmentLabel } from '@presentation/renderer/view-models/outputPathNavigation'

export interface DashboardFolderRow {
  pathSegments: string[]
  fullPathLabel: string
  photoCount: number
  representativeThumbnailRelativePath?: string
  searchText: string
  yearSegment: string
}

function pathStartsWith(path: string[], prefix: string[]): boolean {
  if (prefix.length > path.length) {
    return false
  }

  return prefix.every((segment, index) => segment === path[index])
}

function pathKey(pathSegments: string[]): string {
  return pathSegments.join('\x1e')
}

function comparePathSegments(left: string[], right: string[]): number {
  const maxLength = Math.max(left.length, right.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftSegment = left[index]
    const rightSegment = right[index]

    if (leftSegment === undefined) {
      return -1
    }

    if (rightSegment === undefined) {
      return 1
    }

    const compared = leftSegment.localeCompare(rightSegment, undefined, {
      sensitivity: 'base',
      numeric: true
    })

    if (compared !== 0) {
      return compared
    }
  }

  return 0
}

function buildFullPathLabel(pathSegments: string[]): string {
  return pathSegments.map(formatPathSegmentLabel).join(' > ')
}

function buildSearchText(pathSegments: string[]): string {
  return [buildFullPathLabel(pathSegments), ...pathSegments].join(' ').toLowerCase()
}

export function buildDashboardFolderRows(
  groups: GroupSummary[]
): DashboardFolderRow[] {
  const sortedGroups = [...groups].sort((left, right) =>
    comparePathSegments(left.pathSegments, right.pathSegments)
  )

  const rows = new Map<string, DashboardFolderRow>()

  for (const group of sortedGroups) {
    const key = pathKey(group.pathSegments)

    if (rows.has(key)) {
      continue
    }

    rows.set(key, {
      pathSegments: group.pathSegments,
      fullPathLabel: buildFullPathLabel(group.pathSegments),
      photoCount: group.photoCount,
      representativeThumbnailRelativePath:
        group.representativeThumbnailRelativePath,
      searchText: buildSearchText(group.pathSegments),
      yearSegment: group.pathSegments[0] ?? '기타'
    })
  }

  return [...rows.values()].sort((left, right) =>
    comparePathSegments(left.pathSegments, right.pathSegments)
  )
}

export function filterDashboardFolderRows(
  rows: DashboardFolderRow[],
  query: string
): DashboardFolderRow[] {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return rows
  }

  return rows.filter((row) => row.searchText.includes(normalizedQuery))
}

export function countRowsWithUnknownLocation(
  groups: GroupSummary[],
  rows: DashboardFolderRow[]
): number {
  return rows.filter((row) =>
    groups.some(
      (group) =>
        group.isUnknownLocation && pathStartsWith(group.pathSegments, row.pathSegments)
    )
  ).length
}
