import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import { toOutputFileUrl } from '@presentation/renderer/utils/fileUrl'
import {
  flattenLibraryGroupsToPhotos,
  sortFlatPhotoRows,
  type PhotoListSortOption
} from '@presentation/renderer/view-models/flattenLibraryPhotos'
import {
  buildGroupFolderTree,
  countPhotosInGroupSubtree,
  findGroupByPath,
  listSubfoldersAtPath as listGroupSubfoldersAtPath
} from '@presentation/renderer/view-models/groupFolderNavigation'
import { formatPathSegmentLabel } from '@presentation/renderer/view-models/outputPathNavigation'
import type { LibraryIndexView } from '@shared/types/preload'

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

  const rowsInFolder = sortedRows

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

  return {
    pathSegments,
    setPathSegments,
    sortOption,
    setSortOption,
    selectedPhotoId,
    setSelectedPhotoId,
    groupAtPath,
    groupDetail,
    isLoadingGroupDetail,
    groupDetailErrorMessage,
    rowsInFolder,
    visibleRows,
    hasMore,
    loadMoreSentinelRef,
    selectedRow,
    previewThumbUrl,
    outputRootForUrls,
    folderTree,
    totalCount,
    folderCount,
    subtreeCount,
    breadcrumbPathLabel,
    rootBreadcrumbOptions
  }
}
