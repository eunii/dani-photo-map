import type { Photo } from '@domain/entities/Photo'

function getCapturedAtSourceScore(photo: Photo): number {
  switch (photo.capturedAtSource) {
    case 'exif-date-time-original':
      return 3
    case 'exif-create-date':
      return 2
    case 'file-modified-at':
      return 1
    default:
      return 0
  }
}

function comparePhotosForCanonicalSelection(left: Photo, right: Photo): number {
  const leftCapturedAt = left.capturedAt?.iso ?? ''
  const rightCapturedAt = right.capturedAt?.iso ?? ''

  if (leftCapturedAt && rightCapturedAt && leftCapturedAt !== rightCapturedAt) {
    return leftCapturedAt.localeCompare(rightCapturedAt)
  }

  if (leftCapturedAt !== rightCapturedAt) {
    return rightCapturedAt ? 1 : -1
  }

  const capturedAtSourceScoreDifference =
    getCapturedAtSourceScore(right) - getCapturedAtSourceScore(left)

  if (capturedAtSourceScoreDifference !== 0) {
    return capturedAtSourceScoreDifference
  }

  return left.sourcePath.localeCompare(right.sourcePath)
}

export function selectCanonicalDuplicatePhoto(
  photos: Photo[]
): Photo | undefined {
  return [...photos].sort(comparePhotosForCanonicalSelection)[0]
}
