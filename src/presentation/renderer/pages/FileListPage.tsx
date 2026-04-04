import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

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

  useEffect(() => {
    setVisibleCount(LIST_CHUNK)
  }, [libraryIndex?.generatedAt, sortOption])

  useEffect(() => {
    if (!selectedPhotoId) {
      return
    }
    const exists = sortedRows.some((row) => row.photo.id === selectedPhotoId)
    if (!exists) {
      setSelectedPhotoId(undefined)
    }
  }, [sortedRows, selectedPhotoId])

  const visibleRows = useMemo(
    () => sortedRows.slice(0, visibleCount),
    [sortedRows, visibleCount]
  )

  const hasMore = visibleCount < sortedRows.length
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(() => {
    setVisibleCount((previous) =>
      Math.min(previous + LIST_CHUNK, sortedRows.length)
    )
  }, [sortedRows.length])

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
    () => sortedRows.find((row) => row.photo.id === selectedPhotoId),
    [sortedRows, selectedPhotoId]
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

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          파일 목록
        </h1>
        <p className="text-base leading-7 text-slate-600">
          출력 폴더에 정리된 사진을 목록으로 보고, 항목을 선택하면 미리보기를
          확인할 수 있습니다.
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
            총 {totalCount}장
          </div>
          {hasMore ? (
            <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
              목록 표시 {visibleRows.length} / {totalCount}
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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="max-h-[min(70vh,720px)] overflow-y-auto">
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
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">미리보기</h2>
              {!selectedRow ? (
                <p className="mt-4 text-sm text-slate-600">
                  왼쪽 목록에서 사진을 선택하면 썸네일 미리보기가 표시됩니다.
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
