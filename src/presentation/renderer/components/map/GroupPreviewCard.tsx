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
      className={`w-full border text-left transition ${
        selected
          ? compact
            ? 'rounded-t-2xl rounded-b-none border-blue-400 bg-blue-50 shadow-sm'
            : 'rounded-xl border-blue-400 bg-blue-50 shadow-sm'
          : compact
            ? 'rounded-t-2xl rounded-b-none border-slate-200 bg-white hover:border-slate-300'
            : 'rounded-xl border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={() => onClick?.(record.group.id)}
    >
      {compact ? (
        <div className="overflow-hidden rounded-[inherit]">
          <div className="aspect-square rounded-t-[inherit] bg-slate-100 overflow-hidden">
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
          <div className="px-2 py-1.5">
            <p className="truncate text-[11px] font-medium text-slate-900">
              {record.regionLabel}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
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
            <p className="truncate text-sm font-semibold text-slate-900">
              {record.displayTitle}
            </p>
          </div>
        </div>
      )}
    </button>
  )
}
