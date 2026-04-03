import exifr from 'exifr'

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

export class ExifrPhotoMetadataReader implements PhotoMetadataReaderPort {
  async read(sourcePath: string): Promise<PhotoMetadata> {
    const metadata = await exifr.parse(sourcePath, {
      gps: true,
      tiff: true,
      exif: true
    })

    if (!metadata) {
      return {}
    }

    const capturedAt = metadata.DateTimeOriginal instanceof Date
      ? toPhotoTimestamp(metadata.DateTimeOriginal)
      : metadata.CreateDate instanceof Date
        ? toPhotoTimestamp(metadata.CreateDate)
        : undefined

    const gps =
      typeof metadata.latitude === 'number' &&
      typeof metadata.longitude === 'number'
        ? {
            latitude: metadata.latitude,
            longitude: metadata.longitude
          }
        : undefined

    return {
      capturedAt,
      gps
    }
  }
}
