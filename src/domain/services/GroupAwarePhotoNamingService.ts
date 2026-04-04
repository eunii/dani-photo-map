import type { Photo } from '@domain/entities/Photo'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'
import { createOrganizedPhotoFileName } from '@domain/services/PhotoNamingService'

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

function resolvePhotoRegionSegment(
  photo: Pick<Photo, 'gps' | 'regionName' | 'missingGpsCategory'>,
  rules: OrganizationRules
): string {
  if (!photo.gps && photo.missingGpsCategory === 'capture') {
    return rules.captureRegionLabel
  }

  return photo.regionName ?? rules.unknownRegionLabel
}

/**
 * 그룹 이동·이름 변경 시 파일명: `YYYY-MM-DD_HHMMSS_원본베이스_시퀀스.확장자` (시퀀스는 최소 001).
 */
export function createGroupAwarePhotoFileName(
  originalFileName: string,
  sequenceNumber: number,
  timestamp?: PhotoTimestamp
): string {
  const suffix = `_${formatSequenceNumber(sequenceNumber)}`

  return createOrganizedPhotoFileName(originalFileName, timestamp, suffix)
}

export function buildGroupAwarePhotoOutputRelativePath(
  photo: Pick<
    Photo,
    | 'capturedAt'
    | 'gps'
    | 'regionName'
    | 'sourceFileName'
    | 'missingGpsCategory'
  >,
  _groupTitle: string,
  sequenceNumber: number,
  rules: OrganizationRules
): string {
  const regionName = sanitizeFileNameSegment(resolvePhotoRegionSegment(photo, rules))
  const safeTimestamp = photo.capturedAt ?? {
    iso: '0000-00-00T00:00:00.000Z',
    year: '0000',
    month: '00',
    day: '00',
    time: '000000'
  }
  const fileName = createGroupAwarePhotoFileName(
    photo.sourceFileName,
    sequenceNumber,
    photo.capturedAt
  )

  return [safeTimestamp.year, safeTimestamp.month, regionName, fileName].join('/')
}

/** `createOrganizedPhotoFileName`과 동일한 stem + `_NNN` 확장 패턴으로 충돌 탐지용. */
export function buildOrganizedNamePatternPrefix(
  sourceFileName: string,
  timestamp?: PhotoTimestamp
): string {
  const fileName = createOrganizedPhotoFileName(sourceFileName, timestamp, '')
  const { extension } = splitFileName(fileName)

  return extension.length > 0 ? fileName.slice(0, -extension.length) : fileName
}
