import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { GroupPhotoSummary } from '@shared/types/preload'

export function getGpsBadge(photo: GroupPhotoSummary): string {
  if (photo.originalGps) {
    return '정확 GPS'
  }
  if (photo.gps) {
    return photo.locationSource === 'assigned-from-group' ? '추론 위치' : 'GPS'
  }
  return '위치 없음'
}

interface GroupPhotoGridProps {
  photos: GroupPhotoSummary[]
  outputRoot?: string
  compact?: boolean
  selectedPhotoId?: string
  onPhotoClick?: (photoId: string) => void
}

export function GroupPhotoGrid({
  photos,
  outputRoot,
  compact = false,
  selectedPhotoId,
  onPhotoClick
}: GroupPhotoGridProps) {
  const visiblePhotos = compact ? photos.slice(0, 8) : photos

  return (
    <div
      className={`grid gap-2 ${
        compact
          ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'
          : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      }`}
    >
      {visiblePhotos.map((photo) => {
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
            className={`overflow-hidden rounded-t-[14px] rounded-b-none text-left transition ${
              selectedPhotoId === photo.id
                ? 'bg-[var(--app-sidebar-hover)] ring-1 ring-[var(--app-accent)]'
                : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]'
            }`}
            onClick={() => onPhotoClick?.(photo.id)}
          >
            <div className="aspect-square bg-[var(--app-surface-strong)]">
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
              <p className="truncate text-[11px] leading-tight font-medium text-[var(--app-foreground)]">
                {photo.sourceFileName}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
