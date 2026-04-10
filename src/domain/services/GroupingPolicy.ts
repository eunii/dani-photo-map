import type { Photo } from '@domain/entities/Photo'
import {
  defaultMissingGpsGroupingBasis,
  type MissingGpsGroupingBasis
} from '@domain/policies/MissingGpsGroupingBasis'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import {
  isUsableCapturedAtValue,
  pickEarliestUsableCapturedAtFromPhotos
} from '@domain/services/groupingDateHelpers'

interface PhotoGroupBucket {
  groupKey: string
  displayTitle: string
  photos: Photo[]
}

interface GroupSeed {
  /** 버킷·groupKey용 (GPS 없으면 `unknownRegionLabel` 등 안정적 라벨) */
  regionName: string
  /** 자동 그룹 표시용: GPS 기반 지역명만, GPS 없으면 빈 문자열 */
  displayRegionLabel: string
  basis: MissingGpsGroupingBasis
  year: string
  month: string
  day: string
  slotIndex: number
  manualGroupId?: string
  manualGroupTitle?: string
}

export interface GroupingPolicyOptions {
  missingGpsGroupingBasis?: MissingGpsGroupingBasis
}

function getPhotoGroupingLabel(photo: Photo): string | undefined {
  return photo.folderGroupingLabel?.trim() || undefined
}

function getPhotoRegionName(photo: Photo): string {
  return (
    getPhotoGroupingLabel(photo) ??
    photo.regionName ??
    defaultOrganizationRules.unknownRegionLabel
  )
}

function getAutoGroupDisplayRegionLabel(photo: Photo): string {
  const folderGroupingLabel = getPhotoGroupingLabel(photo)

  if (folderGroupingLabel) {
    return folderGroupingLabel
  }

  if (!photo.gps) {
    return ''
  }

  return (photo.regionName ?? '').trim()
}

function getPhotoYear(photo: Photo): string {
  return photo.capturedAt?.year ?? '0000'
}

function getPhotoMonth(photo: Photo): string {
  return photo.capturedAt?.month ?? '00'
}

function getPhotoYearMonthId(photo: Photo): string {
  return `${getPhotoYear(photo)}-${getPhotoMonth(photo)}`
}

function getPhotoDay(photo: Photo): string {
  return photo.capturedAt?.day ?? '00'
}

function getMonthWeekSegment(photo: Photo): string {
  const day = Number.parseInt(getPhotoDay(photo), 10)

  if (!Number.isFinite(day) || day <= 0) {
    return 'week0'
  }

  return `week${Math.floor((day - 1) / 7) + 1}`
}

function resolveGroupingBasis(
  photo: Photo,
  options: GroupingPolicyOptions
): MissingGpsGroupingBasis {
  if (photo.gps) {
    return 'month'
  }

  return (
    photo.missingGpsGroupingBasis ??
    options.missingGpsGroupingBasis ??
    defaultMissingGpsGroupingBasis
  )
}

function getPhotoBucketDay(
  photo: Photo,
  basis: MissingGpsGroupingBasis
): string {
  switch (basis) {
    case 'day':
      return getPhotoDay(photo)
    case 'week':
      return getMonthWeekSegment(photo)
    case 'month':
    default:
      return '00'
  }
}

function getPhotoPeriodId(
  photo: Photo,
  basis: MissingGpsGroupingBasis
): string {
  return [getPhotoYearMonthId(photo), getPhotoBucketDay(photo, basis)].join('|')
}

function buildGroupDisplayTitle(seed: GroupSeed): string {
  if (seed.manualGroupTitle) {
    return seed.manualGroupTitle
  }

  if (!seed.displayRegionLabel && seed.basis === 'week') {
    return seed.day
  }

  if (!seed.displayRegionLabel && seed.basis === 'day') {
    return seed.day
  }

  return seed.displayRegionLabel
}

function buildGroupKey(seed: GroupSeed): string {
  const baseKey = [
    'group',
    `region=${encodeURIComponent(seed.regionName)}`,
    `year=${seed.year}`,
    `month=${seed.month}`,
    `basis=${seed.basis}`,
    `day=${seed.day}`,
    `slot=${seed.slotIndex}`
  ]

  if (seed.manualGroupId) {
    baseKey.push(`manual=${encodeURIComponent(seed.manualGroupId)}`)
  }

  return baseKey.join('|')
}

