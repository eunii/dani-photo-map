import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import { toDisplayThumbUrl } from '@presentation/renderer/utils/fileUrl'
import {
  flattenLibraryGroupsToPhotos,
  sortFlatPhotoRows,
  type PhotoListSortOption
} from '@presentation/renderer/view-models/flattenLibraryPhotos'
import {
  buildGroupFolderTree,
  countPhotosInGroupSubtree,
  findGroupByPath
} from '@presentation/renderer/view-models/groupFolderNavigation'
import {
  buildOutputFolderTree,
  countPhotosInSubtree,
  filterRowsAtPath,
  formatPathSegmentLabel,
  listSubfoldersAtPath
} from '@presentation/renderer/view-models/outputPathNavigation'
import { isVideoLibraryFileName } from '@shared/constants/mediaExtensions'
import type { GroupSummary, LibraryIndexView } from '@shared/types/preload'

import { LIST_CHUNK } from '@presentation/renderer/pages/fileList/fileListPageConstants'

export interface UseFileListPathAndRowsOptions {
  outputRoot: string | undefined
  libraryIndex: LibraryIndexView | null | undefined
  groups: LibraryIndexView['groups']
  pendingFileListPathSegments: string[] | null
  consumePendingFileListPathSegments: () => void
}

export function useFileListPathAndRows({
  outputRoot,
  libraryIndex,
  groups,
  pendingFileListPathSegments,
  consumePendingFileListPathSegments
}: UseFileListPathAndRowsOptions) {
  const [pathSegments, setPathSegments] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<PhotoListSortOption>('captured-desc')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | undefined>()
  const [visibleCount, setVisibleCount] = useState(LIST_CHUNK)

  const photoRows = libraryIndex?.photoRows ?? []
  // `photoRows` is only empty for the disk-scan fallback recovery index, which
  // has no per-photo output paths. In that rare case we fall back to the old
  // group-based browsing (view-only; move/rename stay disabled, see
  // `canMutate` below) instead of showing an empty tree.
  const canMutate = photoRows.length > 0

  const fallbackGroupAtPath = useMemo(
    () => (canMutate ? undefined : findGroupByPath(groups, pathSegments)),
    [canMutate, groups, pathSegments]
  )

  const { groupDetail: fallbackGroupDetail, errorMessage: groupDetailErrorMessage } =
    useLibraryGroupDetail({
      outputRoot: libraryIndex?.outputRoot ?? outputRoot,
      group: fallbackGroupAtPath ?? null
    })

  const fallbackRowsAtPath = useMemo(
    () =>
      fallbackGroupDetail ? flattenLibraryGroupsToPhotos([fallbackGroupDetail]) : [],
    [fallbackGroupDetail]
  )

  const folderTree = useMemo(
    () => (canMutate ? buildOutputFolderTree(photoRows) : buildGroupFolderTree(groups)),
    [canMutate, photoRows, groups]
  )

  const rowsAtPath = useMemo(
    () => (canMutate ? filterRowsAtPath(photoRows, pathSegments) : fallbackRowsAtPath),
    [canMutate, photoRows, pathSegments, fallbackRowsAtPath]
  )

  const rowsInFolder = useMemo(
    () => sortFlatPhotoRows(rowsAtPath, sortOption),
    [rowsAtPath, sortOption]
  )

  const groupsInCurrentFolder = useMemo(() => {
    if (!canMutate) {
      return []
    }
    const ids = [...new Set(rowsInFolder.map((row) => row.groupId))]
    return ids
      .map((id) => groups.find((group) => group.id === id))
      .filter((group): group is GroupSummary => Boolean(group))
  }, [canMutate, rowsInFolder, groups])

  const missingThumbnailCount = useMemo(() => {
    if (!canMutate) {
      return 0
    }
    return rowsInFolder.filter(
      (row) =>
        !row.photo.thumbnailRelativePath &&
        !isVideoLibraryFileName(row.photo.sourceFileName)
    ).length
  }, [canMutate, rowsInFolder])

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
    if (!selectedRow) {
      return undefined
    }
    return toDisplayThumbUrl(
      outputRootForUrls,
      selectedRow.photo.thumbnailRelativePath,
      selectedRow.photo.outputRelativePath
    )
  }, [outputRootForUrls, selectedRow])

  const totalCount = useMemo(
    () =>
      canMutate
        ? countPhotosInSubtree(photoRows, [])
        : countPhotosInGroupSubtree(groups, []),
    [canMutate, photoRows, groups]
  )
  const folderCount = rowsInFolder.length
  const subtreeCount = useMemo(
    () =>
      canMutate
        ? countPhotosInSubtree(photoRows, pathSegments)
        : countPhotosInGroupSubtree(groups, pathSegments),
    [canMutate, photoRows, groups, pathSegments]
  )

  const breadcrumbPathLabel = useMemo(() => {
    if (pathSegments.length === 0) {
      return '홈'
    }
    return pathSegments.map(formatPathSegmentLabel).join(' > ')
  }, [pathSegments])

  const rootBreadcrumbOptions = useMemo(
    () =>
      listSubfoldersAtPath(photoRows, []).map((entry) => ({
        key: `root:${entry.segment}`,
        label: entry.displayLabel,
        pathSegments: [entry.segment],
        photoCount: entry.photoCount
      })),
    [photoRows]
  )

  return {
    pathSegments,
    setPathSegments,
    sortOption,
    setSortOption,
    selectedPhotoId,
    setSelectedPhotoId,
    canMutate,
    groupsInCurrentFolder,
    missingThumbnailCount,
    groupDetailErrorMessage,
    rowsInFolder,
    visibleRows,
    hasMore,
    loadMoreSentinelRef,
    selectedRow,
    previewThumbUrl,
    outputRootForUrls,
    folderTree,
    photoRows,
    totalCount,
    folderCount,
    subtreeCount,
    breadcrumbPathLabel,
    rootBreadcrumbOptions
  }
}
