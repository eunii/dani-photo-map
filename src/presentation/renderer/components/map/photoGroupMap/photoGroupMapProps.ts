import type {
  MapGroupRecord,
  MapPhotoPinRecord,
  MapViewportBounds
} from '@presentation/renderer/view-models/map/mapPageSelectors'

export interface PhotoGroupMapProps {
  sourceGroups: MapGroupRecord[]
  markerGroups: MapGroupRecord[]
  selectedPhotoPins: MapPhotoPinRecord[]
  focusedPhotoPin?: MapPhotoPinRecord
  outputRoot?: string
  selectedGroupId?: string
  selectedPhotoId?: string
  zoomLevel: number
  unclusteredMinZoom: number
  photoMarkerMinZoom: number
  focusedPhotoContextMinZoom: number
  onSelectGroup: (groupId: string) => void
  onSelectPhoto: (photoId: string) => void
  onViewportChange: (state: {
    bounds: MapViewportBounds
    zoomLevel: number
  }) => void
}
