import exifr from 'exifr'
import { stat } from 'node:fs/promises'

import type {
  PhotoMetadata,
  PhotoMetadataReaderPort
} from '@application/ports/PhotoMetadataReaderPort'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

function toPhotoTimestamp(value: Date): PhotoTimestamp {
  const iso = value.toISOString()

  return {
    iso,
    year: iso.slice(0, 4),
    month: iso.slice(5, 7),
    day: iso.slice(8, 10),
    time: `${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}`
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

export class ExifrPhotoMetadataReader implements PhotoMetadataReaderPort {
  constructor(
    private readonly parseMetadata: typeof exifr.parse = exifr.parse,
    private readonly readFileStat: typeof stat = stat
  ) {}

  async read(sourcePath: string): Promise<PhotoMetadata> {
    const metadata = await this.parseMetadata(sourcePath, {
      gps: true,
      tiff: true,
      exif: true
    })
    const metadataIssues: string[] = []

    if (!metadata) {
      metadataIssues.push('metadata-empty')
    }

    const dateTimeOriginal =
      metadata?.DateTimeOriginal instanceof Date
        ? metadata.DateTimeOriginal
        : undefined
    const createDate =
      metadata?.CreateDate instanceof Date ? metadata.CreateDate : undefined

    let capturedAt = dateTimeOriginal
      ? toPhotoTimestamp(dateTimeOriginal)
      : createDate
        ? toPhotoTimestamp(createDate)
        : undefined
    let capturedAtSource: PhotoMetadata['capturedAtSource']

    if (dateTimeOriginal) {
      capturedAtSource = 'exif-date-time-original'
    } else if (createDate) {
      capturedAtSource = 'exif-create-date'
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
      isFiniteNumber(metadata?.latitude) &&
      isFiniteNumber(metadata?.longitude) &&
      isValidLatitude(metadata.latitude) &&
      isValidLongitude(metadata.longitude)
        ? {
            latitude: metadata.latitude,
            longitude: metadata.longitude
          }
        : undefined

    if (!gps) {
      if (
        isFiniteNumber(metadata?.latitude) ||
        isFiniteNumber(metadata?.longitude)
      ) {
        metadataIssues.push('gps-invalid')
      } else {
        metadataIssues.push('gps-missing')
      }
    }

    return {
      capturedAt,
      capturedAtSource,
      gps,
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
