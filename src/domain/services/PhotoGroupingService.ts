import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'

function buildGroupKey(photo: Photo): string {
  const year = photo.capturedAt?.year ?? '0000'
  const month = photo.capturedAt?.month ?? '00'
  const region = photo.regionName ?? 'location-unknown'

  return `${year}-${month}-${region}`
}

export function createPhotoGroups(photos: Photo[]): PhotoGroup[] {
  const groupedPhotos = new Map<string, Photo[]>()

  for (const photo of photos) {
    if (photo.isDuplicate) {
      continue
    }

    const key = buildGroupKey(photo)
    const existing = groupedPhotos.get(key) ?? []
    existing.push(photo)
    groupedPhotos.set(key, existing)
  }

  return Array.from(groupedPhotos.entries()).map(([key, groupPhotos], index) => {
    const firstPhoto = groupPhotos[0]
    const [year, month, regionName] = key.split('-')

    return {
      id: `group-${index + 1}`,
      title: `${year}-${month} ${regionName}`,
      photoIds: groupPhotos.map((photo) => photo.id),
      representativePhotoId: firstPhoto?.id,
      representativeGps: firstPhoto?.gps,
      representativeThumbnailRelativePath: firstPhoto?.thumbnailRelativePath,
      companions: []
    }
  })
}
