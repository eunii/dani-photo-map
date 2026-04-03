import type { GeoPoint } from '@domain/value-objects/GeoPoint'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

export const photoCapturedAtSources = [
  'exif-date-time-original',
  'exif-create-date',
  'file-modified-at'
] as const

export type PhotoCapturedAtSource = typeof photoCapturedAtSources[number]

export interface Photo {
  id: string
  sourcePath: string
  sourceFileName: string
  sha256?: string
  duplicateOfPhotoId?: string
  capturedAt?: PhotoTimestamp
  capturedAtSource?: PhotoCapturedAtSource
  gps?: GeoPoint
  regionName?: string
  outputRelativePath?: string
  thumbnailRelativePath?: string
  isDuplicate: boolean
  metadataIssues: string[]
}
