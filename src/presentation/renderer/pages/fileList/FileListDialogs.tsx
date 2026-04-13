import { FileListDeleteFolderDialog } from '@presentation/renderer/components/fileList/FileListDeleteFolderDialog'
import { FileListDeletePhotosDialog } from '@presentation/renderer/components/fileList/FileListDeletePhotosDialog'
import { FileListMovePhotosDialog } from '@presentation/renderer/components/fileList/FileListMovePhotosDialog'
import { FileListRenameGroupDialog } from '@presentation/renderer/components/fileList/FileListRenameGroupDialog'
import { folderRenameLabelWithoutDate } from '@presentation/renderer/pages/fileList/fileListPageFormat'
import type { MoveDestinationFolderOption } from '@presentation/renderer/pages/fileList/useFileListMoveDestination'
import type { LibraryIndexView } from '@shared/types/preload'

interface RenamePreviewRow {
  photoId: string
  sourceFileName: string
  currentOutputRelativePath: string | undefined
  nextOutputRelativePath: string
  willChange: boolean
}

interface FileListDialogsProps {
  outputRoot: string | undefined
  libraryIndex: LibraryIndexView | null
  moveDialogOpen: boolean
  moveDestinationUsesChildFolders: boolean
  breadcrumbPathLabel: string
  destinationListContextLabel: string
  moveDestinationFolderOptions: MoveDestinationFolderOption[]
  destinationSelect: string
  manualDestinationFolder: string
  isMovingPhotos: boolean
  selectedForMoveSize: number
  onMoveOverlayClick: () => void
  onMoveContentClick: (event: React.MouseEvent) => void
  onDestinationSelectChange: (value: string) => void
  onManualDestinationChange: (value: string) => void
  onMoveCancel: () => void
  onMoveConfirm: () => void
  renameDialogOpen: boolean
  isRenaming: boolean
  renameTargetGroupId: string
  renameNewTitle: string
  groupsInCurrentFolder: { id: string; title: string }[]
  renamePreviewSummary: { changedCount: number; unchangedCount: number }
  renamePreviewRows: RenamePreviewRow[]
  onRenameOverlayClick: () => void
  onRenameContentClick: (event: React.MouseEvent) => void
  onRenameTargetGroupIdChange: (id: string) => void
  onRenameNewTitleChange: (value: string) => void
  onRenameCancel: () => void
  onRenameConfirm: () => void
  deletePhotosConfirmOpen: boolean
  isDeletingPhotos: boolean
  onDeletePhotosOverlayClick: () => void
  onDeletePhotosContentClick: (event: React.MouseEvent) => void
  onDeletePhotosCancel: () => void
  onDeletePhotosConfirm: () => void
  deleteFolderConfirmOpen: boolean
  subtreeCount: number
  isDeletingFolder: boolean
  onDeleteFolderOverlayClick: () => void
  onDeleteFolderContentClick: (event: React.MouseEvent) => void
  onDeleteFolderCancel: () => void
  onDeleteFolderConfirm: () => void
}

export function FileListDialogs({
  outputRoot,
  libraryIndex,
  moveDialogOpen,
  moveDestinationUsesChildFolders,
  breadcrumbPathLabel,
  destinationListContextLabel,
  moveDestinationFolderOptions,
  destinationSelect,
  manualDestinationFolder,
  isMovingPhotos,
  selectedForMoveSize,
  onMoveOverlayClick,
  onMoveContentClick,
  onDestinationSelectChange,
  onManualDestinationChange,
  onMoveCancel,
  onMoveConfirm,
  renameDialogOpen,
  isRenaming,
  renameTargetGroupId,
  renameNewTitle,
  groupsInCurrentFolder,
  renamePreviewSummary,
  renamePreviewRows,
  onRenameOverlayClick,
  onRenameContentClick,
  onRenameTargetGroupIdChange,
  onRenameNewTitleChange,
  onRenameCancel,
  onRenameConfirm,
  deletePhotosConfirmOpen,
  isDeletingPhotos,
  onDeletePhotosOverlayClick,
  onDeletePhotosContentClick,
  onDeletePhotosCancel,
  onDeletePhotosConfirm,
  deleteFolderConfirmOpen,
  subtreeCount,
  isDeletingFolder,
  onDeleteFolderOverlayClick,
  onDeleteFolderContentClick,
  onDeleteFolderCancel,
  onDeleteFolderConfirm
}: FileListDialogsProps) {
  return (
    <>
      {moveDialogOpen && libraryIndex && outputRoot ? (
        <FileListMovePhotosDialog
          selectedCount={selectedForMoveSize}
          moveDestinationUsesChildFolders={moveDestinationUsesChildFolders}
          breadcrumbPathLabel={breadcrumbPathLabel}
          destinationListContextLabel={destinationListContextLabel}
          moveDestinationFolderOptions={moveDestinationFolderOptions}
          destinationSelect={destinationSelect}
          manualDestinationFolder={manualDestinationFolder}
          isMovingPhotos={isMovingPhotos}
          onOverlayClick={onMoveOverlayClick}
          onContentClick={onMoveContentClick}
          onDestinationSelectChange={onDestinationSelectChange}
          onManualDestinationChange={onManualDestinationChange}
          onCancel={onMoveCancel}
          onConfirm={onMoveConfirm}
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
          onOverlayClick={onRenameOverlayClick}
          onContentClick={onRenameContentClick}
          onRenameTargetGroupIdChange={(id) => {
            onRenameTargetGroupIdChange(id)
            const g = libraryIndex.groups.find((x) => x.id === id)
            onRenameNewTitleChange(
              folderRenameLabelWithoutDate(g?.title ?? g?.displayTitle ?? '')
            )
          }}
          onRenameNewTitleChange={onRenameNewTitleChange}
          onCancel={onRenameCancel}
          onConfirm={onRenameConfirm}
        />
      ) : null}

      {deletePhotosConfirmOpen && outputRoot ? (
        <FileListDeletePhotosDialog
          selectedCount={selectedForMoveSize}
          isDeletingPhotos={isDeletingPhotos}
          onOverlayClick={onDeletePhotosOverlayClick}
          onContentClick={onDeletePhotosContentClick}
          onCancel={onDeletePhotosCancel}
          onConfirm={onDeletePhotosConfirm}
        />
      ) : null}

      {deleteFolderConfirmOpen && outputRoot ? (
        <FileListDeleteFolderDialog
          breadcrumbPathLabel={breadcrumbPathLabel}
          subtreeCount={subtreeCount}
          isDeletingFolder={isDeletingFolder}
          onOverlayClick={onDeleteFolderOverlayClick}
          onContentClick={onDeleteFolderContentClick}
          onCancel={onDeleteFolderCancel}
          onConfirm={onDeleteFolderConfirm}
        />
      ) : null}
    </>
  )
}
