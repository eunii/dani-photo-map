import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { selectRepresentativePhoto } from '@domain/services/RepresentativePhotoPolicy'

function rebuildGroupAfterRemoval(
  group: PhotoGroup,
  nextPhotoIds: string[],
  photosById: Map<string, Photo>
): PhotoGroup | null {
  if (nextPhotoIds.length === 0) {
    return null
  }

  const photos = nextPhotoIds
    .map((id) => photosById.get(id))
    .filter((photo): photo is Photo => photo !== undefined)
  const representative = selectRepresentativePhoto(photos)

  return {
    ...group,
    photoIds: nextPhotoIds,
    representativePhotoId: representative?.id,
    representativeGps: representative?.gps,
    representativeThumbnailRelativePath: representative?.thumbnailRelativePath
  }
}

/**
 * 인덱스에서 지정한 사진 id를 제거하고, 그룹·대표 사진 메타를 정리합니다.
 */
export function removePhotosFromLibraryIndex(
  index: LibraryIndex,
  photoIdsToRemove: ReadonlySet<string>
): LibraryIndex {
  const remainingPhotos = index.photos.filter((p) => !photoIdsToRemove.has(p.id))
  const photosById = new Map(remainingPhotos.map((p) => [p.id, p] as const))

  const groups = index.groups
    .map((group) => {
      const nextIds = group.photoIds.filter((id) => !photoIdsToRemove.has(id))
      return rebuildGroupAfterRemoval(group, nextIds, photosById)
    })
    .filter((group): group is PhotoGroup => group !== null)

  return {
    ...index,
    generatedAt: new Date().toISOString(),
    photos: remainingPhotos,
    groups
  }
}
