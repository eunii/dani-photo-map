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
  deleteOutputFolderSubtreeIpc,
  deletePhotosFromLibraryIpc
} from '@presentation/renderer/utils/photoAppIpc'
import {
  flattenLibraryGroupsToPhotos,
  sortFlatPhotoRows,
  type PhotoListSortOption
} from '@presentation/renderer/view-models/flattenLibraryPhotos'
import { stripLeadingDateFromAutoGroupDisplayTitle } from '@domain/services/PhotoNamingService'
import {
  buildOutputFolderTree,
  countPhotosInSubtree,
  filterRowsAtPath,
  findFirstGroupIdUnderSubfolder,
  formatPathSegmentLabel,
  listSubfoldersAtPath,
  NO_OUTPUT_PATH_SEGMENT,
  ROOT_LEVEL_FILES_SEGMENT
} from '@presentation/renderer/view-models/outputPathNavigation'

const LIST_CHUNK = 150

/** 목적지: 년·월만 (가운데 폴더 없음) */
const DEST_YEAR_MONTH_ONLY = '__flat__'
/** 드롭다운: 직접 입력과 목록이 일치하지 않음 */
const DEST_CUSTOM = '__custom__'

function normalizeFolderLabelForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
}

function folderLabelMatches(input: string, folderLabel: string): boolean {
  return (
    normalizeFolderLabelForMatch(input) ===
    normalizeFolderLabelForMatch(folderLabel)
  )
}

