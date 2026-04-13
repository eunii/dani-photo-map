import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'

import {
  DEST_CUSTOM,
  DEST_YEAR_MONTH_ONLY
} from '@presentation/renderer/pages/fileList/fileListPageConstants'
import { folderLabelMatches } from '@presentation/renderer/pages/fileList/fileListPageFormat'
import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'
import {
  deleteOutputFolderSubtreeIpc,
  deletePhotosFromLibraryIpc
} from '@presentation/renderer/utils/photoAppIpc'
import type { LibraryIndexView } from '@shared/types/preload'

import type { MoveDestinationFolderOption } from '@presentation/renderer/pages/fileList/useFileListMoveDestination'

export interface UseFileListSelectionAndMutationsOptions {
  outputRoot: string | undefined
  libraryIndex: LibraryIndexView | null
  pathSegments: string[]
  setPathSegments: Dispatch<SetStateAction<string[]>>
  setSelectedPhotoId: (value: string | undefined) => void
  setErrorMessage: (value: string | null) => void
  reloadLibraryIndex: () => Promise<void>
  moveDestinationFolderOptions: MoveDestinationFolderOption[]
  destinationSelect: string
  manualDestinationFolder: string
  setDestinationSelect: (value: string) => void
  setManualDestinationFolder: (value: string) => void
  visibleRows: FlatPhotoRow[]
}

export function useFileListSelectionAndMutations({
  outputRoot,
  libraryIndex,
  pathSegments,
  setPathSegments,
  setSelectedPhotoId,
  setErrorMessage,
  reloadLibraryIndex,
  moveDestinationFolderOptions,
  destinationSelect,
  manualDestinationFolder,
  setDestinationSelect,
  setManualDestinationFolder,
  visibleRows
}: UseFileListSelectionAndMutationsOptions) {
  const [selectedForMove, setSelectedForMove] = useState<Set<string>>(() => new Set())
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameTargetGroupId, setRenameTargetGroupId] = useState('')
  const [renameNewTitle, setRenameNewTitle] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [isMovingPhotos, setIsMovingPhotos] = useState(false)
  const [deletePhotosConfirmOpen, setDeletePhotosConfirmOpen] = useState(false)
  const [deleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false)
  const [isDeletingPhotos, setIsDeletingPhotos] = useState(false)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)

  useEffect(() => {
    setSelectedForMove(new Set())
  }, [libraryIndex?.generatedAt, outputRoot])

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

  return {
    selectedForMove,
    moveDialogOpen,
    setMoveDialogOpen,
    renameDialogOpen,
    setRenameDialogOpen,
    renameTargetGroupId,
    setRenameTargetGroupId,
    renameNewTitle,
    setRenameNewTitle,
    isRenaming,
    isMovingPhotos,
    deletePhotosConfirmOpen,
    setDeletePhotosConfirmOpen,
    deleteFolderConfirmOpen,
    setDeleteFolderConfirmOpen,
    isDeletingPhotos,
    isDeletingFolder,
    toggleMoveSelection,
    allVisibleSelected,
    toggleSelectAllVisible,
    handleConfirmMoveToGroup,
    handleConfirmRename,
    handleConfirmDeletePhotos,
    handleConfirmDeleteFolder
  }
}
