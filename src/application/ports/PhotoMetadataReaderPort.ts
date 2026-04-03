import type { PhotoCapturedAtSource } from '@domain/entities/Photo'
import type { GeoPoint } from '@domain/value-objects/GeoPoint'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

export interface PhotoMetadata {
  capturedAt?: PhotoTimestamp
  capturedAtSource?: PhotoCapturedAtSource
  gps?: GeoPoint
  metadataIssues: string[]
}

export interface PhotoMetadataReaderPort {
  read(sourcePath: string): Promise<PhotoMetadata>
}
