import { stripLeadingDateFromAutoGroupDisplayTitle } from '@domain/services/PhotoNamingService'
import type { GroupDetail, GroupPhotoSummary } from '@shared/types/preload'

export type BottomSheetState = 'collapsed' | 'half' | 'full'
export type DateQuickFilter = 'all' | 'today' | 'this-week' | 'this-month' | 'custom'

export interface DateRangeFilter {
  start?: string
  end?: string
}

export interface MapViewportBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface GroupPinLocation {
  latitude: number
  longitude: number
  source: 'photo-original-gps' | 'photo-gps' | 'representative-gps'
}

export interface GroupGpsBreakdown {
  exactGpsCount: number
  inferredGpsCount: number
  missingGpsCount: number
}

export interface MapGroupRecord {
  group: GroupDetail
  displayTitle: string
  cleanedTitle: string
  regionLabel: string
  latestCapturedAtIso?: string
  dateLabel: string
  pinLocation: GroupPinLocation | null
  gpsBreakdown: GroupGpsBreakdown
  searchText: string
  score: number
  isUnknownLocation: boolean
}

export interface MapZoomPolicy {
  unclusteredMinZoom: number
  perRegionLimit: number
}

export interface MapPageDerivedState {
  allGroups: MapGroupRecord[]
  filteredGroups: MapGroupRecord[]
  mappedGroups: MapGroupRecord[]
  unmappedGroups: MapGroupRecord[]
  visibleGroups: MapGroupRecord[]
  selectedGroup: MapGroupRecord | null
}

const UNKNOWN_LOCATION_LABEL = 'Unknown Location'
const DAY_MS = 24 * 60 * 60 * 1000

function normalizeTitleCandidate(value?: string): string {
  const trimmed = value?.trim() ?? ''

  if (!trimmed) {
    return ''
  }

  const withoutDatePrefix = trimmed
    .replace(/^\d{4}[-_. ]\d{2}([\-_. ]\d{2})?[-_. ]*/, '')
    .trim()
  const replaced = (withoutDatePrefix || trimmed)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const cleaned = stripLeadingDateFromAutoGroupDisplayTitle(replaced).trim()
  const candidate = cleaned || replaced
  const lower = candidate.toLowerCase()

  if (
    lower === 'location unknown' ||
    lower === 'location-unknown' ||
    lower === 'unknown location' ||
    lower === 'unknown'
  ) {
    return UNKNOWN_LOCATION_LABEL
  }

  return candidate
}

function toTimestamp(iso?: string): number {
  if (!iso) {
    return Number.NEGATIVE_INFINITY
  }

  const parsed = Date.parse(iso)

  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

function isValidCoordinate(
  point:
    | {
        latitude: number
        longitude: number
      }
    | undefined
): point is { latitude: number; longitude: number } {
  if (!point) {
    return false
  }

  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  )
}

function hasExactPhotoGps(photo: GroupPhotoSummary): boolean {
  return isValidCoordinate(photo.originalGps)
}

function hasAnyPhotoGps(photo: GroupPhotoSummary): boolean {
  return isValidCoordinate(photo.gps)
}

function comparePhotosByGpsPriority(
  left: GroupPhotoSummary,
  right: GroupPhotoSummary
): number {
  const leftRealGps = left.locationSource !== 'assigned-from-group'
  const rightRealGps = right.locationSource !== 'assigned-from-group'

  if (leftRealGps !== rightRealGps) {
    return leftRealGps ? -1 : 1
  }

  return toTimestamp(right.capturedAtIso) - toTimestamp(left.capturedAtIso)
}

