import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { Button } from '@heroui/react'

import { buildGroupAwarePhotoOutputRelativePath } from '@domain/services/GroupAwarePhotoNamingService'
import { FileListDeleteFolderDialog } from '@presentation/renderer/components/fileList/FileListDeleteFolderDialog'
import { FileListDeletePhotosDialog } from '@presentation/renderer/components/fileList/FileListDeletePhotosDialog'
import { FileListMovePhotosDialog } from '@presentation/renderer/components/fileList/FileListMovePhotosDialog'
import { FileListPhotoPreviewPanel } from '@presentation/renderer/components/fileList/FileListPhotoPreviewPanel'
import { FileListRenameGroupDialog } from '@presentation/renderer/components/fileList/FileListRenameGroupDialog'
import { FileListToolbarStrip } from '@presentation/renderer/components/fileList/FileListToolbarStrip'
import { BreadcrumbDropdown } from '@presentation/renderer/components/files/BreadcrumbDropdown'
import { OutputFolderTreePanel } from '@presentation/renderer/components/OutputFolderTreePanel'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'
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
import { stripLeadingDateFromGroupTitle } from '@presentation/common/formatters/groupTitle'
import {
  buildGroupFolderTree,
  countPhotosInGroupSubtree,
  findFirstGroupIdUnderSubfolder as findFirstGroupIdUnderSummaryPath,
  findGroupByPath,
  listSubfoldersAtPath as listGroupSubfoldersAtPath
} from '@presentation/renderer/view-models/groupFolderNavigation'
import { formatPathSegmentLabel } from '@presentation/renderer/view-models/outputPathNavigation'
import {
  DEST_CUSTOM,
  DEST_YEAR_MONTH_ONLY,
  LIST_CHUNK
} from '@presentation/renderer/pages/fileList/fileListPageConstants'
import {
  folderLabelMatches,
  folderRenameLabelWithoutDate,
  formatCapturedLabel,
  toPreviewTimestamp
} from '@presentation/renderer/pages/fileList/fileListPageFormat'

interface FileListPageProps {
  onNavigateToSettings?: () => void
}