/** 이름 변경 UI: 자동 제목 앞의 년·월(·일) 접두 제거. 남는 것이 없으면 원문 유지 */
function folderRenameLabelWithoutDate(raw: string): string {
  const t = raw.trim()
  if (!t) {
    return ''
  }
  const stripped = stripLeadingDateFromAutoGroupDisplayTitle(t)
  return stripped.length > 0 ? stripped : t
}

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
    setErrorMessage,
    selectOutputRoot,
    reloadLibraryIndex
  } = useOutputLibraryIndexPanel()

  const [pathSegments, setPathSegments] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<PhotoListSortOption>('captured-desc')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>()
  const [visibleCount, setVisibleCount] = useState(LIST_CHUNK)
  const [selectedForMove, setSelectedForMove] = useState<Set<string>>(() => new Set())
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  /** 목적지 드롭다운 값: 빈값 | DEST_YEAR_MONTH_ONLY | groupId | DEST_CUSTOM */
  const [destinationSelect, setDestinationSelect] = useState('')
  const [manualDestinationFolder, setManualDestinationFolder] = useState('')
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTargetGroupId, setRenameTargetGroupId] = useState('')
  const [renameNewTitle, setRenameNewTitle] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [isMovingPhotos, setIsMovingPhotos] = useState(false)
  const [deletePhotosConfirmOpen, setDeletePhotosConfirmOpen] = useState(false)
  const [deleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false)
  const [isDeletingPhotos, setIsDeletingPhotos] = useState(false)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)

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

  /** 인덱스가 다시 불러와져도 현재 트리 위치는 유지 (출력 폴더를 바꿀 때만 초기화) */
  useEffect(() => {
    setPathSegments([])
  }, [outputRoot])

  useEffect(() => {
    setSelectedForMove(new Set())
  }, [libraryIndex?.generatedAt, outputRoot])

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
      return '홈'
    }
    return pathSegments.map(formatPathSegmentLabel).join(' / ')
  }, [pathSegments])

  /**
   * 년·월 바로 아래 등 경로 깊이가 2 이하일 때: 목적지 후보 = 현재 경로의 하위 폴더.
   * 그룹 폴더 안(깊이 3+)일 때: 동위 폴더 = 한 단계 위(parent) 아래의 다른 폴더.
   */
  const moveDestinationUsesChildFolders = pathSegments.length < 3

  /** 년·월만 선택된 상태에서는 물리 폴더(년/월) 이름을 바꾸지 않음 — 지역(그룹) 폴더에서만 이름 변경 UI 표시 */
  const canRenameGroupFolderFromTree = pathSegments.length >= 3

  const destinationListContextLabel = useMemo(() => {
    if (moveDestinationUsesChildFolders) {
      if (pathSegments.length === 0) {
        return '홈'
      }
      return pathSegments.map(formatPathSegmentLabel).join(' / ')
    }
    if (pathSegments.length <= 1) {
      return '홈'
    }
    return pathSegments
      .slice(0, -1)
      .map(formatPathSegmentLabel)
      .join(' / ')
  }, [pathSegments, moveDestinationUsesChildFolders])

  /**
   * 폴더로 이동 시 드롭다운에 넣을 항목 (하위 또는 동위에 따라 list 기준 경로가 다름)
   */
  const moveDestinationFolderOptions = useMemo(() => {
    const listBasePath = moveDestinationUsesChildFolders
      ? pathSegments
      : pathSegments.length > 0
        ? pathSegments.slice(0, -1)
        : ([] as string[])
    const entries = listSubfoldersAtPath(sortedRows, listBasePath)
    const out: {
      groupId: string
      segment: string
      label: string
      photoCount: number
    }[] = []
    for (const entry of entries) {
      if (
        entry.segment === NO_OUTPUT_PATH_SEGMENT ||
        entry.segment === ROOT_LEVEL_FILES_SEGMENT
      ) {
        continue
      }
      const groupId = findFirstGroupIdUnderSubfolder(
        sortedRows,
        listBasePath,
        entry.segment
      )
      if (groupId) {
        out.push({
          groupId,
          segment: entry.segment,
          label: entry.displayLabel,
          photoCount: entry.photoCount
        })
      }
    }
    return out
  }, [sortedRows, pathSegments, moveDestinationUsesChildFolders])

  /** 현재 목록에 나타난 그룹(폴더) — 이름 변경 대상 선택용 (표시는 년·월 접두 없음) */
  const groupsInCurrentFolder = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rowsInFolder) {
      if (!map.has(row.groupId)) {
        map.set(
          row.groupId,
          folderRenameLabelWithoutDate(row.groupDisplayTitle)
        )
      }
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }))
  }, [rowsInFolder])

  const toggleMoveSelection = useCallback((photoId: string) => {
    setSelectedForMove((previous) => {
      const next = new Set(previous)

      if (next.has(photoId)) {
        next.delete(photoId)
      } else {
        next.add(photoId)
      }

      return next
    })
  }, [])

  const allVisibleSelected = useMemo(
    () =>
      visibleRows.length > 0 &&
      visibleRows.every((row) => selectedForMove.has(row.photo.id)),
    [visibleRows, selectedForMove]
  )

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedForMove((previous) => {
      if (visibleRows.length === 0) {
        return previous
      }
      const everySelected = visibleRows.every((row) =>
        previous.has(row.photo.id)
      )
      const next = new Set(previous)
      if (everySelected) {
        for (const row of visibleRows) {
          next.delete(row.photo.id)
        }
      } else {
        for (const row of visibleRows) {
          next.add(row.photo.id)
        }
      }
      return next
    })
  }, [visibleRows])

  function applyDestinationFromSelect(value: string): void {
    if (value === '') {
      setDestinationSelect('')
      setManualDestinationFolder('')
      return
    }
    if (value === DEST_YEAR_MONTH_ONLY) {
      setDestinationSelect(DEST_YEAR_MONTH_ONLY)
      setManualDestinationFolder('')
      return
    }
    const item = moveDestinationFolderOptions.find((i) => i.groupId === value)
    setDestinationSelect(value)
    setManualDestinationFolder(item?.label ?? '')
  }

  function handleManualDestinationInput(value: string): void {
    setManualDestinationFolder(value)
    const trimmed = value.trim()
    if (!trimmed) {
      setDestinationSelect('')
      return
    }
    const match = moveDestinationFolderOptions.find((item) =>
      folderLabelMatches(trimmed, item.label)
    )
    if (match) {
      setDestinationSelect(match.groupId)
      return
    }
    setDestinationSelect(DEST_CUSTOM)
  }

  async function handleConfirmMoveToGroup(): Promise<void> {
    if (!outputRoot || selectedForMove.size === 0) {
      return
    }

    const photoIds = [...selectedForMove]
    const manual = manualDestinationFolder.trim()

    let destinationGroupId: string | undefined
    let newGroupPayload: { title: string } | undefined

    if (manual.length > 0) {
      const matchedSibling = moveDestinationFolderOptions.find((item) =>
        folderLabelMatches(manual, item.label)
      )
      if (matchedSibling) {
        destinationGroupId = matchedSibling.groupId
      } else {
        newGroupPayload = { title: manual }
      }
    } else {
      if (destinationSelect === DEST_YEAR_MONTH_ONLY) {
        newGroupPayload = { title: '' }
      } else if (
        destinationSelect &&
        destinationSelect !== DEST_CUSTOM
      ) {
        destinationGroupId = destinationSelect
      } else if (destinationSelect === DEST_CUSTOM) {
        setErrorMessage(
          '목록에 있는 폴더와 같은 이름을 입력하거나, 드롭다운에서 고르세요.'
        )
        return
      } else {
        setErrorMessage('목적지를 드롭다운에서 고르거나, 폴더 이름을 입력하세요.')
        return
      }
    }

    setIsMovingPhotos(true)
    setErrorMessage(null)

    try {
      if (destinationGroupId) {
        await window.photoApp.movePhotosToGroup({
          outputRoot,
          photoIds,
          destinationGroupId
        })
      } else {
        await window.photoApp.movePhotosToGroup({
          outputRoot,
          photoIds,
          newGroup: newGroupPayload!
        })
      }

      setSelectedForMove(new Set())
      setMoveDialogOpen(false)
      setManualDestinationFolder('')
      setDestinationSelect('')
      await reloadLibraryIndex()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '사진 이동에 실패했습니다.'
      )
    } finally {
      setIsMovingPhotos(false)
    }
  }

  async function handleConfirmRename(): Promise<void> {
    if (!outputRoot || !libraryIndex || !renameTargetGroupId) {
      return
    }
    const trimmed = renameNewTitle.trim()
    if (!trimmed) {
      setErrorMessage('변경할 이름을 입력하세요.')
      return
    }
    const group = libraryIndex.groups.find((g) => g.id === renameTargetGroupId)
    if (!group) {
      setErrorMessage('그룹을 찾을 수 없습니다.')
      return
    }
    setIsRenaming(true)
    setErrorMessage(null)
    try {
      await window.photoApp.updatePhotoGroup({
        outputRoot,
        groupId: renameTargetGroupId,
        title: trimmed,
        companions: group.companions ?? [],
        notes: group.notes
      })
      setRenameDialogOpen(false)
      await reloadLibraryIndex()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '이름 변경에 실패했습니다.'
      )
    } finally {
      setIsRenaming(false)
    }
  }

  async function handleConfirmDeletePhotos(): Promise<void> {
    if (!outputRoot || selectedForMove.size === 0) {
      return
    }
    setIsDeletingPhotos(true)
    setErrorMessage(null)
    try {
      await deletePhotosFromLibraryIpc({
        outputRoot,
        photoIds: [...selectedForMove]
      })
      setSelectedForMove(new Set())
      setSelectedPhotoId(undefined)
      setDeletePhotosConfirmOpen(false)
      await reloadLibraryIndex()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '파일 삭제에 실패했습니다.'
      )
    } finally {
      setIsDeletingPhotos(false)
    }
  }

  async function handleConfirmDeleteFolder(): Promise<void> {
    if (!outputRoot || pathSegments.length === 0) {
      return
    }
    setIsDeletingFolder(true)
    setErrorMessage(null)
    try {
      await deleteOutputFolderSubtreeIpc({
        outputRoot,
        pathSegments
      })
      setDeleteFolderConfirmOpen(false)
      setPathSegments((segments) => segments.slice(0, -1))
      setSelectedPhotoId(undefined)
      setSelectedForMove(new Set())
      await reloadLibraryIndex()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '폴더 삭제에 실패했습니다.'
      )
    } finally {
      setIsDeletingFolder(false)
    }
  }

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
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
              <OutputFolderTreePanel
                folderTreeRoot={folderTree}
                selectedPathSegments={pathSegments}
                onSelectPath={setPathSegments}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-2 py-1.5">
                  <nav
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 text-xs text-slate-700"
                    aria-label="폴더 경로"
                  >
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 font-medium text-sky-700 hover:bg-sky-50"
                      onClick={() => setPathSegments([])}
                    >
                      홈
                    </button>
                    {pathSegments.map((segment, index) => (
                      <span key={`${segment}-${index}`} className="flex items-center gap-1">
                        <span className="text-slate-400" aria-hidden>
                          /
                        </span>
                        <button
                          type="button"
                          className="max-w-[min(200px,28vw)] truncate rounded px-1.5 py-0.5 font-medium text-sky-700 hover:bg-sky-50"
                          title={formatPathSegmentLabel(segment)}
                          onClick={() =>
                            setPathSegments(pathSegments.slice(0, index + 1))
                          }
                        >
                          {formatPathSegmentLabel(segment)}
                        </button>
                      </span>
                    ))}
                  </nav>
                  {pathSegments.length > 0 && libraryIndex ? (
                    <button
                      type="button"
                      className="shrink-0 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        isDeletingFolder || isDeletingPhotos || isMovingPhotos
                      }
                      onClick={() => setDeleteFolderConfirmOpen(true)}
                    >
                      폴더 삭제
                    </button>
                  ) : null}
                </div>

                {folderCount > 0 && libraryIndex ? (
                  <div className="flex flex-col gap-1.5 border-t border-slate-50 px-2 py-1.5 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          disabled={selectedForMove.size === 0 || isMovingPhotos}
                          onClick={() => {
                            const first = moveDestinationFolderOptions[0]
                            if (first) {
                              setDestinationSelect(first.groupId)
                              setManualDestinationFolder(first.label)
                            } else {
                              setDestinationSelect(DEST_YEAR_MONTH_ONLY)
                              setManualDestinationFolder('')
                            }
                            setMoveDialogOpen(true)
                          }}
                        >
                          {selectedForMove.size > 0
                            ? `선택 ${selectedForMove.size}장 이동`
                            : '폴더로 이동'}
                        </button>
                        {canRenameGroupFolderFromTree ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={
                              folderCount === 0 ||
                              groupsInCurrentFolder.length === 0 ||
                              isRenaming
                            }
                            onClick={() => {
                              const first = groupsInCurrentFolder[0]
                              if (!first || !libraryIndex) {
                                return
                              }
                              setRenameTargetGroupId(first.id)
                              const g = libraryIndex.groups.find(
                                (x) => x.id === first.id
                              )
                              setRenameNewTitle(
                                folderRenameLabelWithoutDate(
                                  g?.title ?? g?.displayTitle ?? ''
                                )
                              )
                              setRenameDialogOpen(true)
                            }}
                          >
                            이름 변경
                          </button>
                        ) : null}
                    </div>
                    <div className="hidden w-px shrink-0 self-stretch bg-slate-200 lg:block" aria-hidden />
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={visibleRows.length === 0}
                          onClick={() => toggleSelectAllVisible()}
                        >
                          {allVisibleSelected ? '목록 선택 해제' : '목록 전체 선택'}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            selectedForMove.size === 0 ||
                            isDeletingPhotos ||
                            isDeletingFolder
                          }
                          onClick={() => setDeletePhotosConfirmOpen(true)}
                        >
                          선택 삭제
                        </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid min-h-0 w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] lg:items-start">
                <div className="min-h-0 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 xl:grid-cols-4">
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
                              className={`[content-visibility:auto] flex min-w-0 flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                                isSelected
                                  ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                              style={{ containIntrinsicSize: '180px 220px' }}
                            >
                              <div className="relative aspect-square w-full bg-slate-100">
                                <label className="absolute left-2 top-2 z-10 flex cursor-pointer items-center rounded bg-white/90 p-1 shadow-sm">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300"
                                    checked={selectedForMove.has(row.photo.id)}
                                    onChange={() => toggleMoveSelection(row.photo.id)}
                                    onClick={(event) => event.stopPropagation()}
                                  />
                                  <span className="sr-only">이동·삭제 대상에 포함</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoId(row.photo.id)}
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
                                onClick={() => setSelectedPhotoId(row.photo.id)}
                                className="w-full min-w-0 flex-1 px-2 py-2 text-left"
                              >
                                <p className="truncate text-xs font-medium text-slate-900">
                                  {row.photo.sourceFileName}
                                </p>
                                <p
                                  className="mt-0.5 truncate text-[11px] text-slate-500"
                                  title={
                                    `${formatCapturedLabel(row.photo.capturedAtIso)} · ${row.groupDisplayTitle}`
                                  }
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
                          className="h-8 shrink-0"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  )}
                  </div>
                </div>

                <div className="min-h-0 min-w-0 lg:sticky lg:top-4 lg:self-start">
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
                              className="max-h-[min(42vh,400px)] w-full object-contain"
                            />
                          ) : (
                            <div className="flex min-h-[160px] items-center justify-center text-sm text-slate-500">
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
                            <dt className="text-xs text-slate-500">폴더(그룹)</dt>
                            <dd className="text-slate-800">
                              {selectedRow.groupDisplayTitle}
                            </dd>
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
              </div>
            </div>
          </div>
        )}

        {isLoadingIndex ? (
          <p className="text-sm text-slate-500">출력 결과를 불러오는 중입니다…</p>
        ) : null}
      </section>

      {moveDialogOpen && libraryIndex && outputRoot ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="move-to-folder-dialog-title"
          onClick={() => {
            if (!isMovingPhotos) {
              setMoveDialogOpen(false)
            }
          }}
        >
          <div
            className="w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="move-to-folder-dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              폴더로 이동
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              선택한 {selectedForMove.size}장의 목적지입니다.{' '}
              {moveDestinationUsesChildFolders ? (
                <>
                  <span className="font-medium">하위 폴더</span>는 지금 연
                  년·월(또는 상위) 경로 바로 아래에 있는 폴더입니다.
                </>
              ) : (
                <>
                  <span className="font-medium">동위 폴더</span>는 지금 폴더와
                  같은 상위 아래에 나란히 있는 폴더입니다.
                </>
              )}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              드롭다운에서 고르면 아래 입력란에 같은 이름이 채워집니다. 직접 고칠 수도
              있으며, 동일한 이름의 폴더가 있으면 합쳐집니다.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              지금 보는 경로:{' '}
              <span className="font-medium text-slate-700">{breadcrumbPathLabel}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {moveDestinationUsesChildFolders
                ? '하위 목록 기준 (현재 경로): '
                : '동위 목록 기준 부모 경로: '}
              <span className="font-medium text-slate-700">
                {destinationListContextLabel}
              </span>
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-slate-800">
                목적지 —{' '}
                {moveDestinationUsesChildFolders ? '하위 폴더' : '동위 폴더'}
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  disabled={isMovingPhotos}
                  value={
                    destinationSelect === DEST_CUSTOM ? '' : destinationSelect
                  }
                  onChange={(event) =>
                    applyDestinationFromSelect(event.target.value)
                  }
                >
                  <option value="">목적지 선택…</option>
                  <option value={DEST_YEAR_MONTH_ONLY}>
                    년·월만 (가운데 폴더 없음)
                  </option>
                  {moveDestinationFolderOptions.map((item) => (
                    <option key={item.groupId} value={item.groupId}>
                      {item.label} ({item.photoCount}장)
                    </option>
                  ))}
                </select>
              </label>
              {moveDestinationFolderOptions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {moveDestinationUsesChildFolders
                    ? '이 경로 아래에 다른 폴더가 없을 수 있습니다. 「년·월만」을 고르거나 아래에 새 이름을 입력하세요.'
                    : '같은 상위에 등록된 다른 폴더가 없을 수 있습니다. 「년·월만」을 고르거나 아래에 새 이름을 입력하세요.'}
                </p>
              ) : null}
            </div>

            <label className="mt-4 block text-sm text-slate-700">
              <span className="mb-1 block font-medium">
                폴더 이름 (드롭다운 선택 시 자동 입력 · 수정 가능)
              </span>
              <input
                type="text"
                value={manualDestinationFolder}
                onChange={(event) =>
                  handleManualDestinationInput(event.target.value)
                }
                disabled={isMovingPhotos}
                placeholder="예: 주말산책"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
              {destinationSelect === DEST_CUSTOM &&
              manualDestinationFolder.trim().length > 0 ? (
                <span className="mt-1 block text-xs text-amber-800">
                  목록에 없는 이름이면 새 폴더로 만듭니다.
                </span>
              ) : null}
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
                disabled={isMovingPhotos}
                onClick={() => setMoveDialogOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={
                  isMovingPhotos ||
                  (manualDestinationFolder.trim().length === 0 &&
                    !destinationSelect)
                }
                onClick={() => void handleConfirmMoveToGroup()}
              >
                {isMovingPhotos ? '이동 중…' : '이동'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {renameDialogOpen && libraryIndex && outputRoot ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="rename-folder-dialog-title"
          onClick={() => {
            if (!isRenaming) {
              setRenameDialogOpen(false)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="rename-folder-dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              이름 변경
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              이 경로 목록에 나온 폴더(그룹)의 표시 이름을 바꿉니다. 파일이 디스크에서
              해당 이름 폴더로 다시 정리될 수 있습니다.
            </p>
            <label className="mt-4 block text-sm text-slate-700">
              <span className="mb-1 block font-medium">대상 폴더</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                disabled={isRenaming}
                value={renameTargetGroupId}
                onChange={(event) => {
                  const id = event.target.value
                  setRenameTargetGroupId(id)
                  const g = libraryIndex.groups.find((x) => x.id === id)
                  setRenameNewTitle(
                    folderRenameLabelWithoutDate(
                      g?.title ?? g?.displayTitle ?? ''
                    )
                  )
                }}
              >
                {groupsInCurrentFolder.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm text-slate-700">
              <span className="mb-1 block font-medium">새 이름</span>
              <input
                type="text"
                value={renameNewTitle}
                onChange={(event) => setRenameNewTitle(event.target.value)}
                disabled={isRenaming}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
                disabled={isRenaming}
                onClick={() => setRenameDialogOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isRenaming || !renameTargetGroupId}
                onClick={() => void handleConfirmRename()}
              >
                {isRenaming ? '저장 중…' : '이름 저장'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletePhotosConfirmOpen && outputRoot ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="delete-photos-dialog-title"
          onClick={() => {
            if (!isDeletingPhotos) {
              setDeletePhotosConfirmOpen(false)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="delete-photos-dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              선택한 파일 삭제
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              선택한 {selectedForMove.size}장을 출력 폴더에서 지우고 index.json에서도
              제거합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
                disabled={isDeletingPhotos}
                onClick={() => setDeletePhotosConfirmOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-red-300"
                disabled={isDeletingPhotos}
                onClick={() => void handleConfirmDeletePhotos()}
              >
                {isDeletingPhotos ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteFolderConfirmOpen && outputRoot ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="delete-folder-dialog-title"
          onClick={() => {
            if (!isDeletingFolder) {
              setDeleteFolderConfirmOpen(false)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="delete-folder-dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              폴더 삭제
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              현재 트리 위치{' '}
              <span className="font-medium text-slate-800">{breadcrumbPathLabel}</span>
              와 그 아래에 있는 모든 파일·하위 폴더를 디스크에서 지우고, 해당하는 사진을
              index.json에서 제거합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              (이 경로 합계 약 {subtreeCount}장이 인덱스에서 사라질 수 있습니다.)
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
                disabled={isDeletingFolder}
                onClick={() => setDeleteFolderConfirmOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-red-300"
                disabled={isDeletingFolder}
                onClick={() => void handleConfirmDeleteFolder()}
              >
                {isDeletingFolder ? '삭제 중…' : '폴더 삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