function formatDateLabel(iso?: string): string {
  if (!iso) {
    return 'Date Unknown'
  }

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return 'Date Unknown'
  }

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}.${month}.${day}`
}

function getGroupRegionLabel(group: GroupDetail): string {
  const counts = new Map<string, number>()

  for (const photo of group.photos) {
    const label = normalizeTitleCandidate(photo.regionName)

    if (!label) {
      continue
    }

    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const sorted = [...counts.entries()].sort((left, right) => {
    if (left[1] !== right[1]) {
      return right[1] - left[1]
    }

    return left[0].localeCompare(right[0])
  })

  return sorted[0]?.[0] ?? UNKNOWN_LOCATION_LABEL
}

function getLatestCapturedAtIso(group: GroupDetail): string | undefined {
  const sorted = [...group.photos]
    .map((photo) => photo.capturedAtIso)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => toTimestamp(right) - toTimestamp(left))

  return sorted[0]
}

function buildSearchText(group: GroupDetail, displayTitle: string, regionLabel: string): string {
  const parts = [
    group.title,
    group.displayTitle,
    displayTitle,
    regionLabel,
    ...group.photos.map((photo) => photo.sourceFileName),
    ...group.photos.map((photo) => photo.regionName ?? ''),
    ...group.photos.map((photo) => formatDateLabel(photo.capturedAtIso)),
    formatDateLabel(getLatestCapturedAtIso(group))
  ]

  return parts
    .join(' ')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function getDateFallbackLabel(group: GroupDetail, latestCapturedAtIso?: string): string {
  return `${formatDateLabel(latestCapturedAtIso)} Photo Group`
}

export function resolveGroupDisplayTitle(group: GroupDetail): string {
  const normalizedDisplayTitle = normalizeTitleCandidate(group.displayTitle)

  if (normalizedDisplayTitle) {
    return normalizedDisplayTitle
  }

  const normalizedTitle = normalizeTitleCandidate(group.title)

  if (normalizedTitle) {
    return normalizedTitle
  }

  const regionLabel = getGroupRegionLabel(group)

  if (regionLabel && regionLabel !== UNKNOWN_LOCATION_LABEL) {
    return regionLabel
  }

  return getDateFallbackLabel(group, getLatestCapturedAtIso(group))
}

export function resolveGroupGpsBreakdown(group: GroupDetail): GroupGpsBreakdown {
  let exactGpsCount = 0
  let inferredGpsCount = 0
  let missingGpsCount = 0

  for (const photo of group.photos) {
    if (hasExactPhotoGps(photo)) {
      exactGpsCount += 1
      continue
    }

    if (hasAnyPhotoGps(photo)) {
      if (photo.locationSource === 'assigned-from-group') {
        inferredGpsCount += 1
      } else {
        exactGpsCount += 1
      }
      continue
    }

    missingGpsCount += 1
  }

  return {
    exactGpsCount,
    inferredGpsCount,
    missingGpsCount
  }
}

export function resolveGroupPinLocation(group: GroupDetail): GroupPinLocation | null {
  const originalGpsPhoto = [...group.photos]
    .filter((photo) => hasExactPhotoGps(photo))
    .sort((left, right) => toTimestamp(right.capturedAtIso) - toTimestamp(left.capturedAtIso))[0]

  if (originalGpsPhoto?.originalGps) {
    return {
      latitude: originalGpsPhoto.originalGps.latitude,
      longitude: originalGpsPhoto.originalGps.longitude,
      source: 'photo-original-gps'
    }
  }

  const gpsPhoto = [...group.photos]
    .filter((photo) => hasAnyPhotoGps(photo))
    .sort(comparePhotosByGpsPriority)[0]

  if (gpsPhoto?.gps) {
    return {
      latitude: gpsPhoto.gps.latitude,
      longitude: gpsPhoto.gps.longitude,
      source: 'photo-gps'
    }
  }

  if (isValidCoordinate(group.representativeGps)) {
    return {
      latitude: group.representativeGps.latitude,
      longitude: group.representativeGps.longitude,
      source: 'representative-gps'
    }
  }

  return null
}

export function resolveGroupScore(group: GroupDetail, pinLocation: GroupPinLocation | null): number {
  const latestCapturedAt = toTimestamp(getLatestCapturedAtIso(group))
  const recencyScore = Number.isFinite(latestCapturedAt)
    ? Math.max(0, Math.round((latestCapturedAt - Date.UTC(2020, 0, 1)) / DAY_MS))
    : 0
  const photoCountScore = Math.min(group.photoCount, 200) * 8
  const representativeGpsScore = group.representativeGps ? 120 : 0
  const titleScore = normalizeTitleCandidate(group.displayTitle || group.title) ? 100 : 0
  const thumbnailScore = group.representativeThumbnailRelativePath ? 80 : 0
  const unknownLocationPenalty =
    getGroupRegionLabel(group) === UNKNOWN_LOCATION_LABEL ? 120 : 0
  const mappedBonus = pinLocation ? 160 : -200

  return (
    recencyScore +
    photoCountScore +
    representativeGpsScore +
    titleScore +
    thumbnailScore +
    mappedBonus -
    unknownLocationPenalty
  )
}

export function buildMapGroupRecord(group: GroupDetail): MapGroupRecord {
  const latestCapturedAtIso = getLatestCapturedAtIso(group)
  const displayTitle = resolveGroupDisplayTitle(group)
  const pinLocation = resolveGroupPinLocation(group)
  const regionLabel = getGroupRegionLabel(group)

  return {
    group,
    displayTitle,
    cleanedTitle: normalizeTitleCandidate(group.title || group.displayTitle),
    regionLabel,
    latestCapturedAtIso,
    dateLabel: formatDateLabel(latestCapturedAtIso),
    pinLocation,
    gpsBreakdown: resolveGroupGpsBreakdown(group),
    searchText: buildSearchText(group, displayTitle, regionLabel),
    score: resolveGroupScore(group, pinLocation),
    isUnknownLocation: regionLabel === UNKNOWN_LOCATION_LABEL
  }
}

export function buildMapGroupRecords(groups: GroupDetail[]): MapGroupRecord[] {
  return groups.map((group) => buildMapGroupRecord(group))
}

export function getQuickFilterDateRange(
  quickFilter: DateQuickFilter,
  now = new Date()
): DateRangeFilter {
  const utcNow = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  )
  const isoDate = (date: Date) => date.toISOString().slice(0, 10)

  if (quickFilter === 'today') {
    return {
      start: isoDate(utcNow),
      end: isoDate(utcNow)
    }
  }

  if (quickFilter === 'this-week') {
    const dayOfWeek = (utcNow.getUTCDay() + 6) % 7
    const startDate = new Date(utcNow.getTime() - dayOfWeek * DAY_MS)

    return {
      start: isoDate(startDate),
      end: isoDate(utcNow)
    }
  }

  if (quickFilter === 'this-month') {
    return {
      start: isoDate(new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1, 12))),
      end: isoDate(utcNow)
    }
  }

  return {}
}

function normalizeDateBoundary(value?: string, isEnd = false): number | undefined {
  if (!value) {
    return undefined
  }

  const full = isEnd ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`
  const parsed = Date.parse(full)

  return Number.isNaN(parsed) ? undefined : parsed
}

