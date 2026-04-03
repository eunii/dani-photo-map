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
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
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

function formatSequenceNumber(sequenceNumber: number): string {
  return String(sequenceNumber).padStart(3, '0')
}

export function createGroupAwarePhotoFileNamePrefix(
  groupTitle: string,
  timestamp?: PhotoTimestamp
): string {
  const safeTimestamp = getSafeTimestamp(timestamp)
  const titleSegment = sanitizeFileNameSegment(groupTitle) || 'group'

  return `${safeTimestamp.year}-${safeTimestamp.month}-${safeTimestamp.day}_${safeTimestamp.time.slice(0, 4)}_${titleSegment}`
}

export function createGroupAwarePhotoFileName(
  originalFileName: string,
  groupTitle: string,
  sequenceNumber: number,
  timestamp?: PhotoTimestamp
): string {
  const { extension } = splitFileName(originalFileName)
  const prefix = createGroupAwarePhotoFileNamePrefix(groupTitle, timestamp)

  return `${prefix}_${formatSequenceNumber(sequenceNumber)}${extension}`
}

export function buildGroupAwarePhotoOutputRelativePath(
  photo: Pick<Photo, 'capturedAt' | 'regionName' | 'sourceFileName'>,
  groupTitle: string,
  sequenceNumber: number,
  rules: OrganizationRules
): string {
  const safeTimestamp = getSafeTimestamp(photo.capturedAt)
  const regionName = sanitizeFileNameSegment(
    photo.regionName ?? rules.unknownRegionLabel
  )
  const fileName = createGroupAwarePhotoFileName(
    photo.sourceFileName,
    groupTitle,
    sequenceNumber,
    photo.capturedAt
  )

  return [safeTimestamp.year, safeTimestamp.month, regionName, fileName].join('/')
}
