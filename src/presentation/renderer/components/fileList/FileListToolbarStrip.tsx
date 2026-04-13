import type { PhotoListSortOption } from '@presentation/renderer/view-models/flattenLibraryPhotos'

export interface FileListToolbarStripProps {
  totalCount: number
  pathSegmentCount: number
  subtreeCount: number
  folderCount: number
  hasMore: boolean
  visibleRowsLength: number
  sortOption: PhotoListSortOption
  onSortChange: (option: PhotoListSortOption) => void
}

export function FileListToolbarStrip({
  totalCount,
  pathSegmentCount,
  subtreeCount,
  folderCount,
  hasMore,
  visibleRowsLength,
  sortOption,
  onSortChange
}: FileListToolbarStripProps) {
  return (
    <div className="shrink-0 rounded-xl bg-[var(--app-surface-strong)] px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full bg-[var(--app-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-foreground)]">
          전체 {totalCount}장
        </div>
        {pathSegmentCount > 0 ? (
          <div
            className="rounded-full bg-[var(--app-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-foreground)]"
            title="가장 안쪽 폴더에 있는 파일까지 모두 더한 수입니다."
          >
            이 경로 합계 {subtreeCount}장
          </div>
        ) : null}
        {pathSegmentCount > 0 && folderCount < subtreeCount ? (
          <div
            className="rounded-full bg-[var(--app-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-muted)]"
            title="이 경로 폴더에 직접 들어 있는 파일만. 목록에도 이 기준으로만 나옵니다."
          >
            이 폴더에만 {folderCount}장
          </div>
        ) : null}
        {hasMore ? (
          <div className="rounded-full bg-[var(--app-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-muted)]">
            목록 표시 {visibleRowsLength} / 직접 {folderCount}
          </div>
        ) : null}
        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
          정렬
          <select
            value={sortOption}
            onChange={(event) =>
              onSortChange(event.target.value as PhotoListSortOption)
            }
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-[11px] text-[var(--app-foreground)]"
          >
            <option value="captured-desc">촬영일 최신순</option>
            <option value="filename-asc">파일명 순</option>
          </select>
        </label>
      </div>
    </div>
  )
}
