import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { groupPhotosByPolicy } from '@domain/services/GroupingPolicy'
import { selectRepresentativePhoto } from '@domain/services/RepresentativePhotoPolicy'

export function createPhotoGroups(photos: Photo[]): PhotoGroup[] {
  const uniquePhotos = photos.filter((photo) => !photo.isDuplicate)

  return groupPhotosByPolicy(uniquePhotos).map((bucket) => {
    const representativePhoto = selectRepresentativePhoto(bucket.photos)

    return {
      id: bucket.groupKey,
      groupKey: bucket.groupKey,
      title: bucket.displayTitle,
      displayTitle: bucket.displayTitle,
      photoIds: bucket.photos.map((photo) => photo.id),
      representativePhotoId: representativePhoto?.id,
      representativeGps: representativePhoto?.gps,
      representativeThumbnailRelativePath: representativePhoto?.thumbnailRelativePath,
      companions: []
    }
  })
}
