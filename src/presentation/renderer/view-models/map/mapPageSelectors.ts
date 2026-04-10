import { stripLeadingDateFromGroupTitle } from '@presentation/common/formatters/groupTitle'
import type { GroupDetail, GroupSummary } from '@shared/types/preload'

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
  group: GroupSummary
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

export interface MapPhotoPinRecord {
  id: string
  photoId: string
  sourceFileName: string
  latitude: number
  longitude: number
  capturedAtIso?: string
  regionName?: string
  thumbnailRelativePath?: string
  outputRelativePath?: string
  isRepresentative: boolean
  gpsSource: 'original-gps' | 'gps'
  score: number
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

  const cleaned = stripLeadingDateFromGroupTitle(replaced).trim()
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
    | null
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

function getDateFallbackLabel(group: GroupSummary, latestCapturedAtIso?: string): string {
  return `${formatDateLabel(latestCapturedAtIso)} Photo Group`
}

export function resolveGroupDisplayTitle(group: GroupSummary): string {
  const normalizedDisplayTitle = normalizeTitleCandidate(group.displayTitle)

  if (normalizedDisplayTitle) {
    return normalizedDisplayTitle
  }

  const normalizedTitle = normalizeTitleCandidate(group.title)

  if (normalizedTitle) {
    return normalizedTitle
  }

  const regionLabel = normalizeTitleCandidate(group.regionLabel)

  if (regionLabel && regionLabel !== UNKNOWN_LOCATION_LABEL) {
    return regionLabel
  }

  return getDateFallbackLabel(group, group.latestCapturedAtIso)
}

export function resolveGroupGpsBreakdown(group: GroupSummary): GroupGpsBreakdown {
  return group.gpsBreakdown
}

export function resolveGroupPinLocation(group: GroupSummary): GroupPinLocation | null {
  return isValidCoordinate(group.pinLocation) ? group.pinLocation : null
}

function resolvePhotoPinLocation(
  photo: GroupDetail['photos'][number]
): {
  latitude: number
  longitude: number
  gpsSource: 'original-gps' | 'gps'
} | null {
  if (isValidCoordinate(photo.originalGps)) {
    return {
      latitude: photo.originalGps.latitude,
      longitude: photo.originalGps.longitude,
      gpsSource: 'original-gps'
    }
  }

  if (isValidCoordinate(photo.gps)) {
    return {
      latitude: photo.gps.latitude,
      longitude: photo.gps.longitude,
      gpsSource: 'gps'
    }
  }

  return null
}

function resolvePhotoPinScore(
  photo: GroupDetail['photos'][number],
  isRepresentative: boolean,
  pinLocation: { gpsSource: 'original-gps' | 'gps' }
): number {
  const representativeScore = isRepresentative ? 1_000_000 : 0
  const timestampScore = Math.max(0, toTimestamp(photo.capturedAtIso))
  const thumbnailScore = photo.thumbnailRelativePath ? 10_000 : 0
  const exactGpsScore = pinLocation.gpsSource === 'original-gps' ? 1_000 : 0

  return representativeScore + timestampScore + thumbnailScore + exactGpsScore
}

export function resolveGroupScore(group: GroupSummary, pinLocation: GroupPinLocation | null): number {
  const latestCapturedAt = toTimestamp(group.latestCapturedAtIso)
  const recencyScore = Number.isFinite(latestCapturedAt)
    ? Math.max(0, Math.round((latestCapturedAt - Date.UTC(2020, 0, 1)) / DAY_MS))
    : 0
  const photoCountScore = Math.min(group.photoCount, 200) * 8
  const representativeGpsScore = group.representativeGps ? 120 : 0
  const titleScore = normalizeTitleCandidate(group.displayTitle || group.title) ? 100 : 0
  const thumbnailScore = group.representativeThumbnailRelativePath ? 80 : 0
  const unknownLocationPenalty = group.isUnknownLocation ? 120 : 0
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

export function buildMapGroupRecord(group: GroupSummary): MapGroupRecord {
  const latestCapturedAtIso = group.latestCapturedAtIso
  const displayTitle = resolveGroupDisplayTitle(group)
  const pinLocation = resolveGroupPinLocation(group)
  const regionLabel =
    normalizeTitleCandidate(group.regionLabel) || UNKNOWN_LOCATION_LABEL

  return {
    group,
    displayTitle,
    cleanedTitle: normalizeTitleCandidate(group.title || group.displayTitle),
    regionLabel,
    latestCapturedAtIso,
    dateLabel: formatDateLabel(latestCapturedAtIso),
    pinLocation,
    gpsBreakdown: resolveGroupGpsBreakdown(group),
    searchText: [group.searchText, displayTitle, regionLabel]
      .join(' ')
      .toLocaleLowerCase()
      .replace(/\s+/g, ' ')
      .trim(),
    score: resolveGroupScore(group, pinLocation),
    isUnknownLocation: group.isUnknownLocation
  }
}

export function buildSelectedGroupPhotoPins(
  group: GroupDetail | null | undefined,
  options: {
    maxPins: number
  }
): MapPhotoPinRecord[] {
  if (!group) {
    return []
  }

  const pins: MapPhotoPinRecord[] = []

  for (const photo of group.photos) {
    const pinLocation = resolvePhotoPinLocation(photo)

    if (!pinLocation) {
      continue
    }

    const isRepresentative = group.representativePhotoId === photo.id

    pins.push({
      id: `photo-pin:${photo.id}`,
      photoId: photo.id,
      sourceFileName: photo.sourceFileName,
      latitude: pinLocation.latitude,
      longitude: pinLocation.longitude,
      capturedAtIso: photo.capturedAtIso,
      regionName: photo.regionName,
      thumbnailRelativePath: photo.thumbnailRelativePath,
      outputRelativePath: photo.outputRelativePath,
      isRepresentative,
      gpsSource: pinLocation.gpsSource,
      score: resolvePhotoPinScore(photo, isRepresentative, pinLocation)
    })
  }

  return pins
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      if ((left.capturedAtIso ?? '') !== (right.capturedAtIso ?? '')) {
        return (right.capturedAtIso ?? '').localeCompare(left.capturedAtIso ?? '')
      }

      return left.sourceFileName.localeCompare(right.sourceFileName)
    })
    .slice(0, Math.max(0, options.maxPins))
}

