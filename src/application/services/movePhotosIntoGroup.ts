import type { RenamePlanExecuteOptions } from '@application/dto/RenamePlanProgress'
import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import {
  applyRenamePlan,
  createGroupAwareRenamePlan
} from '@application/services/groupAwarePhotoRelocation'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { PhotoGroup } from '@domain/entities/PhotoGroup'
import { type OrganizationRules } from '@domain/policies/OrganizationRules'
import {
  deriveMergedGroupTitleFromPhotos,
  isUsableCapturedAtValue
} from '@domain/services/groupingDateHelpers'
import { selectRepresentativePhoto } from '@domain/services/RepresentativePhotoPolicy'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

function uniquePhotoIds(photoIds: string[]): string[] {
  return Array.from(new Set(photoIds))
}

function resolvePhotoRegionName(photo: Photo): string | undefined {
  if (photo.regionName) {
    return photo.regionName
  }

  const segments =
    photo.outputRelativePath?.replace(/\\/g, '/').split('/').filter(Boolean) ?? []

  if (segments.length >= 4) {
    return segments.at(-2)
  }

  return undefined
}

function pickEarliestDonorPhotoFromDestinationGroup(
  destinationGroup: PhotoGroup,
  photosById: Map<string, Photo>
): Photo | undefined {
  const candidates = destinationGroup.photoIds
    .map((photoId) => photosById.get(photoId))
    .filter((photo): photo is Photo => photo !== undefined)
    .filter((photo) => isUsableCapturedAtValue(photo.capturedAt))

  if (candidates.length === 0) {
    return undefined
  }

  candidates.sort((left, right) =>
    (left.capturedAt!.iso).localeCompare(right.capturedAt!.iso)
  )

  return candidates[0]
}

function parseCapturedAtFromGroupLabels(
  title: string,
  displayTitle: string
): PhotoTimestamp | undefined {
  for (const label of [title, displayTitle]) {
    const match = label.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)

    if (!match) {
      continue
    }

    const year = match[1]!
    const month = match[2]!
    const day = match[3]!
    const iso = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0)
    ).toISOString()

    return {
      iso,
      year,
      month,
      day,
      time: `${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}`
    }
  }

  return undefined
}

function applyCapturedAtBackfillToMovingPhoto(
  photo: Photo,
  donor: Photo | undefined,
  titleFallback: PhotoTimestamp | undefined
): Photo {
  if (isUsableCapturedAtValue(photo.capturedAt)) {
    return photo
  }

  if (donor && isUsableCapturedAtValue(donor.capturedAt)) {
    return {
      ...photo,
      capturedAt: donor.capturedAt,
      capturedAtSource: donor.capturedAtSource ?? photo.capturedAtSource
    }
  }

  if (titleFallback) {
    return {
      ...photo,
      capturedAt: titleFallback,
      capturedAtSource: 'inferred-from-group-title'
    }
  }

  return photo
}

