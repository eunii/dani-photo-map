import type { GroupSummary } from '@shared/types/preload'

import { formatPathSegmentLabel } from '@presentation/renderer/view-models/outputPathNavigation'

export interface DashboardFolderRow {
  pathSegments: string[]
  fullPathLabel: string
  photoCount: number
  representativeThumbnailRelativePath?: string
  searchText: string
  yearSegment: string
  displayTitle: string
  regionLabel: string
  earliestCapturedAtIso?: string
  latestCapturedAtIso?: string
  isUnknownLocation: boolean
  gpsBreakdown: {
    exactGpsCount: number
    inferredGpsCount: number
    missingGpsCount: number
  }
  hasMapPin: boolean
  companionsShort: string
  hasNotes: boolean
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

function buildSearchText(group: GroupSummary, fullPathLabel: string): string {
  const companionText = group.companions.join(' ')
  const notesText = group.notes?.trim() ?? ''

  return [
    fullPathLabel,
    ...group.pathSegments,
    group.displayTitle,
    group.title,
    group.regionLabel,
    companionText,
    notesText,
    group.searchText
  ]
    .join(' ')
    .toLowerCase()
}

const COMPANION_PREVIEW_MAX = 28

function buildCompanionsShort(group: GroupSummary): string {
  if (group.companions.length === 0) {
    return '—'
  }

  const [first, second, ...rest] = group.companions
  const head = [first, second].filter(Boolean).join(', ')

  if (rest.length === 0) {
    return head.length > COMPANION_PREVIEW_MAX
      ? `${head.slice(0, COMPANION_PREVIEW_MAX)}…`
      : head
  }

  const base = second ? `${first}, ${second}` : first ?? ''
  return `${base} +${rest.length}`
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

    const fullPathLabel = buildFullPathLabel(group.pathSegments)

    rows.set(key, {
      pathSegments: group.pathSegments,
      fullPathLabel,
      photoCount: group.photoCount,
      representativeThumbnailRelativePath:
        group.representativeThumbnailRelativePath,
      searchText: buildSearchText(group, fullPathLabel),
      yearSegment: group.pathSegments[0] ?? '기타',
      displayTitle: group.displayTitle || group.title,
      regionLabel: group.regionLabel,
      earliestCapturedAtIso: group.earliestCapturedAtIso,
      latestCapturedAtIso: group.latestCapturedAtIso,
      isUnknownLocation: group.isUnknownLocation,
      gpsBreakdown: { ...group.gpsBreakdown },
      hasMapPin: group.pinLocation !== null,
      companionsShort: buildCompanionsShort(group),
      hasNotes: Boolean(group.notes?.trim())
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
  _groups: GroupSummary[],
  rows: DashboardFolderRow[]
): number {
  return rows.filter((row) => row.isUnknownLocation).length
}
