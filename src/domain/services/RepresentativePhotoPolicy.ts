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

function comparePhotosForRepresentativeSelection(left: Photo, right: Photo): number {
  const leftGpsScore = left.gps ? 1 : 0
  const rightGpsScore = right.gps ? 1 : 0

  if (leftGpsScore !== rightGpsScore) {
    return rightGpsScore - leftGpsScore
  }

  const leftThumbnailScore = left.thumbnailRelativePath ? 1 : 0
  const rightThumbnailScore = right.thumbnailRelativePath ? 1 : 0

  if (leftThumbnailScore !== rightThumbnailScore) {
    return rightThumbnailScore - leftThumbnailScore
  }

  const capturedAtSourceScoreDifference =
    getCapturedAtSourceScore(right) - getCapturedAtSourceScore(left)

  if (capturedAtSourceScoreDifference !== 0) {
    return capturedAtSourceScoreDifference
  }

  const leftIso = left.capturedAt?.iso ?? ''
  const rightIso = right.capturedAt?.iso ?? ''

  if (leftIso !== rightIso) {
    return leftIso.localeCompare(rightIso)
  }

  return left.sourceFileName.localeCompare(right.sourceFileName)
}

export function selectRepresentativePhoto(photos: Photo[]): Photo | undefined {
  return [...photos].sort(comparePhotosForRepresentativeSelection)[0]
}