export function findSelectedGroupPhotoPin(
  group: GroupDetail | null | undefined,
  photoId: string | undefined
): MapPhotoPinRecord | null {
  if (!group || !photoId) {
    return null
  }

  const photo = group.photos.find((candidate) => candidate.id === photoId)

  if (!photo) {
    return null
  }

  const pinLocation = resolvePhotoPinLocation(photo)

  if (!pinLocation) {
    return null
  }

  const isRepresentative = group.representativePhotoId === photo.id

  return {
    id: `photo-pin:${photo.id}`,
    photoId: photo.id,
    sourceFileName: photo.sourceFileName,
    latitude: pinLocation.latitude,
    longitude: pinLocation.longitude,
    capturedAtIso: photo.capturedAtIso,
    regionName: photo.regionName,
    thumbnailRelativePath: photo.thumbnailRelativePath,
    outputRelativePath: photo.outputRelativePath,
    isRepresentative,
    gpsSource: pinLocation.gpsSource,
    score: resolvePhotoPinScore(photo, isRepresentative, pinLocation)
  }
}

export function buildMapGroupRecords(groups: GroupSummary[]): MapGroupRecord[] {
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
      start: isoDate(
        new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1, 12))
      ),
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
  group: GroupSummary,
  dateRange: DateRangeFilter | null | undefined
): boolean {
  const start = normalizeDateBoundary(dateRange?.start)
  const end = normalizeDateBoundary(dateRange?.end, true)

  if (start === undefined && end === undefined) {
    return true
  }

  const earliest = toTimestamp(group.earliestCapturedAtIso)
  const latest = toTimestamp(group.latestCapturedAtIso)

  if (!Number.isFinite(earliest) && !Number.isFinite(latest)) {
    return false
  }

  const rangeStart = Number.isFinite(earliest) ? earliest : latest
  const rangeEnd = Number.isFinite(latest) ? latest : earliest

  if (start !== undefined && rangeEnd < start) {
    return false
  }

  if (end !== undefined && rangeStart > end) {
    return false
  }

  return true
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

export function buildRepresentativeMarkerGroups(
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

  if (options.zoomLevel < 3) {
    return []
  }

  if (options.zoomLevel < 5) {
    return [...pool]
      .sort((left, right) => right.score - left.score)
      .slice(0, 1)
  }

  if (options.zoomLevel < 8) {
    return sampleGroupsByRegion(pool, 1)
  }

  if (options.zoomLevel < 10) {
    return sampleGroupsByRegion(pool, 2)
  }

  if (options.zoomLevel < 12) {
    return sampleGroupsByRegion(pool, 4)
  }

  return [...pool].sort((left, right) => right.score - left.score)
}

export function deriveMapPageState(
  groups: GroupSummary[],
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
