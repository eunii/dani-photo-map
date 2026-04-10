import type { GroupDetail } from '@shared/types/preload'

export function createGroupDetailFixture(
  overrides: Partial<GroupDetail> & Pick<GroupDetail, 'id' | 'title'>
): GroupDetail {
  const photos = overrides.photos ?? []

  return {
    id: overrides.id,
    groupKey: overrides.groupKey ?? overrides.id,
    pathSegments: overrides.pathSegments ?? [],
    title: overrides.title,
    displayTitle: overrides.displayTitle ?? overrides.title,
    photoCount: overrides.photoCount ?? Math.max(photos.length, 1),
    photoIds: overrides.photoIds ?? photos.map((photo) => photo.id),
    representativePhotoId: overrides.representativePhotoId,
    representativeThumbnailRelativePath: overrides.representativeThumbnailRelativePath,
    representativeGps: overrides.representativeGps,
    companions: overrides.companions ?? [],
    notes: overrides.notes,
    photos
  }
}
