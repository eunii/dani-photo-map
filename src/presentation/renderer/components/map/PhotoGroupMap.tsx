import { PhotoGroupMapOverlays } from './photoGroupMap/PhotoGroupMapOverlays'
import type { PhotoGroupMapProps } from './photoGroupMap/photoGroupMapProps'
import { usePhotoGroupMap } from './photoGroupMap/usePhotoGroupMap'

export type { PhotoGroupMapProps }

export function PhotoGroupMap(props: PhotoGroupMapProps) {
  const { containerRef, mapErrorMessage, sourceGroupCount } =
    usePhotoGroupMap(props)

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <div ref={containerRef} className="h-full w-full" />

      <PhotoGroupMapOverlays
        mapErrorMessage={mapErrorMessage}
        sourceGroupCount={sourceGroupCount}
      />
    </div>
  )
}