export function FileListPage({ onNavigateToSettings }: FileListPageProps) {
  const {
    outputRoot,
    libraryIndex,
    loadSource,
    isLoadingIndex,
    errorMessage,
    setErrorMessage,
    reloadLibraryIndex
  } = useOutputLibraryIndexPanel()
  const pendingFileListPathSegments = useLibraryWorkspaceStore(
    (state) => state.pendingFileListPathSegments
  )
  const consumePendingFileListPathSegments = useLibraryWorkspaceStore(
    (state) => state.consumePendingFileListPathSegments
  )

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

  const groups = libraryIndex?.groups ?? []

  const groupAtPath = useMemo(
    () => findGroupByPath(groups, pathSegments),
    [groups, pathSegments]
  )

  const {
    groupDetail,
    isLoading: isLoadingGroupDetail,
    errorMessage: groupDetailErrorMessage
  } = useLibraryGroupDetail({
    outputRoot: libraryIndex?.outputRoot ?? outputRoot,
    group: groupAtPath ?? null
  })

  const flatRows = useMemo(
    () => (groupDetail ? flattenLibraryGroupsToPhotos([groupDetail]) : []),
    [groupDetail]
  )

  const sortedRows = useMemo(
    () => sortFlatPhotoRows(flatRows, sortOption),
    [flatRows, sortOption]
  )

  const folderTree = useMemo(() => buildGroupFolderTree(groups), [groups])

  /** 그룹 폴더(년/월/지역)를 선택했을 때만 상세 로드된 사진이 여기에 채워집니다. */
  const rowsInFolder = sortedRows

  /** 인덱스가 다시 불러와져도 현재 트리 위치는 유지 (출력 폴더를 바꿀 때만 초기화) */
  useEffect(() => {
    setPathSegments([])
  }, [outputRoot])

  useEffect(() => {
    if (!pendingFileListPathSegments) {
      return
    }

    setPathSegments(pendingFileListPathSegments)
    consumePendingFileListPathSegments()
  }, [consumePendingFileListPathSegments, pendingFileListPathSegments])

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

  const totalCount = useMemo(
    () => countPhotosInGroupSubtree(groups, []),
    [groups]
  )
  const folderCount = rowsInFolder.length
  const subtreeCount = useMemo(
    () => countPhotosInGroupSubtree(groups, pathSegments),
    [groups, pathSegments]
  )

  const breadcrumbPathLabel = useMemo(() => {
    if (pathSegments.length === 0) {
      return '홈'
    }
    return pathSegments.map(formatPathSegmentLabel).join(' > ')
  }, [pathSegments])

  const rootBreadcrumbOptions = useMemo(
    () =>
      listGroupSubfoldersAtPath(groups, []).map((entry) => ({
        key: `root:${entry.segment}`,
        label: entry.displayLabel,
        pathSegments: [entry.segment],
        photoCount: entry.photoCount
      })),
    [groups]
  )

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
      return pathSegments.map(formatPathSegmentLabel).join(' > ')
    }
    if (pathSegments.length <= 1) {
      return '홈'
    }
    return pathSegments
      .slice(0, -1)
      .map(formatPathSegmentLabel)
      .join(' > ')
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
    const entries = listGroupSubfoldersAtPath(groups, listBasePath)
    const out: {
      groupId: string
      segment: string
      label: string
      photoCount: number
    }[] = []
    for (const entry of entries) {
      const groupId = findFirstGroupIdUnderSummaryPath(
        groups,
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
  }, [groups, pathSegments, moveDestinationUsesChildFolders])

  /** 현재 경로가 그룹 폴더일 때 이름 변경 대상 (표시는 년·월 접두 없음) */
  const groupsInCurrentFolder = useMemo(() => {
    if (!groupAtPath) {
      return []
    }
    return [
      {
        id: groupAtPath.id,
        title: folderRenameLabelWithoutDate(
          groupAtPath.title.trim().length > 0
            ? groupAtPath.title
            : stripLeadingDateFromGroupTitle(groupAtPath.displayTitle)
        )
      }
    ]
  }, [groupAtPath])
  const renamePreviewRows = useMemo(() => {
    if (!groupDetail || groupDetail.id !== renameTargetGroupId) {
      return []
    }

    const effectiveTitle = renameNewTitle.trim() || groupDetail.displayTitle

    return [...rowsInFolder]
      .sort((left, right) => {
        const leftIso = left.photo.capturedAtIso ?? ''
        const rightIso = right.photo.capturedAtIso ?? ''

        if (leftIso !== rightIso) {
          return leftIso.localeCompare(rightIso)
        }

        return left.photo.sourceFileName.localeCompare(right.photo.sourceFileName)
      })
      .map((row, index) => {
        const nextOutputRelativePath = buildGroupAwarePhotoOutputRelativePath(
          {
            sourceFileName: row.photo.sourceFileName,
            capturedAt: toPreviewTimestamp(row.photo.capturedAtIso),
            gps: row.photo.gps,
            regionName: row.photo.regionName,
            missingGpsCategory: row.photo.missingGpsCategory
          },
          effectiveTitle,
          index + 1,
          defaultOrganizationRules
        )

        return {
          photoId: row.photo.id,
          sourceFileName: row.photo.sourceFileName,
          currentOutputRelativePath: row.photo.outputRelativePath,
          nextOutputRelativePath,
          willChange: row.photo.outputRelativePath !== nextOutputRelativePath
        }
      })
  }, [groupDetail, renameNewTitle, renameTargetGroupId, rowsInFolder])
  const renamePreviewSummary = useMemo(() => {
    const changedCount = renamePreviewRows.filter((row) => row.willChange).length

    return {
      changedCount,
      unchangedCount: Math.max(0, renamePreviewRows.length - changedCount)
    }
  }, [renamePreviewRows])

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
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {sourceBadge ? (
        <section
          className={`shrink-0 rounded-xl border px-2 py-1.5 text-xs ${sourceBadge.tone}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current/20 bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
              {sourceBadge.label}
            </span>
            <p>{sourceBadge.description}</p>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {groupDetailErrorMessage ? (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {groupDetailErrorMessage}
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
        {outputRoot ? (
          <FileListToolbarStrip
            totalCount={totalCount}
            pathSegmentCount={pathSegments.length}
            subtreeCount={subtreeCount}
            folderCount={folderCount}
            hasMore={hasMore}
            visibleRowsLength={visibleRows.length}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
        ) : null}

        {!outputRoot ? (
          <div className="flex-1 rounded-[16px] bg-[var(--app-surface)] p-5 text-center">
            <p className="text-sm font-semibold text-[var(--app-foreground)]">
              출력 폴더를 먼저 설정하세요.
            </p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              설정 탭에서 정리 결과 폴더를 지정하면 목록이 표시됩니다.
            </p>
            {onNavigateToSettings ? (
              <Button
                variant="primary"
                className="mt-3 rounded-xl bg-[var(--app-button)] text-[var(--app-button-foreground)]"
                onPress={onNavigateToSettings}
              >
                설정으로 이동
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-1.5 overflow-hidden lg:grid-cols-[minmax(152px,200px)_minmax(0,1fr)]">
            <div className="min-h-0 lg:h-full">
              <OutputFolderTreePanel
                folderTreeRoot={folderTree}
                selectedPathSegments={pathSegments}
                onSelectPath={setPathSegments}
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden">
              <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl bg-[var(--app-surface)]">
                <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2 py-1.5">
                  <nav
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm text-[var(--app-foreground)]"
                    aria-label="폴더 경로"
                  >
                    <BreadcrumbDropdown
                      label="홈"
                      currentPathSegments={[]}
                      options={rootBreadcrumbOptions}
                      onNavigate={setPathSegments}
                    />
                    {pathSegments.map((segment, index) => (
                      <span key={`${segment}-${index}`} className="flex items-center gap-1">
                        <span className="text-[var(--app-muted)]" aria-hidden>
                          &gt;
                        </span>
                        <BreadcrumbDropdown
                          label={formatPathSegmentLabel(segment)}
                          currentPathSegments={pathSegments.slice(0, index + 1)}
                          options={listGroupSubfoldersAtPath(
                            groups,
                            pathSegments.slice(0, index)
                          ).map((entry) => ({
                            key: `sibling:${pathSegments
                              .slice(0, index)
                              .join('/')}:${entry.segment}`,
                            label: entry.displayLabel,
                            pathSegments: [
                              ...pathSegments.slice(0, index),
                              entry.segment
                            ],
                            photoCount: entry.photoCount
                          }))}
                          onNavigate={setPathSegments}
                        />
                      </span>
                    ))}
                  </nav>
                  {pathSegments.length > 0 && libraryIndex ? (
                    <Button
                      variant="ghost"
                      className="h-7 shrink-0 rounded-[10px] border border-[var(--app-danger)] bg-[var(--app-danger)] px-2.5 text-[11px] font-medium text-[var(--app-danger-foreground)] disabled:opacity-50"
                      isDisabled={
                        isDeletingFolder || isDeletingPhotos || isMovingPhotos
                      }
                      onPress={() => setDeleteFolderConfirmOpen(true)}
                    >
                      폴더 삭제
                    </Button>
                  ) : null}
                </div>

                {libraryIndex && groupAtPath ? (
                  <div className="flex flex-col gap-1 px-1.5 py-1 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <Button
                          variant="primary"
                          className="h-7 rounded-[10px] bg-[var(--app-button)] px-2.5 text-xs font-medium text-[var(--app-button-foreground)] disabled:opacity-60"
                          isDisabled={
                            selectedForMove.size === 0 ||
                            isMovingPhotos ||
                            folderCount === 0
                          }
                          onPress={() => {
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
                        </Button>
                        {canRenameGroupFolderFromTree ? (
                          <Button
                            variant="ghost"
                            className="h-7 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-medium text-[var(--app-foreground)] disabled:opacity-50"
                            isDisabled={
                              groupsInCurrentFolder.length === 0 || isRenaming
                            }
                            onPress={() => {
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
                          </Button>
                        ) : null}
                    </div>
                    <div className="hidden w-px shrink-0 self-stretch bg-[var(--app-border)] lg:block" aria-hidden />
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:justify-end">
                        <Button
                          variant="ghost"
                          className="h-7 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-medium text-[var(--app-foreground)] disabled:opacity-50"
                          isDisabled={visibleRows.length === 0}
                          onPress={() => toggleSelectAllVisible()}
                        >
                          {allVisibleSelected ? '목록 선택 해제' : '목록 전체 선택'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-7 rounded-[10px] border border-[var(--app-danger)] bg-[var(--app-danger)] px-2.5 text-xs font-medium text-[var(--app-danger-foreground)] disabled:opacity-50"
                          isDisabled={
                            selectedForMove.size === 0 ||
                            isDeletingPhotos ||
                            isDeletingFolder ||
                            folderCount === 0
                          }
                          onPress={() => setDeletePhotosConfirmOpen(true)}
                        >
                          선택 삭제
                        </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid min-h-0 flex-1 w-full min-w-0 gap-1.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(200px,260px)]">
                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-[var(--app-surface)]">
                  <div className="border-b border-[var(--app-border)] px-2 py-1">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      이 폴더의 사진
                    </h3>
                  </div>
                  <div className="app-scroll min-h-0 flex-1">
                  {!groupAtPath && pathSegments.length > 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-slate-500">
                      년·월·그룹(지역) 폴더까지 들어가면 그 안의 사진 목록을
                      불러옵니다.
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
                                    className="w-full min-w-0 flex-1 px-1.5 py-0.5 text-left"
                              >
                                    <p className="truncate text-[10px] font-medium leading-tight text-[var(--app-foreground)]">
                                  {row.photo.sourceFileName}
                                </p>
                                <p
                                      className="mt-px truncate text-[9px] leading-tight text-[var(--app-muted)]"
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
                          className="h-6 shrink-0"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  )}
                  </div>
                </div>

                <FileListPhotoPreviewPanel
                  selectedRow={selectedRow}
                  previewThumbUrl={previewThumbUrl}
                />
              </div>
            </div>
          </div>
        )}

        {isLoadingIndex ? (
          <p className="shrink-0 text-sm text-slate-500">출력 결과를 불러오는 중입니다…</p>
        ) : null}
      </section>

      {moveDialogOpen && libraryIndex && outputRoot ? (
        <FileListMovePhotosDialog
          selectedCount={selectedForMove.size}
          moveDestinationUsesChildFolders={moveDestinationUsesChildFolders}
          breadcrumbPathLabel={breadcrumbPathLabel}
          destinationListContextLabel={destinationListContextLabel}
          moveDestinationFolderOptions={moveDestinationFolderOptions}
          destinationSelect={destinationSelect}
          manualDestinationFolder={manualDestinationFolder}
          isMovingPhotos={isMovingPhotos}
          onOverlayClick={() => {
            if (!isMovingPhotos) {
              setMoveDialogOpen(false)
            }
          }}
          onContentClick={(event) => event.stopPropagation()}
          onDestinationSelectChange={applyDestinationFromSelect}
          onManualDestinationChange={handleManualDestinationInput}
          onCancel={() => setMoveDialogOpen(false)}
          onConfirm={() => void handleConfirmMoveToGroup()}
        />
      ) : null}

      {renameDialogOpen && libraryIndex && outputRoot ? (
        <FileListRenameGroupDialog
          isRenaming={isRenaming}
          renameTargetGroupId={renameTargetGroupId}
          renameNewTitle={renameNewTitle}
          groupsInCurrentFolder={groupsInCurrentFolder}
          renamePreviewSummary={renamePreviewSummary}
          renamePreviewRows={renamePreviewRows}
          onOverlayClick={() => {
            if (!isRenaming) {
              setRenameDialogOpen(false)
            }
          }}
          onContentClick={(event) => event.stopPropagation()}
          onRenameTargetGroupIdChange={(id) => {
            setRenameTargetGroupId(id)
            const g = libraryIndex.groups.find((x) => x.id === id)
            setRenameNewTitle(
              folderRenameLabelWithoutDate(g?.title ?? g?.displayTitle ?? '')
            )
          }}
          onRenameNewTitleChange={setRenameNewTitle}
          onCancel={() => setRenameDialogOpen(false)}
          onConfirm={() => void handleConfirmRename()}
        />
      ) : null}

      {deletePhotosConfirmOpen && outputRoot ? (
        <FileListDeletePhotosDialog
          selectedCount={selectedForMove.size}
          isDeletingPhotos={isDeletingPhotos}
          onOverlayClick={() => {
            if (!isDeletingPhotos) {
              setDeletePhotosConfirmOpen(false)
            }
          }}
          onContentClick={(event) => event.stopPropagation()}
          onCancel={() => setDeletePhotosConfirmOpen(false)}
          onConfirm={() => void handleConfirmDeletePhotos()}
        />
      ) : null}

      {deleteFolderConfirmOpen && outputRoot ? (
        <FileListDeleteFolderDialog
          breadcrumbPathLabel={breadcrumbPathLabel}
          subtreeCount={subtreeCount}
          isDeletingFolder={isDeletingFolder}
          onOverlayClick={() => {
            if (!isDeletingFolder) {
              setDeleteFolderConfirmOpen(false)
            }
          }}
          onContentClick={(event) => event.stopPropagation()}
          onCancel={() => setDeleteFolderConfirmOpen(false)}
          onConfirm={() => void handleConfirmDeleteFolder()}
        />
      ) : null}
    </div>
  )
}
