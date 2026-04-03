import type { GeoPoint } from '@domain/value-objects/GeoPoint'
import type { PhotoTimestamp } from '@domain/value-objects/PhotoTimestamp'

export const photoCapturedAtSources = [
  'exif-date-time-original',
  'exif-create-date',
  'file-modified-at'
] as const

export type PhotoCapturedAtSource = typeof photoCapturedAtSources[number]

export const missingGpsCategories = [
  'capture',
  'missing-original-gps',
  'missing-imported-gps'
] as const

export type MissingGpsCategory = typeof missingGpsCategories[number]

export const photoLocationSources = ['exif', 'assigned-from-group', 'none'] as const

export type PhotoLocationSource = typeof photoLocationSources[number]

export interface Photo {
  id: string
  sourcePath: string
  sourceFileName: string
  sha256?: string
  duplicateOfPhotoId?: string
  capturedAt?: PhotoTimestamp
  capturedAtSource?: PhotoCapturedAtSource
  originalGps?: GeoPoint
  gps?: GeoPoint
  locationSource?: PhotoLocationSource
  missingGpsCategory?: MissingGpsCategory
  manualGroupId?: string
  manualGroupTitle?: string
  regionName?: string
  outputRelativePath?: string
  thumbnailRelativePath?: string
  isDuplicate: boolean
  metadataIssues: string[]
}
