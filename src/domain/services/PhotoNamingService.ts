import type { Photo } from '@domain/entities/Photo'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

function getSafeTimestamp(timestamp?: PhotoTimestamp): PhotoTimestamp {
  if (timestamp) {
    return timestamp
  }

  return {
    iso: '0000-00-00T00:00:00.000Z',
    year: '0000',
    month: '00',
    day: '00',
    time: '000000'
  }
}

function sanitizeFileNameSegment(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
}

function splitFileName(originalFileName: string): {
  baseName: string
  extension: string
} {
  const lastDotIndex = originalFileName.lastIndexOf('.')

  if (lastDotIndex <= 0) {
    return {
      baseName: originalFileName,
      extension: ''
    }
  }

  return {
    baseName: originalFileName.slice(0, lastDotIndex),
    extension: originalFileName.slice(lastDotIndex)
  }
}

export function createOrganizedPhotoFileName(
  originalFileName: string,
  timestamp?: PhotoTimestamp
): string {
  const safeTimestamp = getSafeTimestamp(timestamp)
  const { baseName, extension } = splitFileName(originalFileName)

  const datePrefix =
    `${safeTimestamp.year}-${safeTimestamp.month}-${safeTimestamp.day}` +
    `_${safeTimestamp.time}`

  return `${datePrefix}_${sanitizeFileNameSegment(baseName)}${extension}`
}

export function buildPhotoOutputRelativePath(
  photo: Pick<Photo, 'capturedAt' | 'regionName' | 'sourceFileName'>,
  rules: OrganizationRules
): string {
  const safeTimestamp = getSafeTimestamp(photo.capturedAt)
  const regionName = sanitizeFileNameSegment(
    photo.regionName ?? rules.unknownRegionLabel
  )
  const fileName = createOrganizedPhotoFileName(
    photo.sourceFileName,
    photo.capturedAt
  )

  return [safeTimestamp.year, safeTimestamp.month, regionName, fileName].join('/')
}
