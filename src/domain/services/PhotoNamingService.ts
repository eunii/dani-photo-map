import type { Photo } from '@domain/entities/Photo'
import {
  defaultOrganizationRules,
  type OrganizationRules
} from '@domain/policies/OrganizationRules'
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

/** 그룹 표시 제목을 파일명 세그먼트로 (공백→`_`, 금지 문자 치환). */
export function sanitizeGroupDisplayTitleForFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
}

/**
 * 자동 그룹 `displayTitle` 앞의 `YYYY-MM` 또는 `YYYY-MM-DD` + 공백을 제거합니다.
 * (파일명 접두 날짜와 중복되지 않도록 그룹 절에는 날짜를 넣지 않기 위함)
 */
export function stripLeadingDateFromAutoGroupDisplayTitle(displayTitle: string): string {
  return displayTitle.replace(/^\d{4}-\d{2}(-\d{2})?\s+/, '').trim()
}

/**
 * 출력 파일명의 그룹 문자열: 사용자 제목 우선, 없으면 자동 제목에서 날짜 제거, 비면 지역명.
 * `overrideTitle`이 `''`처럼 **명시적으로 비어 있으면** `year/month`만 두기 위해 `unknownRegionLabel`과 동일하게 취급합니다.
 */
export function resolveGroupLabelForOutputFileName(
  params: {
    displayTitle: string
    /** `undefined`면 미입력; 문자열이면 해당 그룹에 대해 사용자가 제목을 보냄(빈 문자열 포함). */
    overrideTitle?: string
    regionName?: string
  },
  rules: OrganizationRules = defaultOrganizationRules
): string {
  if (params.overrideTitle !== undefined) {
    const trimmedOverride = params.overrideTitle.trim()

    if (trimmedOverride.length === 0) {
      return rules.unknownRegionLabel
    }

    const s = sanitizeGroupDisplayTitleForFileName(trimmedOverride)

    return s.length > 0 ? s : 'group'
  }

  const stripped = stripLeadingDateFromAutoGroupDisplayTitle(params.displayTitle)

  if (stripped.length > 0) {
    const s = sanitizeGroupDisplayTitleForFileName(stripped)

    return s.length > 0 ? s : 'group'
  }

  const region = params.regionName?.trim()

  if (region) {
    const s = sanitizeGroupDisplayTitleForFileName(region)

    return s.length > 0 ? s : 'group'
  }

  return 'group'
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

function resolvePhotoRegionSegment(
  photo: Pick<Photo, 'gps' | 'regionName' | 'missingGpsCategory'>,
  rules: OrganizationRules
): string {
  if (!photo.gps && photo.missingGpsCategory === 'capture') {
    return rules.captureRegionLabel
  }

  return photo.regionName ?? rules.unknownRegionLabel
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
  photo: Pick<
    Photo,
    | 'capturedAt'
    | 'gps'
    | 'regionName'
    | 'sourceFileName'
    | 'missingGpsCategory'
  >,
  rules: OrganizationRules
): string {
  const safeTimestamp = getSafeTimestamp(photo.capturedAt)
  const regionName = sanitizeFileNameSegment(resolvePhotoRegionSegment(photo, rules))
  const fileName = createOrganizedPhotoFileName(
    photo.sourceFileName,
    photo.capturedAt
  )

  return [safeTimestamp.year, safeTimestamp.month, regionName, fileName].join('/')
}

/** `year/month/region` (파일명 제외). 지리적 region 기준 (레거시·비스캔 경로). */
export function buildPhotoOutputDirectoryRelativePath(
  photo: Pick<
    Photo,
    'capturedAt' | 'gps' | 'regionName' | 'missingGpsCategory'
  >,
  rules: OrganizationRules
): string {
  const safeTimestamp = getSafeTimestamp(photo.capturedAt)
  const regionName = sanitizeFileNameSegment(resolvePhotoRegionSegment(photo, rules))

  return [safeTimestamp.year, safeTimestamp.month, regionName].join('/')
}

/**
 * 스캔 출력: 디렉터리는 `resolveGroupLabelForOutputFileName`과 동일한 그룹 라벨.
 * 라벨이 `unknownRegionLabel`(base)이면 `year/month`만 (중간 폴더 생략).
 */
export function buildScanOutputDirectoryRelativePath(
  photo: Pick<Photo, 'capturedAt'>,
  groupFileLabel: string,
  rules: OrganizationRules
): string {
  const safeTimestamp = getSafeTimestamp(photo.capturedAt)
  const segment = sanitizeGroupDisplayTitleForFileName(groupFileLabel)

  if (segment === rules.unknownRegionLabel) {
    return [safeTimestamp.year, safeTimestamp.month].join('/')
  }

  return [safeTimestamp.year, safeTimestamp.month, segment].join('/')
}

/**
 * 스캔 복사 최종 상대 경로: 그룹 라벨 폴더 + base 시 `year/month/파일명`.
 */
export function buildScanPhotoOutputRelativePath(
  photo: Pick<Photo, 'capturedAt' | 'sourceFileName'>,
  groupFileLabel: string,
  rules: OrganizationRules,
  nameCollisionSuffix: string
): string {
  const directory = buildScanOutputDirectoryRelativePath(photo, groupFileLabel, rules)
  const fileName = buildGroupDisplayTitledPhotoFileName(
    groupFileLabel,
    photo.capturedAt,
    photo.sourceFileName,
    nameCollisionSuffix
  )

  return [directory, fileName].join('/')
}

/**
 * 그룹 표시명 + 촬영 시각 + 원본 확장자 기준 파일명.
 * `nameCollisionSuffix`: 동일 디렉터리 내 충돌 시 `''`, `'_001'`, `'_002'` …
 */
export function buildGroupDisplayTitledPhotoFileName(
  groupDisplayTitle: string,
  capturedAt: PhotoTimestamp | undefined,
  sourceFileName: string,
  nameCollisionSuffix: string
): string {
  const safeTimestamp = getSafeTimestamp(capturedAt)
  const { extension } = splitFileName(sourceFileName)
  const titlePart = sanitizeGroupDisplayTitleForFileName(groupDisplayTitle) || 'group'
  const datePrefix =
    `${safeTimestamp.year}-${safeTimestamp.month}-${safeTimestamp.day}` +
    `_${safeTimestamp.time}`

  return `${datePrefix}_${titlePart}${nameCollisionSuffix}${extension}`
}

