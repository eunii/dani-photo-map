import type { GroupSummary } from '@shared/types/preload'
import type { DashboardFolderRow } from '@presentation/renderer/view-models/dashboardFolderRows'

export function folderRowId(row: DashboardFolderRow): string {
  return row.pathSegments.join('\x1e')
}

export function parseCaptureTimeMs(iso?: string): number | null {
  if (!iso) {
    return null
  }

  const ms = Date.parse(iso)

  return Number.isNaN(ms) ? null : ms
}

/** 촬영 최신일 기준 내림차순(최신 폴더가 위). 날짜 없으면 아래쪽, 동률은 경로 키 */
export function compareDashboardRowsLatestFirst(
  a: DashboardFolderRow,
  b: DashboardFolderRow
): number {
  const ta =
    parseCaptureTimeMs(a.latestCapturedAtIso) ??
    parseCaptureTimeMs(a.earliestCapturedAtIso)
  const tb =
    parseCaptureTimeMs(b.latestCapturedAtIso) ??
    parseCaptureTimeMs(b.earliestCapturedAtIso)

  if (ta !== null && tb !== null && ta !== tb) {
    return tb - ta
  }

  if (ta !== null && tb === null) {
    return -1
  }

  if (ta === null && tb !== null) {
    return 1
  }

  return folderRowId(a).localeCompare(folderRowId(b), undefined, {
    numeric: true,
    sensitivity: 'base'
  })
}

export function yearKeyForGroup(group: GroupSummary): string | null {
  const iso = group.earliestCapturedAtIso ?? group.latestCapturedAtIso

  if (iso && iso.length >= 4) {
    const y = Number.parseInt(iso.slice(0, 4), 10)

    if (y >= 1900 && y <= 2100) {
      return String(y)
    }
  }

  const seg = group.pathSegments[0]

  if (seg && /^\d{4}$/.test(seg)) {
    return seg
  }

  return null
}

export function formatShortDate(iso?: string): string {
  if (!iso) {
    return ''
  }

  const parsed = new Date(iso)

  if (Number.isNaN(parsed.getTime())) {
    return iso
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parsed)
}

export function formatCaptureRange(earliest?: string, latest?: string): string {
  if (!earliest && !latest) {
    return '—'
  }

  const start = formatShortDate(earliest ?? latest)
  const end = formatShortDate(latest ?? earliest)

  if (!earliest || !latest || earliest === latest) {
    return start || '—'
  }

  return `${start} ~ ${end}`
}

export function formatGpsSummary(row: DashboardFolderRow): string {
  if (row.isUnknownLocation) {
    return '미확인'
  }

  const { exactGpsCount, inferredGpsCount, missingGpsCount } = row.gpsBreakdown

  return `원${exactGpsCount}·추${inferredGpsCount}·없${missingGpsCount}`
}

export function formatGeneratedAtLabel(value?: string): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed)
}
