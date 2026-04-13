import { createPhotoGroups } from '@domain/services/PhotoGroupingService'
import type { Photo } from '@domain/entities/Photo'

export function applyPendingCustomGroupSplits(
  copiedPhotos: Photo[],
  pendingCustomGroupSplits: Array<{
    groupKey: string
    splitId: string
    title: string
    photoIds: string[]
  }>
): Photo[] {
  if (copiedPhotos.length === 0 || pendingCustomGroupSplits.length === 0) {
    return copiedPhotos
  }

  const pendingPhotoIdsByGroupKey = new Map<string, Set<string>>()

  for (const group of createPhotoGroups(copiedPhotos)) {
    pendingPhotoIdsByGroupKey.set(group.groupKey, new Set(group.photoIds))
  }

  const splitByPhotoId = new Map<
    string,
    {
      splitId: string
      title: string
    }
  >()

  for (const split of pendingCustomGroupSplits) {
    const allowedPhotoIds = pendingPhotoIdsByGroupKey.get(split.groupKey)
    const normalizedTitle = split.title.trim()

    if (!allowedPhotoIds || normalizedTitle.length === 0) {
      continue
    }

    for (const photoId of split.photoIds) {
      if (!allowedPhotoIds.has(photoId) || splitByPhotoId.has(photoId)) {
        continue
      }

      splitByPhotoId.set(photoId, {
        splitId: split.splitId,
        title: normalizedTitle
      })
    }
  }

  return copiedPhotos.map((photo) => {
    const split = splitByPhotoId.get(photo.id)

    return split
      ? {
          ...photo,
          manualGroupId: split.splitId,
          manualGroupTitle: split.title
        }
      : photo
  })
}

export function normalizeDefaultGroupTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ')
}

export function applyDefaultTitleManualGrouping(
  photos: Photo[],
  entries: Array<{
    photoId: string
    title: string
  }>
): Photo[] {
  if (photos.length === 0 || entries.length === 0) {
    return photos
  }

  const normalizedToManualId = new Map<string, string>()
  const normalizedToDisplayTitle = new Map<string, string>()

  for (const entry of entries) {
    const normalized = normalizeDefaultGroupTitle(entry.title)

    if (normalized.length === 0) {
      continue
    }

    if (!normalizedToManualId.has(normalized)) {
      normalizedToManualId.set(
        normalized,
        `manual-default-title|${encodeURIComponent(normalized)}`
      )
      normalizedToDisplayTitle.set(normalized, entry.title.trim())
    }
  }

  const photoIdToNormalized = new Map<string, string>()

  for (const entry of entries) {
    const normalized = normalizeDefaultGroupTitle(entry.title)

    if (normalized.length === 0) {
      continue
    }

    photoIdToNormalized.set(entry.photoId, normalized)
  }

  return photos.map((photo) => {
    if (photo.manualGroupId) {
      return photo
    }

    const normalized = photoIdToNormalized.get(photo.id)

    if (!normalized) {
      return photo
    }

    const manualGroupId = normalizedToManualId.get(normalized)
    const manualGroupTitle = normalizedToDisplayTitle.get(normalized)

    if (!manualGroupId || !manualGroupTitle) {
      return photo
    }

    return {
      ...photo,
      manualGroupId,
      manualGroupTitle
    }
  })
}
