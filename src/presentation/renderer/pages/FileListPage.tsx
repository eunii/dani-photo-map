import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { OutputFolderTreePanel } from '@presentation/renderer/components/OutputFolderTreePanel'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import {
  flattenLibraryGroupsToPhotos,
  sortFlatPhotoRows,
  type PhotoListSortOption
} from '@presentation/renderer/view-models/flattenLibraryPhotos'
import {
  buildOutputFolderTree,
  countPhotosInSubtree,
  filterRowsAtPath,
  formatPathSegmentLabel
} from '@presentation/renderer/view-models/outputPathNavigation'

const LIST_CHUNK = 150

function formatCapturedLabel(iso?: string): string {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return d.toLocaleString()
}

export function FileListPage() {
  const {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage,
    selectOutputRoot,
    reloadLibraryIndex
  } = useOutputLibraryIndexPanel()

  const [pathSegments, setPathSegments] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<PhotoListSortOption>('captured-desc')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>()
  const [visibleCount, setVisibleCount] = useState(LIST_CHUNK)

  const sourceBadge = getLoadSourceBadge(loadSource)

  const flatRows = useMemo(
    () => flattenLibraryGroupsToPhotos(libraryIndex?.groups ?? []),
    [libraryIndex?.groups]
  )

  const sortedRows = useMemo(
    () => sortFlatPhotoRows(flatRows, sortOption),
    [flatRows, sortOption]
  )

  const folderTree = useMemo(
    () => buildOutputFolderTree(sortedRows),
    [sortedRows]
  )

  const rowsInFolder = useMemo(
    () => filterRowsAtPath(sortedRows, pathSegments),
    [sortedRows, pathSegments]
  )

  useEffect(() => {
    setPathSegments([])
  }, [libraryIndex?.generatedAt])

  useEffect(() => {
    setVisibleCount(LIST_CHUNK)
  }, [libraryIndex?.generatedAt, sortOption, pathSegments])

  useEffect(() => {
    if (!selectedPhotoId) {
      return
    }
    const exists = rowsInFolder.some((row) => row.photo.id === selectedPhotoId)
    if (!exists) {
      setSelectedPhotoId(undefined)
    }
  }, [rowsInFolder, selectedPhotoId])

  const visibleRows = useMemo(
    () => rowsInFolder.slice(0, visibleCount),
    [rowsInFolder, visibleCount]
  )

  const hasMore = visibleCount < rowsInFolder.length
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(() => {
    setVisibleCount((previous) =>
      Math.min(previous + LIST_CHUNK, rowsInFolder.length)
    )
  }, [rowsInFolder.length])

  useEffect(() => {
    const node = loadMoreSentinelRef.current
    if (!node || !hasMore) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          loadMore()
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadMore, visibleRows.length])

  const selectedRow = useMemo(
    () => rowsInFolder.find((row) => row.photo.id === selectedPhotoId),
    [rowsInFolder, selectedPhotoId]
  )

  const outputRootForUrls = libraryIndex?.outputRoot ?? outputRoot

  const previewThumbUrl = useMemo(() => {
    if (!outputRootForUrls || !selectedRow) {
      return undefined
    }
    return (
      toOutputFileUrl(outputRootForUrls, selectedRow.photo.thumbnailRelativePath) ??
      toOutputFileUrl(outputRootForUrls, selectedRow.photo.outputRelativePath)
    )
  }, [outputRootForUrls, selectedRow])

  const totalCount = sortedRows.length
  const folderCount = rowsInFolder.length
  const subtreeCount = useMemo(
    () => countPhotosInSubtree(sortedRows, pathSegments),
    [sortedRows, pathSegments]
  )

  const breadcrumbPathLabel = useMemo(() => {
    if (pathSegments.length === 0) {
      return '출력'
    }
    return pathSegments.map(formatPathSegmentLabel).join(' / ')
  }, [pathSegments])

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          파일 목록
        </h1>
        <p className="text-base leading-7 text-slate-600">
          출력 경로를 단계마다 선택해 들어가면 폴더별로 나뉘어 한눈에 보기
          쉽습니다. 폴더 안에서 사진을 고르면 미리보기가 표시됩니다.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">출력 폴더</h2>
            <p className="min-h-12 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
              {outputRoot || '아직 선택되지 않았습니다.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void selectOutputRoot()}
            >
              출력 폴더 선택
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!outputRoot || isLoadingIndex}
              onClick={() => void reloadLibraryIndex()}
            >
              {isLoadingIndex ? '불러오는 중...' : '다시 불러오기'}
            </button>
          </div>
        </div>
      </section>

      {sourceBadge ? (
        <section className={`rounded-xl border px-4 py-3 text-sm ${sourceBadge.tone}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold">
              {sourceBadge.label}
            </span>
            <p>{sourceBadge.description}</p>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
            전체 {totalCount}장
          </div>
          {pathSegments.length > 0 ? (
            <div
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700"
              title="가장 안쪽 폴더에 있는 파일까지 모두 더한 수입니다."
            >
              이 경로 합계 {subtreeCount}장
            </div>
          ) : null}
          {pathSegments.length > 0 && folderCount < subtreeCount ? (
            <div
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600"
              title="이 경로 폴더에 직접 들어 있는 파일만. 목록에도 이 기준으로만 나옵니다."
            >
              이 폴더에만 {folderCount}장
            </div>
          ) : null}
          {hasMore ? (
            <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
              목록 표시 {visibleRows.length} / 직접 {folderCount}
            </div>
          ) : null}
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            정렬
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as PhotoListSortOption)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
            >
              <option value="captured-desc">촬영일 최신순</option>
              <option value="filename-asc">파일명 순</option>
            </select>
          </label>
        </div>

        {!outputRoot ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-900">
              출력 폴더를 선택하세요.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              정리된 결과가 있는 폴더를 고르면 파일 목록이 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(260px,360px)] lg:items-start">
            <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <OutputFolderTreePanel
                folderTreeRoot={folderTree}
                selectedPathSegments={pathSegments}
                onSelectPath={setPathSegments}
              />
            </div>

            <div className="space-y-3 min-w-0">
              <nav
                className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                aria-label="출력 경로"
              >
                <button
                  type="button"
                  className="rounded-md px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
                  onClick={() => setPathSegments([])}
                >
                  출력
                </button>
                {pathSegments.map((segment, index) => (
                  <span key={`${segment}-${index}`} className="flex items-center gap-1">
                    <span className="text-slate-400" aria-hidden>
                      /
                    </span>
                    <button
                      type="button"
                      className="max-w-[200px] truncate rounded-md px-2 py-1 font-medium text-sky-700 hover:bg-sky-50"
                      title={formatPathSegmentLabel(segment)}
                      onClick={() => setPathSegments(pathSegments.slice(0, index + 1))}
                    >
                      {formatPathSegmentLabel(segment)}
                    </button>
                  </span>
                ))}
              </nav>
              <p className="text-xs text-slate-500">{breadcrumbPathLabel}</p>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    이 폴더의 사진
                  </h3>
                </div>
                <div className="max-h-[min(55vh,720px)] overflow-y-auto">
                  {folderCount === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      이 경로에 직접 있는 사진이 없습니다. 왼쪽 트리에서 다른
                      폴더를 선택하세요.
                    </p>
                  ) : (
                    <>
                      <ul className="divide-y divide-slate-100">
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
                            <li
                              key={row.photo.id}
                              className="[content-visibility:auto]"
                              style={{ containIntrinsicSize: '56px' }}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedPhotoId(row.photo.id)}
                                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-sky-50 ring-1 ring-inset ring-sky-200'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                                      —
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-900">
                                    {row.photo.sourceFileName}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    {formatCapturedLabel(row.photo.capturedAtIso)} ·{' '}
                                    {row.groupDisplayTitle}
                                  </p>
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                      {hasMore ? (
                        <div
                          ref={loadMoreSentinelRef}
                          className="h-8 shrink-0"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">미리보기</h2>
              {!selectedRow ? (
                <p className="mt-4 text-sm text-slate-600">
                  목록에서 사진을 선택하면 썸네일 미리보기가 표시됩니다.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {previewThumbUrl ? (
                      <img
                        src={previewThumbUrl}
                        alt={selectedRow.photo.sourceFileName}
                        loading="lazy"
                        decoding="async"
                        className="max-h-[min(50vh,480px)] w-full object-contain"
                      />
                    ) : (
                      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
                        미리보기를 불러올 수 없습니다.
                      </div>
                    )}
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">파일명</dt>
                      <dd className="break-all font-medium text-slate-900">
                        {selectedRow.photo.sourceFileName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">촬영 시각</dt>
                      <dd className="text-slate-800">
                        {formatCapturedLabel(selectedRow.photo.capturedAtIso)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">그룹</dt>
                      <dd className="text-slate-800">{selectedRow.groupDisplayTitle}</dd>
                    </div>
                    {selectedRow.photo.outputRelativePath ? (
                      <div>
                        <dt className="text-xs text-slate-500">출력 상대 경로</dt>
                        <dd className="break-all font-mono text-xs text-slate-700">
                          {selectedRow.photo.outputRelativePath}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {isLoadingIndex ? (
          <p className="text-sm text-slate-500">출력 결과를 불러오는 중입니다…</p>
        ) : null}
      </section>
    </div>
  )
}
