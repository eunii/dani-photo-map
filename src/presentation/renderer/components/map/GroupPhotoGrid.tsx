import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { GroupDetail } from '@shared/types/preload'

function getGpsBadge(photo: GroupDetail['photos'][number]): string {
  if (photo.originalGps) {
    return 'Exact GPS'
  }

  if (photo.gps && photo.locationSource === 'assigned-from-group') {
    return 'Inferred GPS'
  }

  if (photo.gps) {
    return 'GPS'
  }

  return 'No GPS'
}

interface GroupPhotoGridProps {
  group: GroupDetail
  outputRoot?: string
  compact?: boolean
}

export function GroupPhotoGrid({
  group,
  outputRoot,
  compact = false
}: GroupPhotoGridProps) {
  const photos = compact ? group.photos.slice(0, 8) : group.photos

  return (
    <div
      className={`grid gap-3 ${
        compact
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      }`}
    >
      {photos.map((photo) => {
        const thumbnailUrl =
          outputRoot &&
          toOutputFileUrl(
            outputRoot,
            photo.thumbnailRelativePath ?? photo.outputRelativePath
          )

        return (
          <article
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <div className="aspect-square bg-slate-100">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={photo.sourceFileName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  이미지 없음
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-medium text-slate-900">
                {photo.sourceFileName}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                  {getGpsBadge(photo)}
                </span>
                {photo.regionName ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    {photo.regionName}
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
