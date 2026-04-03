import type { GeoPoint } from '@domain/value-objects/GeoPoint'

export interface PhotoGroup {
  id: string
  title: string
  photoIds: string[]
  representativePhotoId?: string
  representativeGps?: GeoPoint
  representativeThumbnailRelativePath?: string
  companions: string[]
  notes?: string
}
