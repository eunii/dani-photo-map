import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'

export function mergeStoredLibraryMetadata(
  rebuiltIndex: LibraryIndex,
  storedIndex: LibraryIndex | null
): LibraryIndex {
  if (!storedIndex) {
    return rebuiltIndex
  }

  const storedPhotosByOutputRelativePath = new Map(
    storedIndex.photos
      .filter((photo) => photo.outputRelativePath)
      .map((photo) => [photo.outputRelativePath!, photo] as const)
  )
  const photos = rebuiltIndex.photos.map((photo) => {
    const outputRelativePath = photo.outputRelativePath

    if (!outputRelativePath) {
      return photo
    }

    const storedPhoto = storedPhotosByOutputRelativePath.get(outputRelativePath)

    if (!storedPhoto) {
      return photo
    }

    return {
      ...photo,
      capturedAt: storedPhoto.capturedAt ?? photo.capturedAt,
      capturedAtSource: storedPhoto.capturedAtSource ?? photo.capturedAtSource,
      originalGps: storedPhoto.originalGps ?? photo.originalGps,
      gps: storedPhoto.gps ?? photo.gps,
      locationSource: storedPhoto.locationSource ?? photo.locationSource,
      missingGpsCategory:
        storedPhoto.missingGpsCategory ?? photo.missingGpsCategory,
      manualGroupId: storedPhoto.manualGroupId ?? photo.manualGroupId,
      manualGroupTitle: storedPhoto.manualGroupTitle ?? photo.manualGroupTitle,
      regionName: storedPhoto.regionName ?? photo.regionName,
      thumbnailRelativePath:
        storedPhoto.thumbnailRelativePath ?? photo.thumbnailRelativePath,
      metadataIssues:
        photo.metadataIssues.length > 0
          ? photo.metadataIssues
          : storedPhoto.metadataIssues
    }
  })

  const photosById = new Map(photos.map((photo) => [photo.id, photo] as const))
  const photosByOutputRelativePath = new Map(
    photos
      .filter((photo) => photo.outputRelativePath)
      .map((photo) => [photo.outputRelativePath!, photo] as const)
  )
  const storedGroupsByGroupKey = new Map(
    storedIndex.groups.map((group) => [group.groupKey, group] as const)
  )
  const storedPhotosById = new Map(
    storedIndex.photos.map((photo) => [photo.id, photo] as const)
  )

  const groups = rebuiltIndex.groups.map((group) => {
    const storedGroup = storedGroupsByGroupKey.get(group.groupKey)

    if (!storedGroup) {
      return group
    }

    const representativePhotoId = resolveRepresentativePhotoId(
      storedGroup.representativePhotoId,
      storedPhotosById,
      photosByOutputRelativePath,
      group.representativePhotoId
    )
    const representativePhoto = representativePhotoId
      ? photosById.get(representativePhotoId)
      : undefined

    return {
      ...group,
      title: storedGroup.title,
      companions: storedGroup.companions,
      notes: storedGroup.notes,
      representativePhotoId,
      representativeGps: representativePhoto?.gps ?? group.representativeGps,
      representativeThumbnailRelativePath:
        representativePhoto?.thumbnailRelativePath ??
        group.representativeThumbnailRelativePath
    }
  })

  return {
    ...rebuiltIndex,
    photos,
    groups
  }
}

function resolveRepresentativePhotoId(
  storedRepresentativePhotoId: string | undefined,
  storedPhotosById: Map<string, Photo>,
  photosByOutputRelativePath: Map<string, Photo>,
  fallbackRepresentativePhotoId: string | undefined
): string | undefined {
  if (!storedRepresentativePhotoId) {
    return fallbackRepresentativePhotoId
  }

  const storedRepresentativePhoto = storedPhotosById.get(storedRepresentativePhotoId)
  const outputRelativePath = storedRepresentativePhoto?.outputRelativePath

  if (!outputRelativePath) {
    return fallbackRepresentativePhotoId
  }

  return (
    photosByOutputRelativePath.get(outputRelativePath)?.id ??
    fallbackRepresentativePhotoId
  )
}
