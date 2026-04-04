import type { Photo } from '@domain/entities/Photo'
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
  regionName: string
  year: string
  month: string
  day: string
  slotIndex: number
  manualGroupId?: string
  manualGroupTitle?: string
}

function getPhotoRegionName(photo: Photo): string {
  return photo.regionName ?? 'location-unknown'
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

function buildGroupDisplayTitle(seed: GroupSeed): string {
  if (seed.manualGroupTitle) {
    return seed.manualGroupTitle
  }

  const dateLabel =
    seed.day === '00'
      ? `${seed.year}-${seed.month}`
      : `${seed.year}-${seed.month}-${seed.day}`

  return `${dateLabel} ${seed.regionName}`
}

function buildGroupKey(seed: GroupSeed): string {
  const baseKey = [
    'group',
    `region=${encodeURIComponent(seed.regionName)}`,
    `year=${seed.year}`,
    `month=${seed.month}`,
    `day=${seed.day}`,
    `slot=${seed.slotIndex}`
  ]

  if (seed.manualGroupId) {
    baseKey.push(`manual=${encodeURIComponent(seed.manualGroupId)}`)
  }

  return baseKey.join('|')
}

function finalizeGroupSeed(photos: Photo[], seed: GroupSeed): GroupSeed {
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

  if (!earliest) {
    return seed
  }

  return {
    ...seed,
    year: earliest.year,
    month: earliest.month,
    day: '00'
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
  nextPhoto: Photo
): boolean {
  if (!previousPhoto) {
    return true
  }

  const previousUsable = isUsableCapturedAtValue(previousPhoto.capturedAt)
  const nextUsable = isUsableCapturedAtValue(nextPhoto.capturedAt)

  if (
    previousUsable &&
    nextUsable &&
    getPhotoYearMonthId(previousPhoto) !== getPhotoYearMonthId(nextPhoto)
  ) {
    return true
  }

  if ((previousPhoto.manualGroupId ?? '') !== (nextPhoto.manualGroupId ?? '')) {
    return true
  }

  return false
}

export function groupPhotosByPolicy(photos: Photo[]): PhotoGroupBucket[] {
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
      if (shouldStartNewGroup(currentPhotos.at(-1), photo)) {
        if (currentSeed && currentPhotos.length > 0) {
          const finalizedSeed = finalizeGroupSeed(currentPhotos, currentSeed)

          buckets.push({
            groupKey: buildGroupKey(finalizedSeed),
            displayTitle: buildGroupDisplayTitle(finalizedSeed),
            photos: currentPhotos
          })
        }

        slotIndex += 1
        currentSeed = {
          regionName,
          year: getPhotoYear(photo),
          month: getPhotoMonth(photo),
          day: getPhotoDay(photo),
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
      const finalizedSeed = finalizeGroupSeed(currentPhotos, currentSeed)

      buckets.push({
        groupKey: buildGroupKey(finalizedSeed),
        displayTitle: buildGroupDisplayTitle(finalizedSeed),
        photos: currentPhotos
      })
    }
  }

  return buckets.sort((left, right) => left.groupKey.localeCompare(right.groupKey))
}
