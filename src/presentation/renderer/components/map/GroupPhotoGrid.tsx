import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { GroupDetail } from '@shared/types/preload'

export function getGpsBadge(photo: GroupDetail['photos'][number]): string {
  if (photo.originalGps) {
    return '정확 GPS'
  }
  if (photo.gps) {
    return photo.locationSource === 'assigned-from-group' ? '추론 위치' : 'GPS'
  }
  return '위치 없음'
}

interface GroupPhotoGridProps {
  group: GroupDetail
  outputRoot?: string
  compact?: boolean
  selectedPhotoId?: string
  onPhotoClick?: (photoId: string) => void
}

export function GroupPhotoGrid({
  group,
  outputRoot,
  compact = false,
  selectedPhotoId,
  onPhotoClick
}: GroupPhotoGridProps) {
  const photos = compact ? group.photos.slice(0, 8) : group.photos

  return (
    <div
      className={`grid gap-3 ${
        compact
          ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'
          : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
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
          <button
            type="button"
            key={photo.id}
            className={`overflow-hidden rounded-t-xl rounded-b-none border bg-white text-left transition ${
              selectedPhotoId === photo.id
                ? 'border-blue-400 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => onPhotoClick?.(photo.id)}
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
            <div className="px-1.5 py-1">
              <p className="truncate text-[11px] leading-tight font-medium text-slate-900">
                {photo.sourceFileName}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
