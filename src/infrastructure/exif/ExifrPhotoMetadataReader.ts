import exifr from 'exifr'
import { stat } from 'node:fs/promises'

import type {
  PhotoMetadata,
  PhotoMetadataReaderPort
} from '@application/ports/PhotoMetadataReaderPort'
import type { PhotoCapturedAtSource } from '@domain/entities/Photo'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

/**
 * `iso`는 순간(UTC) 정렬용, `year`~`time`은 동일 Date의 **로컬 월력** (폴더·파일명 접두용).
 */
function toPhotoTimestamp(value: Date): PhotoTimestamp {
  const iso = value.toISOString()
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const pad4 = (n: number) => String(n).padStart(4, '0')

  return {
    iso,
    year: pad4(value.getFullYear()),
    month: pad2(value.getMonth() + 1),
    day: pad2(value.getDate()),
    time: `${pad2(value.getHours())}${pad2(value.getMinutes())}${pad2(value.getSeconds())}`
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidLatitude(latitude: number): boolean {
  return latitude >= -90 && latitude <= 90
}

function isValidLongitude(longitude: number): boolean {
  return longitude >= -180 && longitude <= 180
}

function normalizePathForClassification(sourcePath: string): string {
  return sourcePath.replace(/\\/g, '/').toLowerCase()
}

function isLikelyCapturePath(sourcePath: string): boolean {
  const normalizedPath = normalizePathForClassification(sourcePath)

  return [
    'screenshot',
    'screen_shot',
    'screen-shot',
    'screen capture',
    'screen_capture',
    'screen-capture',
    'screenshots',
    '스크린샷',
    '캡처'
  ].some((keyword) => normalizedPath.includes(keyword))
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

/**
 * XMP/Photoshop/IPTC 등 병합된 메타에서 촬영일 후보를 찾습니다.
 * mergeOutput: true일 때 네임스페이스별 객체가 루트에 붙습니다.
 */
function pickDateFromEmbeddedSidecar(metadata: Record<string, unknown>): Date | undefined {
  const photoshop = metadata.photoshop as { DateCreated?: unknown } | undefined

  if (photoshop && isValidDate(photoshop.DateCreated)) {
    return photoshop.DateCreated
  }

  const xmp = metadata.xmp as { CreateDate?: unknown; ModifyDate?: unknown } | undefined

  if (xmp) {
    if (isValidDate(xmp.CreateDate)) {
      return xmp.CreateDate
    }

    if (isValidDate(xmp.ModifyDate)) {
      return xmp.ModifyDate
    }
  }

  const iptc = metadata.iptc as { DateCreated?: unknown } | undefined

  if (iptc && isValidDate(iptc.DateCreated)) {
    return iptc.DateCreated
  }

  return undefined
}

function hasPrimaryCapturedAt(metadata: Record<string, unknown> | null | undefined): boolean {
  return (
    isValidDate(metadata?.DateTimeOriginal) ||
    isValidDate(metadata?.CreateDate) ||
    isValidDate(metadata?.ModifyDate)
  )
}

export class ExifrPhotoMetadataReader implements PhotoMetadataReaderPort {
  constructor(
    private readonly parseMetadata: typeof exifr.parse = exifr.parse,
    private readonly readFileStat: typeof stat = stat
  ) {}

  async read(sourcePath: string): Promise<PhotoMetadata> {
    const primaryMetadata = (await this.parseMetadata(sourcePath, {
      gps: true,
      tiff: true,
      exif: true,
      xmp: false,
      iptc: false
    })) as Record<string, unknown> | null | undefined
    const embeddedDateMetadata =
      primaryMetadata && hasPrimaryCapturedAt(primaryMetadata)
        ? undefined
        : ((await this.parseMetadata(sourcePath, {
            gps: false,
            tiff: false,
            exif: false,
            xmp: true,
            iptc: true
          })) as Record<string, unknown> | null | undefined)
    const metadata = embeddedDateMetadata
      ? {
          ...(primaryMetadata ?? {}),
          ...embeddedDateMetadata
        }
      : primaryMetadata
    const metadataIssues: string[] = []

    if (!metadata) {
      metadataIssues.push('metadata-empty')
    }

    const dateTimeOriginal = isValidDate(metadata?.DateTimeOriginal)
      ? metadata.DateTimeOriginal
      : undefined
    const exifDigitizedOrCreate = isValidDate(metadata?.CreateDate)
      ? metadata.CreateDate
      : undefined
    const xmpOrIptcDate = metadata ? pickDateFromEmbeddedSidecar(metadata) : undefined
    const modifyDate = isValidDate(metadata?.ModifyDate) ? metadata.ModifyDate : undefined

    let capturedAt: PhotoTimestamp | undefined
    let capturedAtSource: PhotoCapturedAtSource | undefined

    if (dateTimeOriginal) {
      capturedAt = toPhotoTimestamp(dateTimeOriginal)
      capturedAtSource = 'exif-date-time-original'
    } else if (exifDigitizedOrCreate) {
      capturedAt = toPhotoTimestamp(exifDigitizedOrCreate)
      capturedAtSource = 'exif-date-time-digitized'
    } else if (xmpOrIptcDate) {
      capturedAt = toPhotoTimestamp(xmpOrIptcDate)
      capturedAtSource = 'xmp-capture-date'
    } else if (modifyDate) {
      capturedAt = toPhotoTimestamp(modifyDate)
      capturedAtSource = 'exif-modify-date'
    } else {
      const fileModifiedAt = await this.readFileModifiedTimestamp(sourcePath)

      if (fileModifiedAt) {
        capturedAt = fileModifiedAt
        capturedAtSource = 'file-modified-at'
        metadataIssues.push('captured-at-fallback-file-modified-at')
      } else {
        metadataIssues.push('captured-at-missing')
      }
    }

    const gps =
      metadata &&
      isFiniteNumber(metadata.latitude) &&
      isFiniteNumber(metadata.longitude) &&
      isValidLatitude(metadata.latitude) &&
      isValidLongitude(metadata.longitude)
        ? {
            latitude: metadata.latitude as number,
            longitude: metadata.longitude as number
          }
        : undefined
    const missingGpsCategory = !gps
      ? isLikelyCapturePath(sourcePath)
        ? 'capture'
        : capturedAtSource === 'file-modified-at' ||
            capturedAtSource === 'exif-modify-date'
          ? 'missing-imported-gps'
          : 'missing-original-gps'
      : undefined

    if (!gps) {
      if (
        metadata &&
        (isFiniteNumber(metadata.latitude) || isFiniteNumber(metadata.longitude))
      ) {
        metadataIssues.push('gps-invalid')
      } else {
        metadataIssues.push('gps-missing')
      }
    }

    return {
      capturedAt,
      capturedAtSource,
      originalGps: gps,
      gps,
      missingGpsCategory,
      metadataIssues
    }
  }

  private async readFileModifiedTimestamp(
    sourcePath: string
  ): Promise<PhotoTimestamp | undefined> {
    try {
      const fileStat = await this.readFileStat(sourcePath)

      return fileStat.mtime instanceof Date ? toPhotoTimestamp(fileStat.mtime) : undefined
    } catch {
      return undefined
    }
  }
}
