import type {
  ExistingOutputGroupSummarySnapshot,
  ExistingOutputPhotoSnapshot
} from '@application/ports/ExistingOutputScannerPort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import {
  type GroupDetail,
  type GroupGpsBreakdownSummary,
  type GroupPhotoSummary,
  type GroupPinLocationSummary,
  type GroupSummary,
  type LibraryIndexView
} from '@shared/types/preload'
import { parseOutputDir } from '@shared/utils/outputRelativePath'

const UNKNOWN_LOCATION_LABEL = 'Unknown Location'

function toTimestamp(iso?: string): number {
  if (!iso) {
    return Number.NEGATIVE_INFINITY
  }

  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

function normalizeLabel(value?: string): string {
  const trimmed = value?.trim() ?? ''
  return trimmed || UNKNOWN_LOCATION_LABEL
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

function pickPathSegments(photos: Photo[]): string[] {
  const counts = new Map<string, { count: number; segments: string[] }>()

  for (const photo of photos) {
    const parsed = parseOutputDir(photo.outputRelativePath)
    if (parsed.kind !== 'nested') {
      continue
    }

    const key = parsed.segments.join('/')
    const current = counts.get(key)
    counts.set(key, {
      count: (current?.count ?? 0) + 1,
      segments: parsed.segments
    })
  }

  return [...counts.values()].sort((left, right) => right.count - left.count)[0]
    ?.segments ?? []
}

function getRegionLabel(group: PhotoGroup, photos: Photo[]): string {
  const counts = new Map<string, number>()

  for (const photo of photos) {
    const label = normalizeLabel(photo.regionName)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const best = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0]
  return best ?? normalizeLabel(group.displayTitle || group.title)
}

function getCapturedAtBounds(photos: Photo[]): {
  earliestCapturedAtIso?: string
  latestCapturedAtIso?: string
} {
  const values = photos
    .map((photo) => photo.capturedAt?.iso)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))

  return {
    earliestCapturedAtIso: values[0],
    latestCapturedAtIso: values[values.length - 1]
  }
}