function rebuildGroup(
  group: PhotoGroup,
  photoIds: string[],
  photosById: Map<string, Photo>,
  titles?: { title: string; displayTitle: string }
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
    ...(titles ?? {}),
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
  /** When true, merges into the destination even if it has no representative GPS (region from folder/path). */
  allowDestinationWithoutGps?: boolean
  onRenameProgress?: RenamePlanExecuteOptions['onRenameProgress']
  /** 이동 도중 일부가 완료될 때마다 그 시점까지 반영된 인덱스를 저장하고 싶을 때 사용. */
  onIndexCheckpoint?: (partialIndex: LibraryIndex) => Promise<void>
}): Promise<LibraryIndex> {
  const {
    allowDestinationWithoutGps = false,
    destinationGroupId,
    fileSystem,
    index,
    outputRoot,
    photoIds,
    rules,
    sourceGroupId,
    onRenameProgress,
    onIndexCheckpoint
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

  if (!destinationGps && !allowDestinationWithoutGps) {
    throw new Error('Destination group must have representative GPS.')
  }

  let destinationRegionName = destinationRepresentativePhoto
    ? resolvePhotoRegionName(destinationRepresentativePhoto)
    : undefined

  if (!destinationRegionName) {
    for (const photoId of destinationGroup.photoIds) {
      const photo = photosById.get(photoId)

      if (photo) {
        destinationRegionName = resolvePhotoRegionName(photo)

        if (destinationRegionName) {
          break
        }
      }
    }
  }

  if (!destinationRegionName) {
    destinationRegionName = rules.unknownRegionLabel
  }

  const donorForCapturedAt = pickEarliestDonorPhotoFromDestinationGroup(
    destinationGroup,
    photosById
  )
  const capturedAtFromGroupTitles = parseCapturedAtFromGroupLabels(
    destinationGroup.title,
    destinationGroup.displayTitle
  )

  const updatedPhotosBeforeRename: Photo[] = index.photos.map((photo) => {
    if (!movingPhotoIds.includes(photo.id)) {
      return photo
    }

    const withLocationAndGps = destinationGps
      ? {
          ...photo,
          gps: destinationGps,
          locationSource: 'assigned-from-group' as const,
          regionName: destinationRegionName
        }
      : {
          ...photo,
          regionName: destinationRegionName
        }

    return applyCapturedAtBackfillToMovingPhoto(
      withLocationAndGps,
      donorForCapturedAt,
      capturedAtFromGroupTitles
    )
  })

  const mergedDestinationPhotoIds = uniquePhotoIds([
    ...destinationGroup.photoIds,
    ...movingPhotoIds
  ])
  const photosForMergedTitle = mergedDestinationPhotoIds
    .map((photoId) => updatedPhotosBeforeRename.find((photo) => photo.id === photoId))
    .filter((photo): photo is Photo => photo !== undefined)

  const mergedGroupTitle = deriveMergedGroupTitleFromPhotos(
    photosForMergedTitle,
    destinationRegionName,
    destinationGroup.title
  )

  const movingPhotos = updatedPhotosBeforeRename.filter((photo) =>
    movingPhotoIds.includes(photo.id)
  )
  const renamePlan = await createGroupAwareRenamePlan({
    photos: movingPhotos,
    outputRoot,
    groupTitle: mergedGroupTitle,
    fileSystem,
    rules
  })

  // 그룹 소속(대표 사진 포함)은 물리적 이동 완료 여부와 무관하게 결정되므로,
  // 파일 이동을 시작하기 전에 미리 계산해 둔다 — 이렇게 하면 이동 도중 중간
  // 저장을 하더라도 그룹 구조는 항상 최종 상태와 동일하게 유지된다.
  const photosByIdBeforeRename = new Map(
    updatedPhotosBeforeRename.map((photo) => [photo.id, photo] as const)
  )
  const sourcePhotoIdSet = new Set(sourceGroup.photoIds)
  const destinationPhotoIdSet = new Set(destinationGroup.photoIds)

  for (const photoId of movingPhotoIds) {
    sourcePhotoIdSet.delete(photoId)
    destinationPhotoIdSet.add(photoId)
  }

  const destinationTitles = {
    title: mergedGroupTitle,
    displayTitle: mergedGroupTitle
  }

  const updatedGroups = index.groups
    .map((group) => {
      if (group.id === sourceGroup.id) {
        return rebuildGroup(group, [...sourcePhotoIdSet], photosByIdBeforeRename)
      }

      if (group.id === destinationGroup.id) {
        return rebuildGroup(
          group,
          [...destinationPhotoIdSet],
          photosByIdBeforeRename,
          destinationTitles
        )
      }

      return group
    })
    .filter((group): group is PhotoGroup => group !== null)

  let checkpointedPhotos = updatedPhotosBeforeRename

  await applyRenamePlan(renamePlan, fileSystem, {
    onProgress: onRenameProgress,
    onBatchComplete: onIndexCheckpoint
      ? async ({ completedRenames }) => {
          const patch = new Map(
            completedRenames.map((plan) => [plan.photoId, plan.nextOutputRelativePath])
          )

          checkpointedPhotos = checkpointedPhotos.map((photo) =>
            patch.has(photo.id)
              ? { ...photo, outputRelativePath: patch.get(photo.id)! }
              : photo
          )

          await onIndexCheckpoint({
            ...index,
            photos: checkpointedPhotos,
            groups: updatedGroups
          })
        }
      : undefined
  })

  const finalPatch = new Map(
    renamePlan.map((plan) => [plan.photoId, plan.nextOutputRelativePath])
  )
  const renamedPhotos = updatedPhotosBeforeRename.map((photo) =>
    finalPatch.has(photo.id)
      ? { ...photo, outputRelativePath: finalPatch.get(photo.id)! }
      : photo
  )

  return {
    ...index,
    photos: renamedPhotos,
    groups: updatedGroups
  }
}