function finalizeGroupSeed(
  photos: Photo[],
  seed: GroupSeed,
  options: GroupingPolicyOptions
): GroupSeed {
  const manual = photos.find(
    (photo) => photo.manualGroupId && photo.manualGroupTitle?.trim()
  )

  if (manual?.manualGroupTitle && manual.manualGroupId) {
    return {
      ...seed,
      manualGroupId: manual.manualGroupId,
      manualGroupTitle: manual.manualGroupTitle.trim()
    }
  }

  const earliest = pickEarliestUsableCapturedAtFromPhotos(photos)
  const photoForRegionDisplay =
    photos.find((photo) => getPhotoGroupingLabel(photo)) ??
    photos.find((photo) => photo.gps)
  const displayRegionLabel = photoForRegionDisplay
    ? getAutoGroupDisplayRegionLabel(photoForRegionDisplay)
    : ''

  if (!earliest) {
    return {
      ...seed,
      displayRegionLabel
    }
  }

  const firstPhoto = photos[0]

  if (!firstPhoto) {
    throw new Error('Cannot finalize a group seed without photos.')
  }

  return {
    ...seed,
    year: earliest.year,
    month: earliest.month,
    day: getPhotoBucketDay(
      {
        ...firstPhoto,
        capturedAt: earliest,
        missingGpsGroupingBasis: seed.basis
      },
      seed.basis
    ),
    displayRegionLabel
  }
}

function comparePhotosByTimeline(left: Photo, right: Photo): number {
  const leftIso = left.capturedAt?.iso ?? ''
  const rightIso = right.capturedAt?.iso ?? ''

  if (leftIso !== rightIso) {
    return leftIso.localeCompare(rightIso)
  }

  return left.sourceFileName.localeCompare(right.sourceFileName)
}

function shouldStartNewGroup(
  previousPhoto: Photo | undefined,
  nextPhoto: Photo,
  options: GroupingPolicyOptions
): boolean {
  if (!previousPhoto) {
    return true
  }

  const previousUsable = isUsableCapturedAtValue(previousPhoto.capturedAt)
  const nextUsable = isUsableCapturedAtValue(nextPhoto.capturedAt)

  if (
    previousUsable &&
    nextUsable &&
    (
      resolveGroupingBasis(previousPhoto, options) !==
        resolveGroupingBasis(nextPhoto, options) ||
      getPhotoPeriodId(
        previousPhoto,
        resolveGroupingBasis(previousPhoto, options)
      ) !==
        getPhotoPeriodId(nextPhoto, resolveGroupingBasis(nextPhoto, options))
    )
  ) {
    return true
  }

  if ((previousPhoto.manualGroupId ?? '') !== (nextPhoto.manualGroupId ?? '')) {
    return true
  }

  return false
}

export function groupPhotosByPolicy(
  photos: Photo[],
  options: GroupingPolicyOptions = {}
): PhotoGroupBucket[] {
  const photosByRegion = new Map<string, Photo[]>()

  for (const photo of photos) {
    const regionName = getPhotoRegionName(photo)
    const regionPhotos = photosByRegion.get(regionName) ?? []

    regionPhotos.push(photo)
    photosByRegion.set(regionName, regionPhotos)
  }

  const buckets: PhotoGroupBucket[] = []

  for (const [regionName, regionPhotos] of photosByRegion.entries()) {
    const sortedPhotos = [...regionPhotos].sort(comparePhotosByTimeline)
    let currentPhotos: Photo[] = []
    let currentSeed: GroupSeed | undefined
    let slotIndex = 0

    for (const photo of sortedPhotos) {
      if (shouldStartNewGroup(currentPhotos.at(-1), photo, options)) {
        if (currentSeed && currentPhotos.length > 0) {
          const finalizedSeed = finalizeGroupSeed(currentPhotos, currentSeed, options)

          buckets.push({
            groupKey: buildGroupKey(finalizedSeed),
            displayTitle: buildGroupDisplayTitle(finalizedSeed),
            photos: currentPhotos
          })
        }

        slotIndex += 1
        const basis = resolveGroupingBasis(photo, options)
        currentSeed = {
          regionName,
          displayRegionLabel: getAutoGroupDisplayRegionLabel(photo),
          basis,
          year: getPhotoYear(photo),
          month: getPhotoMonth(photo),
          day: getPhotoBucketDay(photo, basis),
          slotIndex,
          manualGroupId: photo.manualGroupId,
          manualGroupTitle: photo.manualGroupTitle
        }
        currentPhotos = [photo]
      } else {
        currentPhotos.push(photo)
      }
    }

    if (currentSeed && currentPhotos.length > 0) {
      const finalizedSeed = finalizeGroupSeed(currentPhotos, currentSeed, options)

      buckets.push({
        groupKey: buildGroupKey(finalizedSeed),
        displayTitle: buildGroupDisplayTitle(finalizedSeed),
        photos: currentPhotos
      })
    }
  }

  return buckets.sort((left, right) => left.groupKey.localeCompare(right.groupKey))
}
