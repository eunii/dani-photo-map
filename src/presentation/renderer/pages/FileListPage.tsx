import type { CSSProperties } from 'react'

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
import { useFileListPreviewSplit } from '@presentation/renderer/pages/fileList/useFileListPreviewSplit'
import { useFileListRenamePreview } from '@presentation/renderer/pages/fileList/useFileListRenamePreview'
import { useFileListSelectionAndMutations } from '@presentation/renderer/pages/fileList/useFileListSelectionAndMutations'
import { openOutputFileIpc } from '@presentation/renderer/utils/photoAppIpc'
import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'

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
    canMutate,
    groupsInCurrentFolder: groupsAtPath,
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
  } = useFileListMoveDestination(photoRows, pathSegments)

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

  const { splitLayoutRef, previewPanelWidth, handleStartPreviewResize } =
    useFileListPreviewSplit()

  async function handleOpenPhoto(row: FlatPhotoRow): Promise<void> {
    if (!outputRootForUrls || !row.photo.outputRelativePath) {
      setErrorMessage('이 사진의 실제 파일 경로를 찾을 수 없습니다.')
      return
    }
    try {
      const result = await openOutputFileIpc({
        outputRoot: outputRootForUrls,
        relativePath: row.photo.outputRelativePath
      })
      if (!result.opened) {
        setErrorMessage(result.errorMessage || '파일을 열지 못했습니다.')
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '파일을 열지 못했습니다.'
      )
    }
  }

  const {
    canRenameGroupFolderFromTree,
    groupsInCurrentFolder,
    renamePreviewRows,
    renamePreviewSummary,
    renameScope
  } = useFileListRenamePreview({
    outputRoot,
    libraryIndex,
    pathSegments,
    groupsAtPath,
    renameDialogOpen: mutations.renameDialogOpen,
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
                  photoRows={photoRows}
                  libraryIndex={libraryIndex}
                  rootBreadcrumbOptions={rootBreadcrumbOptions}
                  onNavigate={setPathSegments}
                  onRequestDeleteFolder={() =>
                    mutations.setDeleteFolderConfirmOpen(true)
                  }
                  isDeleteFolderDisabled={
                    !canMutate ||
                    mutations.isDeletingFolder ||
                    mutations.isDeletingPhotos ||
                    mutations.isMovingPhotos
                  }
                />

                <FileListGroupActionBar
                  libraryIndex={libraryIndex}
                  canMutate={canMutate}
                  selectedForMoveSize={mutations.selectedForMove.size}
                  folderCount={folderCount}
                  visibleRowsLength={visibleRows.length}
                  missingThumbnailCount={missingThumbnailCount}
                  isMovingPhotos={mutations.isMovingPhotos}
                  isRenaming={mutations.isRenaming}
                  isDeletingPhotos={mutations.isDeletingPhotos}
                  isDeletingFolder={mutations.isDeletingFolder}
                  isGeneratingThumbnails={mutations.isGeneratingThumbnails}
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
                  onGenerateMissingThumbnails={() =>
                    void mutations.handleGenerateMissingThumbnails()
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

              <div
                ref={splitLayoutRef}
                className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-1.5 overflow-hidden lg:flex-row"
                style={
                  {
                    '--filelist-preview-width': `${previewPanelWidth}px`
                  } as CSSProperties
                }
              >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--app-surface)]">
                  <div className="border-b border-[var(--app-border)] px-2 py-1">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      이 폴더의 사진
                    </h3>
                  </div>
                  <FileListPhotoGrid
                    pathSegments={pathSegments}
                    folderCount={folderCount}
                    visibleRows={visibleRows}
                    outputRootForUrls={outputRootForUrls}
                    selectedPhotoId={selectedPhotoId}
                    onSelectPhoto={setSelectedPhotoId}
                    onOpenPhoto={(row) => void handleOpenPhoto(row)}
                    selectedForMove={mutations.selectedForMove}
                    onToggleMoveSelection={mutations.toggleMoveSelection}
                    hasMore={hasMore}
                    loadMoreSentinelRef={loadMoreSentinelRef}
                  />
                </div>

                <button
                  type="button"
                  aria-label="미리보기 너비 조절"
                  className="hidden shrink-0 cursor-col-resize rounded-full border border-[var(--app-border)] bg-[var(--app-surface)]/90 px-1 text-[10px] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-strong)] lg:block"
                  onMouseDown={handleStartPreviewResize}
                >
                  ⋮
                </button>

                <div className="min-h-0 min-w-0 lg:h-full lg:w-[var(--filelist-preview-width)] lg:flex-none">
                  <FileListPhotoPreviewPanel
                    selectedRow={selectedRow}
                    previewThumbUrl={previewThumbUrl}
                  />
                </div>
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
        moveProgress={mutations.moveProgress}
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
        renameProgress={mutations.renameProgress}
        renameTargetGroupId={mutations.renameTargetGroupId}
        renameNewTitle={mutations.renameNewTitle}
        groupsInCurrentFolder={groupsInCurrentFolder}
        renamePreviewSummary={renamePreviewSummary}
        renamePreviewRows={renamePreviewRows}
        hasPhotosOutsideCurrentFolder={renameScope.hasPhotosOutsideCurrentFolder}
        onRenameOverlayClick={() => {
          if (!mutations.isRenaming) {
            mutations.setRenameDialogOpen(false)
          }
        }}
        onRenameContentClick={(event) => event.stopPropagation()}
        onRenameTargetGroupIdChange={mutations.setRenameTargetGroupId}
        onRenameNewTitleChange={mutations.setRenameNewTitle}
        onRenameCancel={() => mutations.setRenameDialogOpen(false)}
        onRenameConfirm={() => void mutations.handleConfirmRename(renameScope)}
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
