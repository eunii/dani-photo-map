import { Button } from '@heroui/react'

import {
  DEST_YEAR_MONTH_ONLY
} from '@presentation/renderer/pages/fileList/fileListPageConstants'
import {
  folderRenameLabelWithoutDate
} from '@presentation/renderer/pages/fileList/fileListPageFormat'
import type { MoveDestinationFolderOption } from '@presentation/renderer/pages/fileList/useFileListMoveDestination'
import type { GroupSummary, LibraryIndexView } from '@shared/types/preload'

interface FileListGroupActionBarProps {
  libraryIndex: LibraryIndexView | null
  groupAtPath: GroupSummary | undefined
  selectedForMoveSize: number
  folderCount: number
  visibleRowsLength: number
  isMovingPhotos: boolean
  isRenaming: boolean
  isDeletingPhotos: boolean
  isDeletingFolder: boolean
  moveDestinationFolderOptions: MoveDestinationFolderOption[]
  canRenameGroupFolderFromTree: boolean
  groupsInCurrentFolder: { id: string; title: string }[]
  allVisibleSelected: boolean
  onOpenMoveDialog: () => void
  onOpenRenameDialog: () => void
  onToggleSelectAllVisible: () => void
  onRequestDeleteSelectedPhotos: () => void
}

export function FileListGroupActionBar({
  libraryIndex,
  groupAtPath,
  selectedForMoveSize,
  folderCount,
  visibleRowsLength,
  isMovingPhotos,
  isRenaming,
  isDeletingPhotos,
  isDeletingFolder,
  moveDestinationFolderOptions,
  canRenameGroupFolderFromTree,
  groupsInCurrentFolder,
  allVisibleSelected,
  onOpenMoveDialog,
  onOpenRenameDialog,
  onToggleSelectAllVisible,
  onRequestDeleteSelectedPhotos
}: FileListGroupActionBarProps) {
  if (!libraryIndex || !groupAtPath) {
    return null
  }

  return (
    <div className="flex flex-col gap-1 px-1.5 py-1 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <Button
          variant="primary"
          className="h-7 rounded-[10px] bg-[var(--app-button)] px-2.5 text-xs font-medium text-[var(--app-button-foreground)] disabled:opacity-60"
          isDisabled={
            selectedForMoveSize === 0 || isMovingPhotos || folderCount === 0
          }
          onPress={onOpenMoveDialog}
        >
          {selectedForMoveSize > 0
            ? `선택 ${selectedForMoveSize}장 이동`
            : '폴더로 이동'}
        </Button>
        {canRenameGroupFolderFromTree ? (
          <Button
            variant="ghost"
            className="h-7 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-medium text-[var(--app-foreground)] disabled:opacity-50"
            isDisabled={groupsInCurrentFolder.length === 0 || isRenaming}
            onPress={onOpenRenameDialog}
          >
            이름 변경
          </Button>
        ) : null}
      </div>
      <div
        className="hidden w-px shrink-0 self-stretch bg-[var(--app-border)] lg:block"
        aria-hidden
      />
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:justify-end">
        <Button
          variant="ghost"
          className="h-7 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-medium text-[var(--app-foreground)] disabled:opacity-50"
          isDisabled={visibleRowsLength === 0}
          onPress={onToggleSelectAllVisible}
        >
          {allVisibleSelected ? '목록 선택 해제' : '목록 전체 선택'}
        </Button>
        <Button
          variant="ghost"
          className="h-7 rounded-[10px] border border-[var(--app-danger)] bg-[var(--app-danger)] px-2.5 text-xs font-medium text-[var(--app-danger-foreground)] disabled:opacity-50"
          isDisabled={
            selectedForMoveSize === 0 ||
            isDeletingPhotos ||
            isDeletingFolder ||
            folderCount === 0
          }
          onPress={onRequestDeleteSelectedPhotos}
        >
          선택 삭제
        </Button>
      </div>
    </div>
  )
}

export function openFileListMoveDialogDefaults(
  moveDestinationFolderOptions: MoveDestinationFolderOption[],
  setDestinationSelect: (value: string) => void,
  setManualDestinationFolder: (value: string) => void,
  setMoveDialogOpen: (open: boolean) => void
): void {
  const first = moveDestinationFolderOptions[0]
  if (first) {
    setDestinationSelect(first.groupId)
    setManualDestinationFolder(first.label)
  } else {
    setDestinationSelect(DEST_YEAR_MONTH_ONLY)
    setManualDestinationFolder('')
  }
  setMoveDialogOpen(true)
}

export function openFileListRenameDialogDefaults(
  groupsInCurrentFolder: { id: string; title: string }[],
  libraryIndex: LibraryIndexView,
  setRenameTargetGroupId: (id: string) => void,
  setRenameNewTitle: (title: string) => void,
  setRenameDialogOpen: (open: boolean) => void
): void {
  const first = groupsInCurrentFolder[0]
  if (!first) {
    return
  }
  setRenameTargetGroupId(first.id)
  const g = libraryIndex.groups.find((x) => x.id === first.id)
  setRenameNewTitle(
    folderRenameLabelWithoutDate(g?.title ?? g?.displayTitle ?? '')
  )
  setRenameDialogOpen(true)
}