function matchesDateRange(
  group: GroupDetail,
  dateRange: DateRangeFilter | null | undefined
): boolean {
  const start = normalizeDateBoundary(dateRange?.start)
  const end = normalizeDateBoundary(dateRange?.end, true)

  if (start === undefined && end === undefined) {
    return true
  }

  const groupTimestamps = group.photos
    .map((photo) => toTimestamp(photo.capturedAtIso))
    .filter((value) => Number.isFinite(value))

  if (groupTimestamps.length === 0) {
    return false
  }

  return groupTimestamps.some((timestamp) => {
    if (start !== undefined && timestamp < start) {
      return false
    }

    if (end !== undefined && timestamp > end) {
      return false
    }

    return true
  })
}

export function filterMapGroupRecords(
  records: MapGroupRecord[],
  options: {
    searchQuery?: string
    dateRange?: DateRangeFilter | null
  }
): MapGroupRecord[] {
  const query = options.searchQuery?.trim().toLocaleLowerCase() ?? ''

  return records.filter((record) => {
    if (query && !record.searchText.includes(query)) {
      return false
    }

    if (!matchesDateRange(record.group, options.dateRange)) {
      return false
    }

    return true
  })
}

export function getMapZoomPolicy(zoomLevel: number): MapZoomPolicy {
  if (zoomLevel < 3) {
    return {
      unclusteredMinZoom: 3.5,
      perRegionLimit: 1
    }
  }

  if (zoomLevel < 6) {
    return {
      unclusteredMinZoom: 4,
      perRegionLimit: 4
    }
  }

  if (zoomLevel < 10) {
    return {
      unclusteredMinZoom: 5,
      perRegionLimit: 10
    }
  }

  return {
    unclusteredMinZoom: 5,
    perRegionLimit: Number.POSITIVE_INFINITY
  }
}

