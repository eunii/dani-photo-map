import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import {
  applyRenamePlan,
  createGroupAwareRenamePlan
} from '@application/services/groupAwarePhotoRelocation'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { type OrganizationRules } from '@domain/policies/OrganizationRules'
import { selectRepresentativePhoto } from '@domain/services/RepresentativePhotoPolicy'

function uniquePhotoIds(photoIds: string[]): string[] {
  return Array.from(new Set(photoIds))
}

function resolvePhotoRegionName(photo: Photo): string | undefined {
  if (photo.regionName) {
    return photo.regionName
  }

  const outputRelativePath = photo.outputRelativePath?.replace(/\\/g, '/')

  return outputRelativePath?.split('/').at(-2)
}

function rebuildGroup(
  group: PhotoGroup,
  photoIds: string[],
  photosById: Map<string, Photo>
): PhotoGroup | null {
  if (photoIds.length === 0) {
    return null
  }

  const photos = photoIds
    .map((photoId) => photosById.get(photoId))
    .filter((photo): photo is Photo => photo !== undefined)
  const representativePhoto = selectRepresentativePhoto(photos)

  return {
    ...group,
    photoIds,
    representativePhotoId: representativePhoto?.id,
    representativeGps: representativePhoto?.gps,
    representativeThumbnailRelativePath: representativePhoto?.thumbnailRelativePath
  }
}

export async function movePhotosIntoGroup(params: {
  index: LibraryIndex
  outputRoot: string
  sourceGroupId: string
  destinationGroupId: string
  photoIds: string[]
  fileSystem: Pick<
    PhotoLibraryFileSystemPort,
    'ensureDirectory' | 'listDirectoryFileNames' | 'moveFile'
  >
  rules: OrganizationRules
}): Promise<LibraryIndex> {
  const {
    destinationGroupId,
    fileSystem,
    index,
    outputRoot,
    photoIds,
    rules,
    sourceGroupId
  } = params

  if (sourceGroupId === destinationGroupId) {
    return index
  }

  const photosById = new Map(index.photos.map((photo) => [photo.id, photo] as const))
  const sourceGroup = index.groups.find((group) => group.id === sourceGroupId)
  const destinationGroup = index.groups.find((group) => group.id === destinationGroupId)

  if (!sourceGroup) {
    throw new Error(`Source photo group not found: ${sourceGroupId}`)
  }

  if (!destinationGroup) {
    throw new Error(`Destination photo group not found: ${destinationGroupId}`)
  }

  const movingPhotoIds = uniquePhotoIds(photoIds)

  for (const photoId of movingPhotoIds) {
    if (!sourceGroup.photoIds.includes(photoId)) {
      throw new Error(`Photo does not belong to source group: ${photoId}`)
    }
  }

  const destinationRepresentativePhoto = destinationGroup.representativePhotoId
    ? photosById.get(destinationGroup.representativePhotoId)
    : undefined
  const destinationGps =
    destinationRepresentativePhoto?.gps ?? destinationGroup.representativeGps

  if (!destinationGps) {
    throw new Error('Destination group must have representative GPS.')
  }

  const destinationRegionName = destinationRepresentativePhoto
    ? resolvePhotoRegionName(destinationRepresentativePhoto)
    : undefined

  if (!destinationRegionName) {
    throw new Error('Destination group region could not be resolved.')
  }

  const updatedPhotosBeforeRename: Photo[] = index.photos.map((photo) =>
    movingPhotoIds.includes(photo.id)
      ? {
          ...photo,
          gps: destinationGps,
          locationSource: 'assigned-from-group' as const,
          regionName: destinationRegionName
        }
      : photo
  )
  const movingPhotos = updatedPhotosBeforeRename.filter((photo) =>
    movingPhotoIds.includes(photo.id)
  )
  const renamePlan = await createGroupAwareRenamePlan({
    photos: movingPhotos,
    outputRoot,
    groupTitle: destinationGroup.title,
    fileSystem,
    rules
  })

  await applyRenamePlan(renamePlan, fileSystem)

  const renamedPhotos = updatedPhotosBeforeRename.map((photo) => {
    const plannedRename = renamePlan.find((plan) => plan.photoId === photo.id)

    return plannedRename
      ? {
          ...photo,
          outputRelativePath: plannedRename.nextOutputRelativePath
        }
      : photo
  })
  const renamedPhotosById = new Map(renamedPhotos.map((photo) => [photo.id, photo] as const))
  const sourcePhotoIdSet = new Set(sourceGroup.photoIds)
  const destinationPhotoIdSet = new Set(destinationGroup.photoIds)

  for (const photoId of movingPhotoIds) {
    sourcePhotoIdSet.delete(photoId)
    destinationPhotoIdSet.add(photoId)
  }

  const updatedGroups = index.groups
    .map((group) => {
      if (group.id === sourceGroup.id) {
        return rebuildGroup(group, [...sourcePhotoIdSet], renamedPhotosById)
      }

      if (group.id === destinationGroup.id) {
        return rebuildGroup(group, [...destinationPhotoIdSet], renamedPhotosById)
      }

      return group
    })
    .filter((group): group is PhotoGroup => group !== null)

  return {
    ...index,
    photos: renamedPhotos,
    groups: updatedGroups
  }
}
