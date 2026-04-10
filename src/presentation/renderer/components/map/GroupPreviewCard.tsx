import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { MapGroupRecord } from '@presentation/renderer/view-models/map/mapPageSelectors'

interface GroupPreviewCardProps {
  record: MapGroupRecord
  outputRoot?: string
  selected?: boolean
  onClick?: (groupId: string) => void
  compact?: boolean
}

export function GroupPreviewCard({
  record,
  outputRoot,
  selected = false,
  onClick,
  compact = false
}: GroupPreviewCardProps) {
  const thumbnailUrl = outputRoot
    ? toOutputFileUrl(
        outputRoot,
        record.group.representativeThumbnailRelativePath ??
          record.group.representativeOutputRelativePath
      )
    : undefined

  return (
    <button
      type="button"
      className={`w-full text-left transition ${
        selected
          ? compact
            ? 'rounded-t-[16px] rounded-b-none bg-[var(--app-sidebar-hover)] ring-1 ring-[var(--app-accent)]'
            : 'rounded-[14px] bg-[var(--app-sidebar-hover)] ring-1 ring-[var(--app-accent)]'
          : compact
            ? 'rounded-t-[16px] rounded-b-none bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]'
            : 'rounded-[14px] bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]'
      }`}
      onClick={() => onClick?.(record.group.id)}
    >
      {compact ? (
        <div className="overflow-hidden rounded-[inherit]">
          <div className="aspect-square overflow-hidden rounded-t-[inherit] bg-[var(--app-surface-strong)]">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={record.displayTitle}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                썸네일 없음
              </div>
            )}
          </div>
          <div className="px-2 py-1">
            <p className="truncate text-[11px] font-medium text-[var(--app-foreground)]">
              {record.regionLabel}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-2.5">
          <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[12px] bg-[var(--app-surface-strong)]">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={record.displayTitle}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                썸네일 없음
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--app-foreground)]">
              {record.displayTitle}
            </p>
          </div>
        </div>
      )}
    </button>
  )
}