function isWithinBounds(
  pinLocation: GroupPinLocation,
  bounds?: MapViewportBounds | null
): boolean {
  if (!bounds) {
    return true
  }

  const latitudeInRange =
    pinLocation.latitude >= bounds.south && pinLocation.latitude <= bounds.north

  if (!latitudeInRange) {
    return false
  }

  if (bounds.west <= bounds.east) {
    return pinLocation.longitude >= bounds.west && pinLocation.longitude <= bounds.east
  }

  return pinLocation.longitude >= bounds.west || pinLocation.longitude <= bounds.east
}

export function sampleGroupsByRegion(
  records: MapGroupRecord[],
  perRegionLimit: number
): MapGroupRecord[] {
  if (!Number.isFinite(perRegionLimit)) {
    return [...records].sort((left, right) => right.score - left.score)
  }

  const grouped = new Map<string, MapGroupRecord[]>()

  for (const record of records) {
    const key = record.regionLabel || UNKNOWN_LOCATION_LABEL
    const bucket = grouped.get(key) ?? []

    bucket.push(record)
    grouped.set(key, bucket)
  }

  const sampled: MapGroupRecord[] = []

  for (const bucket of grouped.values()) {
    sampled.push(
      ...bucket
        .sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score
          }

          return left.displayTitle.localeCompare(right.displayTitle)
        })
        .slice(0, perRegionLimit)
    )
  }

  return sampled.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score
    }

    return left.displayTitle.localeCompare(right.displayTitle)
  })
}

export function buildVisibleMapGroups(
  records: MapGroupRecord[],
  options: {
    bounds?: MapViewportBounds | null
    zoomLevel: number
  }
): MapGroupRecord[] {
  const mappedRecords = records.filter((record) => record.pinLocation)
  const inBounds = mappedRecords.filter((record) =>
    isWithinBounds(record.pinLocation!, options.bounds)
  )
  const pool = inBounds.length > 0 ? inBounds : mappedRecords
  const policy = getMapZoomPolicy(options.zoomLevel)

  return sampleGroupsByRegion(pool, policy.perRegionLimit)
}

export function deriveMapPageState(
  groups: GroupDetail[],
  options: {
    searchQuery?: string
    dateRange?: DateRangeFilter | null
    bounds?: MapViewportBounds | null
    zoomLevel: number
    selectedGroupId?: string
  }
): MapPageDerivedState {
  const allGroups = buildMapGroupRecords(groups)
  const filteredGroups = filterMapGroupRecords(allGroups, {
    searchQuery: options.searchQuery,
    dateRange: options.dateRange
  })
  const mappedGroups = filteredGroups.filter((record) => record.pinLocation)
  const unmappedGroups = filteredGroups.filter((record) => !record.pinLocation)
  const visibleGroups = buildVisibleMapGroups(filteredGroups, {
    bounds: options.bounds,
    zoomLevel: options.zoomLevel
  })
  const selectedGroup =
    filteredGroups.find((record) => record.group.id === options.selectedGroupId) ?? null

  return {
    allGroups,
    filteredGroups,
    mappedGroups,
    unmappedGroups,
    visibleGroups,
    selectedGroup
  }
}
