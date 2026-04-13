import type { RefObject } from 'react'

import { formatCapturedLabel } from '@presentation/renderer/pages/fileList/fileListPageFormat'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'
import type { GroupSummary } from '@shared/types/preload'

interface FileListPhotoGridProps {
  groupAtPath: GroupSummary | undefined
  pathSegments: string[]
  isLoadingGroupDetail: boolean
  folderCount: number
  visibleRows: FlatPhotoRow[]
  outputRootForUrls: string | undefined
  selectedPhotoId: string | undefined
  onSelectPhoto: (photoId: string) => void
  selectedForMove: Set<string>
  onToggleMoveSelection: (photoId: string) => void
  hasMore: boolean
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>
}

export function FileListPhotoGrid({
  groupAtPath,
  pathSegments,
  isLoadingGroupDetail,
  folderCount,
  visibleRows,
  outputRootForUrls,
  selectedPhotoId,
  onSelectPhoto,
  selectedForMove,
  onToggleMoveSelection,
  hasMore,
  loadMoreSentinelRef
}: FileListPhotoGridProps) {
  return (
    <div className="app-scroll min-h-0 flex-1">
      {!groupAtPath && pathSegments.length > 0 ? (
        <p className="px-3 py-6 text-center text-xs text-slate-500">
          년·월·그룹(지역) 폴더까지 들어가면 그 안의 사진 목록을 불러옵니다.
        </p>
      ) : groupAtPath && isLoadingGroupDetail ? (
        <p className="px-3 py-6 text-center text-xs text-slate-500">
          이 그룹의 사진을 불러오는 중입니다…
        </p>
      ) : folderCount === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-slate-500">
          {groupAtPath
            ? '이 그룹에 표시할 사진이 없습니다.'
            : '왼쪽 트리에서 폴더를 선택하세요.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visibleRows.map((row) => {
              const isSelected = row.photo.id === selectedPhotoId
              const thumb =
                outputRootForUrls &&
                (toOutputFileUrl(
                  outputRootForUrls,
                  row.photo.thumbnailRelativePath
                ) ??
                  toOutputFileUrl(
                    outputRootForUrls,
                    row.photo.outputRelativePath
                  ))

              return (
                <div
                  key={row.photo.id}
                  className={`[content-visibility:auto] flex min-w-0 flex-col overflow-hidden rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--app-sidebar-hover)] ring-1 ring-[var(--app-accent)]'
                      : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-strong)]'
                  }`}
                  style={{ containIntrinsicSize: '160px 188px' }}
                >
                  <div className="relative aspect-square w-full bg-[var(--app-surface-strong)]">
                    <label className="absolute left-1 top-1 z-10 flex cursor-pointer items-center rounded bg-white/88 p-0.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300"
                        checked={selectedForMove.has(row.photo.id)}
                        onChange={() => onToggleMoveSelection(row.photo.id)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <span className="sr-only">이동·삭제 대상에 포함</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onSelectPhoto(row.photo.id)}
                      className="absolute inset-0 block h-full w-full"
                      aria-label={`${row.photo.sourceFileName} 미리보기 선택`}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          —
                        </div>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPhoto(row.photo.id)}
                    className="w-full min-w-0 flex-1 px-1.5 py-0.5 text-left"
                  >
                    <p className="truncate text-[10px] font-medium leading-tight text-[var(--app-foreground)]">
                      {row.photo.sourceFileName}
                    </p>
                    <p
                      className="mt-px truncate text-[9px] leading-tight text-[var(--app-muted)]"
                      title={`${formatCapturedLabel(row.photo.capturedAtIso)} · ${row.groupDisplayTitle}`}
                    >
                      {formatCapturedLabel(row.photo.capturedAtIso)} ·{' '}
                      {row.groupDisplayTitle}
                    </p>
                  </button>
                </div>
              )
            })}
          </div>
          {hasMore ? (
            <div
              ref={loadMoreSentinelRef}
              className="h-6 shrink-0"
              aria-hidden
            />
          ) : null}
        </>
      )}
    </div>
  )
}
