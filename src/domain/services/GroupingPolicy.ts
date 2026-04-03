import type { Photo } from '@domain/entities/Photo'

const MAX_GROUP_TIME_GAP_MS = 6 * 60 * 60 * 1000

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

function getPhotoDay(photo: Photo): string {
  return photo.capturedAt?.day ?? '00'
}

function buildGroupDisplayTitle(seed: GroupSeed): string {
  const dateLabel =
    seed.day === '00'
      ? `${seed.year}-${seed.month}`
      : `${seed.year}-${seed.month}-${seed.day}`

  return `${dateLabel} ${seed.regionName}`
}

function buildGroupKey(seed: GroupSeed): string {
  return [
    'group',
    `region=${encodeURIComponent(seed.regionName)}`,
    `year=${seed.year}`,
    `month=${seed.month}`,
    `day=${seed.day}`,
    `slot=${seed.slotIndex}`
  ].join('|')
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

  if (getPhotoDay(previousPhoto) !== getPhotoDay(nextPhoto)) {
    return true
  }

  const previousIso = previousPhoto.capturedAt?.iso
  const nextIso = nextPhoto.capturedAt?.iso

  if (!previousIso || !nextIso) {
    return false
  }

  const previousTime = Date.parse(previousIso)
  const nextTime = Date.parse(nextIso)

  return nextTime - previousTime > MAX_GROUP_TIME_GAP_MS
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
          buckets.push({
            groupKey: buildGroupKey(currentSeed),
            displayTitle: buildGroupDisplayTitle(currentSeed),
            photos: currentPhotos
          })
        }

        slotIndex += 1
        currentSeed = {
          regionName,
          year: getPhotoYear(photo),
          month: getPhotoMonth(photo),
          day: getPhotoDay(photo),
          slotIndex
        }
        currentPhotos = [photo]
      } else {
        currentPhotos.push(photo)
      }
    }

    if (currentSeed && currentPhotos.length > 0) {
      buckets.push({
        groupKey: buildGroupKey(currentSeed),
        displayTitle: buildGroupDisplayTitle(currentSeed),
        photos: currentPhotos
      })
    }
  }

  return buckets.sort((left, right) => left.groupKey.localeCompare(right.groupKey))
}
