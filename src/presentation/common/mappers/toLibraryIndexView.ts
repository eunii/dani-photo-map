import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { LibraryIndexView } from '@shared/types/preload'

export function toLibraryIndexView(index: LibraryIndex): LibraryIndexView {
  const photosById = new Map(index.photos.map((photo) => [photo.id, photo]))

  return {
    generatedAt: index.generatedAt,
    outputRoot: index.outputRoot,
    groups: index.groups.map((group) => {
      const groupPhotos = group.photoIds
        .map((photoId) => photosById.get(photoId))
        .filter((photo) => photo !== undefined)

      return {
        id: group.id,
        groupKey: group.groupKey,
        title: group.title,
        displayTitle: group.displayTitle,
        photoCount: group.photoIds.length,
        photoIds: group.photoIds,
        representativePhotoId: group.representativePhotoId,
        representativeThumbnailRelativePath:
          group.representativeThumbnailRelativePath,
        representativeGps: group.representativeGps,
        companions: group.companions,
        notes: group.notes,
        photos: groupPhotos.map((photo) => ({
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
        }))
      }
    }),
    mapGroups: index.groups
      .filter((group) => group.representativeGps)
      .map((group) => ({
        id: group.id,
        title: group.title,
        photoCount: group.photoIds.length,
        latitude: group.representativeGps!.latitude,
        longitude: group.representativeGps!.longitude,
        representativeThumbnailRelativePath:
          group.representativeThumbnailRelativePath
      }))
  }
}
