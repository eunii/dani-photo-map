import type { ExistingOutputPhotoSnapshot } from '@application/ports/ExistingOutputScannerPort'
import type { PhotoMetadataReaderPort } from '@application/ports/PhotoMetadataReaderPort'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'

interface SuggestionSourceGroup {
  id: string
  representativeGps?: {
    latitude: number
    longitude: number
  }
}

interface FallbackSuggestionCandidate {
  title: string
  distanceKm: number
  timeDeltaMs: number
}

interface BuildFallbackNearbyGroupTitleSuggestionsInput {
  currentGroup: SuggestionSourceGroup | undefined
  currentCapturedAtIso?: string
  existingOutputPhotos: ExistingOutputPhotoSnapshot[]
  existingIndex: LibraryIndex | null
  titleSourceIndex?: LibraryIndex | null
  metadataReader: PhotoMetadataReaderPort
  maxDistanceKm?: number
  maxSuggestions?: number
  maxTimeWindowMs?: number
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function calculateDistanceKm(
  left: NonNullable<SuggestionSourceGroup['representativeGps']>,
  right: NonNullable<SuggestionSourceGroup['representativeGps']>
): number {
  const earthRadiusKm = 6371
  const deltaLatitude = toRadians(right.latitude - left.latitude)
  const deltaLongitude = toRadians(right.longitude - left.longitude)
  const leftLatitude = toRadians(left.latitude)
  const rightLatitude = toRadians(right.latitude)
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(deltaLongitude / 2) ** 2

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

function isSameDay(leftIso: string, rightIso: string): boolean {
  return leftIso.slice(0, 10) === rightIso.slice(0, 10)
}

function buildTitleByOutputRelativePath(
  existingIndex: LibraryIndex | null
): Map<string, string> {
  if (!existingIndex) {
    return new Map()
  }

  const photoById = new Map(
    existingIndex.photos.map((photo) => [photo.id, photo] as const)
  )
  const titleByOutputRelativePath = new Map<string, string>()

  for (const group of existingIndex.groups) {
    const groupTitle = group.title.trim() || group.displayTitle.trim()

    if (!groupTitle) {
      continue
    }

    for (const photoId of group.photoIds) {
      const outputRelativePath = photoById.get(photoId)?.outputRelativePath

      if (outputRelativePath) {
        titleByOutputRelativePath.set(outputRelativePath, groupTitle)
      }
    }
  }

  return titleByOutputRelativePath
}

export async function buildFallbackNearbyGroupTitleSuggestions({
  currentGroup,
  currentCapturedAtIso,
  existingOutputPhotos,
  existingIndex,
  titleSourceIndex,
  metadataReader,
  maxDistanceKm = 3,
  maxSuggestions = 3,
  maxTimeWindowMs = 60 * 60 * 1000
}: BuildFallbackNearbyGroupTitleSuggestionsInput): Promise<string[]> {
  if (!currentGroup?.representativeGps || !currentCapturedAtIso) {
    return []
  }

  const currentCapturedAtMs = Date.parse(currentCapturedAtIso)

  if (Number.isNaN(currentCapturedAtMs)) {
    return []
  }

  const titleByOutputRelativePath = buildTitleByOutputRelativePath(
    titleSourceIndex ?? existingIndex
  )

  if (titleByOutputRelativePath.size === 0) {
    return []
  }

  const timeFilteredCandidates = existingOutputPhotos.filter((photo) => {
    const existingCapturedAtIso = photo.capturedAt?.iso

    if (!existingCapturedAtIso || !isSameDay(existingCapturedAtIso, currentCapturedAtIso)) {
      return false
    }

    const existingCapturedAtMs = Date.parse(existingCapturedAtIso)

    if (Number.isNaN(existingCapturedAtMs)) {
      return false
    }

    return Math.abs(existingCapturedAtMs - currentCapturedAtMs) <= maxTimeWindowMs
  })

  const rankedCandidates: FallbackSuggestionCandidate[] = []

  for (const candidate of timeFilteredCandidates) {
    const title = titleByOutputRelativePath.get(candidate.outputRelativePath)

    if (!title) {
      continue
    }

    try {
      const metadata = await metadataReader.read(candidate.sourcePath)

      if (!metadata.gps) {
        continue
      }

      const distanceKm = calculateDistanceKm(
        currentGroup.representativeGps,
        metadata.gps
      )

      if (distanceKm > maxDistanceKm) {
        continue
      }

      rankedCandidates.push({
        title,
        distanceKm,
        timeDeltaMs: Math.abs(
          Date.parse(candidate.capturedAt!.iso) - currentCapturedAtMs
        )
      })
    } catch {
      // Ignore EXIF read failures for fallback suggestion candidates.
    }
  }

  rankedCandidates.sort((left, right) => {
    if (left.distanceKm !== right.distanceKm) {
      return left.distanceKm - right.distanceKm
    }

    return left.timeDeltaMs - right.timeDeltaMs
  })

  return Array.from(
    new Set(rankedCandidates.map((candidate) => candidate.title))
  ).slice(0, maxSuggestions)
}
