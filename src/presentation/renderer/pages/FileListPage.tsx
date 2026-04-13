import { FileListPhotoPreviewPanel } from '@presentation/renderer/components/fileList/FileListPhotoPreviewPanel'
import { FileListToolbarStrip } from '@presentation/renderer/components/fileList/FileListToolbarStrip'
import { OutputFolderTreePanel } from '@presentation/renderer/components/OutputFolderTreePanel'
import { FileListBreadcrumbToolbar } from '@presentation/renderer/pages/fileList/FileListBreadcrumbToolbar'
import { FileListDialogs } from '@presentation/renderer/pages/fileList/FileListDialogs'
import { FileListEmptyOutputState } from '@presentation/renderer/pages/fileList/FileListEmptyOutputState'
import {
  FileListGroupActionBar,
  openFileListMoveDialogDefaults,
  openFileListRenameDialogDefaults
} from '@presentation/renderer/pages/fileList/FileListGroupActionBar'
import { FileListPhotoGrid } from '@presentation/renderer/pages/fileList/FileListPhotoGrid'
import { FileListSourceBadgeBanner } from '@presentation/renderer/pages/fileList/FileListSourceBadgeBanner'
import { useFileListLibraryContext } from '@presentation/renderer/pages/fileList/useFileListLibraryContext'
import { useFileListMoveDestination } from '@presentation/renderer/pages/fileList/useFileListMoveDestination'
import { useFileListPathAndRows } from '@presentation/renderer/pages/fileList/useFileListPathAndRows'
import { useFileListRenamePreview } from '@presentation/renderer/pages/fileList/useFileListRenamePreview'
import { useFileListSelectionAndMutations } from '@presentation/renderer/pages/fileList/useFileListSelectionAndMutations'

interface FileListPageProps {
  onNavigateToSettings?: () => void
}