function resolveGpsBreakdown(photos: Photo[]): GroupGpsBreakdownSummary {
  let exactGpsCount = 0
  let inferredGpsCount = 0
  let missingGpsCount = 0

  for (const photo of photos) {
    if (isValidCoordinate(photo.originalGps)) {
      exactGpsCount += 1
      continue
    }

    if (isValidCoordinate(photo.gps)) {
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

function resolvePinLocation(
  group: PhotoGroup,
  photos: Photo[]
): GroupPinLocationSummary | null {
  const originalGpsPhoto = [...photos]
    .filter((photo) => isValidCoordinate(photo.originalGps))
    .sort(
      (left, right) =>
        toTimestamp(right.capturedAt?.iso) - toTimestamp(left.capturedAt?.iso)
    )[0]

  if (originalGpsPhoto?.originalGps) {
    return {
      latitude: originalGpsPhoto.originalGps.latitude,
      longitude: originalGpsPhoto.originalGps.longitude,
      source: 'photo-original-gps'
    }
  }

  const gpsPhoto = [...photos]
    .filter((photo) => isValidCoordinate(photo.gps))
    .sort(
      (left, right) =>
        toTimestamp(right.capturedAt?.iso) - toTimestamp(left.capturedAt?.iso)
    )[0]

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

function buildSearchText(
  group: PhotoGroup,
  photos: Photo[],
  regionLabel: string,
  latestCapturedAtIso?: string
): string {
  return [
    group.title,
    group.displayTitle,
    regionLabel,
    latestCapturedAtIso ?? '',
    ...photos.map((photo) => photo.sourceFileName),
    ...photos.map((photo) => photo.regionName ?? '')
  ]
    .join(' ')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function toGroupPhotoSummary(photo: Photo): GroupPhotoSummary {
  return {
    id: photo.id,
    sourceFileName: photo.sourceFileName,
    capturedAtIso: photo.capturedAt?.iso,
    capturedAtSource: photo.capturedAtSource,
    originalGps: photo.originalGps,
    gps: photo.gps,
    locationSource: photo.locationSource,
    regionName: photo.regionName,
    thumbnailRelativePath: photo.thumbnailRelativePath,
    outputRelativePath: photo.outputRelativePath,
    hasGps: Boolean(photo.gps),
    missingGpsCategory: photo.missingGpsCategory
  }
}

export function toGroupDetailView(
  group: PhotoGroup,
  photosById: Map<string, Photo>
): GroupDetail {
  const photos = group.photoIds
    .map((photoId) => photosById.get(photoId))
    .filter((photo): photo is Photo => Boolean(photo))

  return {
    id: group.id,
    groupKey: group.groupKey,
    pathSegments: pickPathSegments(photos),
    title: group.title,
    displayTitle: group.displayTitle,
    photoCount: group.photoIds.length,
    photoIds: group.photoIds,
    representativePhotoId: group.representativePhotoId,
    representativeThumbnailRelativePath: group.representativeThumbnailRelativePath,
    representativeGps: group.representativeGps,
    companions: group.companions,
    notes: group.notes,
    photos: photos.map(toGroupPhotoSummary)
  }
}

function toGroupSummary(
  group: PhotoGroup,
  photosById: Map<string, Photo>
): GroupSummary {
  const photos = group.photoIds
    .map((photoId) => photosById.get(photoId))
    .filter((photo): photo is Photo => Boolean(photo))
  const pathSegments = pickPathSegments(photos)
  const regionLabel = getRegionLabel(group, photos)
  const { earliestCapturedAtIso, latestCapturedAtIso } = getCapturedAtBounds(photos)
  const representativePhoto =
    (group.representativePhotoId
      ? photos.find((photo) => photo.id === group.representativePhotoId)
      : undefined) ?? photos[0]

  return {
    id: group.id,
    groupKey: group.groupKey,
    pathSegments,
    title: group.title,
    displayTitle: group.displayTitle,
    photoCount: group.photoIds.length,
    representativePhotoId: group.representativePhotoId,
    representativeThumbnailRelativePath: group.representativeThumbnailRelativePath,
    representativeOutputRelativePath: representativePhoto?.outputRelativePath,
    representativeGps: group.representativeGps,
    companions: group.companions,
    notes: group.notes,
    regionLabel,
    earliestCapturedAtIso,
    latestCapturedAtIso,
    searchText: buildSearchText(group, photos, regionLabel, latestCapturedAtIso),
    gpsBreakdown: resolveGpsBreakdown(photos),
    pinLocation: resolvePinLocation(group, photos),
    isUnknownLocation: regionLabel === UNKNOWN_LOCATION_LABEL
  }
}

export function toLibraryIndexView(index: LibraryIndex): LibraryIndexView {
  const photosById = new Map(index.photos.map((photo) => [photo.id, photo]))

  return {
    generatedAt: index.generatedAt,
    outputRoot: index.outputRoot,
    groups: index.groups.map((group) => toGroupSummary(group, photosById))
  }
}

export function toFallbackLibraryIndexView(
  outputRoot: string,
  generatedAt: string,
  groups: ExistingOutputGroupSummarySnapshot[]
): LibraryIndexView {
  return {
    generatedAt,
    outputRoot,
    groups: groups.map((group) => ({
      id: group.id,
      groupKey: group.groupKey,
      pathSegments: group.pathSegments,
      title: group.title,
      displayTitle: group.displayTitle,
      photoCount: group.photoCount,
      representativePhotoId: undefined,
      representativeThumbnailRelativePath: undefined,
      representativeOutputRelativePath: group.representativeOutputRelativePath,
      representativeGps: undefined,
      companions: [],
      notes: undefined,
      regionLabel: group.regionLabel,
      earliestCapturedAtIso: group.earliestCapturedAt?.iso,
      latestCapturedAtIso: group.latestCapturedAt?.iso,
      searchText: group.searchText,
      gpsBreakdown: {
        exactGpsCount: 0,
        inferredGpsCount: 0,
        missingGpsCount: group.photoCount
      },
      pinLocation: null,
      isUnknownLocation: group.regionLabel === UNKNOWN_LOCATION_LABEL
    }))
  }
}

export function toFallbackGroupDetailView(
  groupId: string,
  pathSegments: string[],
  photos: ExistingOutputPhotoSnapshot[]
): GroupDetail {
  const title = pathSegments[pathSegments.length - 1] ?? 'Recovered Group'

  return {
    id: groupId,
    groupKey: groupId,
    pathSegments,
    title,
    displayTitle: title,
    photoCount: photos.length,
    photoIds: photos.map((photo) => photo.id),
    representativePhotoId: photos[0]?.id,
    representativeThumbnailRelativePath: undefined,
    representativeGps: undefined,
    companions: [],
    notes: undefined,
    photos: photos.map((photo) =>
      toGroupPhotoSummary({
        id: photo.id,
        sourcePath: photo.sourcePath,
        sourceFileName: photo.sourceFileName,
        capturedAt: photo.capturedAt,
        regionName: photo.regionName,
        outputRelativePath: photo.outputRelativePath,
        isDuplicate: false,
        metadataIssues: ['recovered-from-output']
      })
    )
  }
}
