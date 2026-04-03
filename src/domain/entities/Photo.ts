import type { GeoPoint } from '@domain/value-objects/GeoPoint'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

export interface Photo {
  id: string
  sourcePath: string
  sourceFileName: string
  sha256?: string
  capturedAt?: PhotoTimestamp
  gps?: GeoPoint
  regionName?: string
  outputRelativePath?: string
  thumbnailRelativePath?: string
  isDuplicate: boolean
  metadataIssues: string[]
}