export function FileListPage({ onNavigateToSettings }: FileListPageProps) {
  const {
    outputRoot,
    libraryIndex,
    isLoadingIndex,
    errorMessage,
    setErrorMessage,
    reloadLibraryIndex,
    groups,
    sourceBadge,
    pendingFileListPathSegments,
    consumePendingFileListPathSegments
  } = useFileListLibraryContext()

  const {
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
  } = useFileListPathAndRows({
    outputRoot,
    libraryIndex,
    groups,
    pendingFileListPathSegments,
    consumePendingFileListPathSegments
  })

  const {
    moveDestinationUsesChildFolders,
    destinationListContextLabel,
    moveDestinationFolderOptions,
    destinationSelect,
    setDestinationSelect,
    manualDestinationFolder,
    setManualDestinationFolder,
    applyDestinationFromSelect,
    handleManualDestinationInput
  } = useFileListMoveDestination(groups, pathSegments)

  const mutations = useFileListSelectionAndMutations({
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
  })

  const {
    canRenameGroupFolderFromTree,
    groupsInCurrentFolder,
    renamePreviewRows,
    renamePreviewSummary
  } = useFileListRenamePreview({
    pathSegments,
    groupAtPath,
    groupDetail,
    rowsInFolder,
    renameNewTitle: mutations.renameNewTitle,
    renameTargetGroupId: mutations.renameTargetGroupId
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {sourceBadge ? (
        <FileListSourceBadgeBanner
          label={sourceBadge.label}
          tone={sourceBadge.tone}
          description={sourceBadge.description}
        />
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
          <FileListEmptyOutputState onNavigateToSettings={onNavigateToSettings} />
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
                <FileListBreadcrumbToolbar
                  pathSegments={pathSegments}
                  groups={groups}
                  libraryIndex={libraryIndex}
                  rootBreadcrumbOptions={rootBreadcrumbOptions}
                  onNavigate={setPathSegments}
                  onRequestDeleteFolder={() =>
                    mutations.setDeleteFolderConfirmOpen(true)
                  }
                  isDeleteFolderDisabled={
                    mutations.isDeletingFolder ||
                    mutations.isDeletingPhotos ||
                    mutations.isMovingPhotos
                  }
                />

                <FileListGroupActionBar
                  libraryIndex={libraryIndex}
                  groupAtPath={groupAtPath}
                  selectedForMoveSize={mutations.selectedForMove.size}
                  folderCount={folderCount}
                  visibleRowsLength={visibleRows.length}
                  isMovingPhotos={mutations.isMovingPhotos}
                  isRenaming={mutations.isRenaming}
                  isDeletingPhotos={mutations.isDeletingPhotos}
                  isDeletingFolder={mutations.isDeletingFolder}
                  moveDestinationFolderOptions={moveDestinationFolderOptions}
                  canRenameGroupFolderFromTree={canRenameGroupFolderFromTree}
                  groupsInCurrentFolder={groupsInCurrentFolder}
                  allVisibleSelected={mutations.allVisibleSelected}
                  onOpenMoveDialog={() =>
                    openFileListMoveDialogDefaults(
                      moveDestinationFolderOptions,
                      setDestinationSelect,
                      setManualDestinationFolder,
                      mutations.setMoveDialogOpen
                    )
                  }
                  onOpenRenameDialog={() => {
                    if (!libraryIndex) {
                      return
                    }
                    openFileListRenameDialogDefaults(
                      groupsInCurrentFolder,
                      libraryIndex,
                      mutations.setRenameTargetGroupId,
                      mutations.setRenameNewTitle,
                      mutations.setRenameDialogOpen
                    )
                  }}
                  onToggleSelectAllVisible={mutations.toggleSelectAllVisible}
                  onRequestDeleteSelectedPhotos={() =>
                    mutations.setDeletePhotosConfirmOpen(true)
                  }
                />
              </div>

              <div className="grid min-h-0 flex-1 w-full min-w-0 gap-1.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(200px,260px)]">
                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-[var(--app-surface)]">
                  <div className="border-b border-[var(--app-border)] px-2 py-1">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      이 폴더의 사진
                    </h3>
                  </div>
                  <FileListPhotoGrid
                    groupAtPath={groupAtPath}
                    pathSegments={pathSegments}
                    isLoadingGroupDetail={isLoadingGroupDetail}
                    folderCount={folderCount}
                    visibleRows={visibleRows}
                    outputRootForUrls={outputRootForUrls}
                    selectedPhotoId={selectedPhotoId}
                    onSelectPhoto={setSelectedPhotoId}
                    selectedForMove={mutations.selectedForMove}
                    onToggleMoveSelection={mutations.toggleMoveSelection}
                    hasMore={hasMore}
                    loadMoreSentinelRef={loadMoreSentinelRef}
                  />
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
          <p className="shrink-0 text-sm text-slate-500">
            출력 결과를 불러오는 중입니다…
          </p>
        ) : null}
      </section>

      <FileListDialogs
        outputRoot={outputRoot}
        libraryIndex={libraryIndex}
        moveDialogOpen={mutations.moveDialogOpen}
        moveDestinationUsesChildFolders={moveDestinationUsesChildFolders}
        breadcrumbPathLabel={breadcrumbPathLabel}
        destinationListContextLabel={destinationListContextLabel}
        moveDestinationFolderOptions={moveDestinationFolderOptions}
        destinationSelect={destinationSelect}
        manualDestinationFolder={manualDestinationFolder}
        isMovingPhotos={mutations.isMovingPhotos}
        selectedForMoveSize={mutations.selectedForMove.size}
        onMoveOverlayClick={() => {
          if (!mutations.isMovingPhotos) {
            mutations.setMoveDialogOpen(false)
          }
        }}
        onMoveContentClick={(event) => event.stopPropagation()}
        onDestinationSelectChange={applyDestinationFromSelect}
        onManualDestinationChange={handleManualDestinationInput}
        onMoveCancel={() => mutations.setMoveDialogOpen(false)}
        onMoveConfirm={() => void mutations.handleConfirmMoveToGroup()}
        renameDialogOpen={mutations.renameDialogOpen}
        isRenaming={mutations.isRenaming}
        renameTargetGroupId={mutations.renameTargetGroupId}
        renameNewTitle={mutations.renameNewTitle}
        groupsInCurrentFolder={groupsInCurrentFolder}
        renamePreviewSummary={renamePreviewSummary}
        renamePreviewRows={renamePreviewRows}
        onRenameOverlayClick={() => {
          if (!mutations.isRenaming) {
            mutations.setRenameDialogOpen(false)
          }
        }}
        onRenameContentClick={(event) => event.stopPropagation()}
        onRenameTargetGroupIdChange={mutations.setRenameTargetGroupId}
        onRenameNewTitleChange={mutations.setRenameNewTitle}
        onRenameCancel={() => mutations.setRenameDialogOpen(false)}
        onRenameConfirm={() => void mutations.handleConfirmRename()}
        deletePhotosConfirmOpen={mutations.deletePhotosConfirmOpen}
        isDeletingPhotos={mutations.isDeletingPhotos}
        onDeletePhotosOverlayClick={() => {
          if (!mutations.isDeletingPhotos) {
            mutations.setDeletePhotosConfirmOpen(false)
          }
        }}
        onDeletePhotosContentClick={(event) => event.stopPropagation()}
        onDeletePhotosCancel={() => mutations.setDeletePhotosConfirmOpen(false)}
        onDeletePhotosConfirm={() => void mutations.handleConfirmDeletePhotos()}
        deleteFolderConfirmOpen={mutations.deleteFolderConfirmOpen}
        subtreeCount={subtreeCount}
        isDeletingFolder={mutations.isDeletingFolder}
        onDeleteFolderOverlayClick={() => {
          if (!mutations.isDeletingFolder) {
            mutations.setDeleteFolderConfirmOpen(false)
          }
        }}
        onDeleteFolderContentClick={(event) => event.stopPropagation()}
        onDeleteFolderCancel={() => mutations.setDeleteFolderConfirmOpen(false)}
        onDeleteFolderConfirm={() => void mutations.handleConfirmDeleteFolder()}
      />
    </div>
  )
}
