import type {
  MapGroupRecord,
  MapPhotoPinRecord
} from '@presentation/renderer/view-models/map/mapPageSelectors'

export interface GroupFeatureProperties {
  groupId: string
  title: string
  photoCount: number
  score: number
  regionLabel: string
}

export interface PointGeometry {
  type: 'Point'
  coordinates: [number, number]
}

export interface GroupFeature {
  type: 'Feature'
  geometry: PointGeometry
  properties: GroupFeatureProperties
}

export interface GroupFeatureCollection {
  type: 'FeatureCollection'
  features: GroupFeature[]
}

export interface PhotoFeatureProperties {
  photoId: string
  sourceFileName: string
  isRepresentative: boolean
  gpsSource: 'original-gps' | 'gps'
}

export interface PhotoFeature {
  type: 'Feature'
  geometry: PointGeometry
  properties: PhotoFeatureProperties
}

export interface PhotoFeatureCollection {
  type: 'FeatureCollection'
  features: PhotoFeature[]
}

export function buildFeatureCollection(
  groups: MapGroupRecord[]
): GroupFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: groups
      .filter((group) => group.pinLocation)
      .map(
        (group): GroupFeature => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              group.pinLocation!.longitude,
              group.pinLocation!.latitude
            ]
          },
          properties: {
            groupId: group.group.id,
            title: group.displayTitle,
            photoCount: group.group.photoCount,
            score: group.score,
            regionLabel: group.regionLabel
          }
        })
      )
  }
}

export function buildPhotoFeatureCollection(
  photos: MapPhotoPinRecord[]
): PhotoFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: photos.map(
      (photo): PhotoFeature => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [photo.longitude, photo.latitude]
        },
        properties: {
          photoId: photo.photoId,
          sourceFileName: photo.sourceFileName,
          isRepresentative: photo.isRepresentative,
          gpsSource: photo.gpsSource
        }
      })
    )
  }
}
