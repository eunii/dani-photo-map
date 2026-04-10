import type { Photo } from '@domain/entities/Photo'
import { selectCanonicalDuplicatePhoto } from '@domain/services/DuplicatePhotoPolicy'

export function createCanonicalPhotoIdByHash(
  photos: Photo[]
): Map<string, string> {
  const photosByHash = new Map<string, Photo[]>()

  for (const photo of photos) {
    if (!photo.sha256) {
      continue
    }

    const duplicateSet = photosByHash.get(photo.sha256) ?? []

    duplicateSet.push(photo)
    photosByHash.set(photo.sha256, duplicateSet)
  }

  return new Map(
    Array.from(photosByHash.entries())
      .map(([sha256, duplicateSet]) => {
        const canonicalPhoto = selectCanonicalDuplicatePhoto(duplicateSet)

        return canonicalPhoto ? ([sha256, canonicalPhoto.id] as const) : null
      })
      .filter((entry): entry is readonly [string, string] => entry !== null)
  )
}
