import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { MapGroupRecord } from '@presentation/renderer/view-models/map/mapPageSelectors'

interface GroupPreviewCardProps {
  record: MapGroupRecord
  outputRoot?: string
  selected?: boolean
  onClick?: (groupId: string) => void
}

export function GroupPreviewCard({
  record,
  outputRoot,
  selected = false,
  onClick
}: GroupPreviewCardProps) {
  const thumbnailUrl = outputRoot
    ? toOutputFileUrl(
        outputRoot,
        record.group.representativeThumbnailRelativePath ??
          record.group.photos[0]?.thumbnailRelativePath ??
          record.group.photos[0]?.outputRelativePath
      )
    : undefined

  return (
    <button
      type="button"
      className={`w-full rounded-2xl border p-3 text-left transition ${
        selected
          ? 'border-blue-400 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onClick={() => onClick?.(record.group.id)}
    >
      <div className="flex gap-3">
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

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="truncate text-sm font-semibold text-slate-900">
                {record.displayTitle}
              </p>
              <p className="text-xs text-slate-500">{record.dateLabel}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {record.group.photoCount}장
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-2 py-1">
              지역 {record.regionLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1">
              정확 GPS {record.gpsBreakdown.exactGpsCount}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1">
              추론 {record.gpsBreakdown.inferredGpsCount}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1">
              누락 {record.gpsBreakdown.missingGpsCount}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
