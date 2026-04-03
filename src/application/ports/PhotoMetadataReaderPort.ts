import type { GeoPoint } from '@domain/value-objects/GeoPoint'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

export interface PhotoMetadata {
  capturedAt?: PhotoTimestamp
  gps?: GeoPoint
}

export interface PhotoMetadataReaderPort {
  read(sourcePath: string): Promise<PhotoMetadata>
}
