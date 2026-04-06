import type { Photo } from '@domain/entities/Photo'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'
import {
  createOrganizedPhotoFileName,
  resolveGroupLabelForOutputFileName
} from '@domain/services/PhotoNamingService'

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

function getDirectoryTimestamp(
  timestamp?: PhotoTimestamp
): Pick<PhotoTimestamp, 'year' | 'month'> {
  return {
    year: timestamp?.year ?? '0000',
    month: timestamp?.month ?? '00'
  }
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

/**
 * 그룹 이동 후 경로: 스캔 출력과 같이 `년/월/[그룹 라벨]/파일명`.
 * 라벨은 합쳐진 그룹 제목에서 파생하며, 지리적 `regionName`(예: base)만 쓰지 않습니다.
 */
export function buildGroupAwarePhotoOutputRelativePath(
  photo: Pick<
    Photo,
    | 'capturedAt'
    | 'gps'
    | 'regionName'
    | 'sourceFileName'
    | 'missingGpsGroupingBasis'
    | 'missingGpsCategory'
  >,
  groupTitle: string,
  sequenceNumber: number,
  rules: OrganizationRules
): string {
  const groupLabel = resolveGroupLabelForOutputFileName(
    { displayTitle: groupTitle },
    rules
  )
  const timestamp = getDirectoryTimestamp(photo.capturedAt)
  const directory =
    groupLabel === rules.unknownRegionLabel
      ? [timestamp.year, timestamp.month].join('/')
      : [timestamp.year, timestamp.month, groupLabel].join('/')
  const fileName = createGroupAwarePhotoFileName(
    photo.sourceFileName,
    sequenceNumber,
    photo.capturedAt
  )

  return [directory, fileName].join('/')
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
