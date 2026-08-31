import { useMemo } from 'react'

import { buildGroupAwarePhotoOutputRelativePath } from '@domain/services/GroupAwarePhotoNamingService'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { stripLeadingDateFromGroupTitle } from '@presentation/common/formatters/groupTitle'
import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import {
  folderRenameLabelWithoutDate,
  toPreviewTimestamp
} from '@presentation/renderer/pages/fileList/fileListPageFormat'
import { matchesOutputPath } from '@shared/utils/outputRelativePath'
import type { GroupSummary, LibraryIndexView } from '@shared/types/preload'

export interface UseFileListRenamePreviewOptions {
  outputRoot: string | undefined
  libraryIndex: LibraryIndexView | null
  pathSegments: string[]
  groupsAtPath: GroupSummary[]
  renameDialogOpen: boolean
  renameNewTitle: string
  renameTargetGroupId: string
}

export function useFileListRenamePreview({
  outputRoot,
  libraryIndex,
  pathSegments,
  groupsAtPath,
  renameDialogOpen,
  renameNewTitle,
  renameTargetGroupId
}: UseFileListRenamePreviewOptions) {
  const canRenameGroupFolderFromTree = pathSegments.length >= 3

  const groupsInCurrentFolder = useMemo(
    () =>
      groupsAtPath.map((group) => ({
        id: group.id,
        title: folderRenameLabelWithoutDate(
          group.title.trim().length > 0
            ? group.title
            : stripLeadingDateFromGroupTitle(group.displayTitle)
        )
      })),
    [groupsAtPath]
  )

  const renameTargetGroupSummary = useMemo(
    () => libraryIndex?.groups.find((group) => group.id === renameTargetGroupId),
    [libraryIndex, renameTargetGroupId]
  )

  // A group can span multiple output folders (e.g. a merged "week1" group
  // with photos from both March and May). "이름 변경" only renames the
  // photos actually in the folder being browsed — the rest of the group
  // stays under its old name — so we fetch the full group detail (only
  // while the dialog is open, not on every folder navigation) and split it
  // by path below.
  const { groupDetail } = useLibraryGroupDetail({
    outputRoot: libraryIndex?.outputRoot ?? outputRoot,
    group: renameDialogOpen ? renameTargetGroupSummary ?? null : null
  })

  const renameScope = useMemo(() => {
    if (!groupDetail || groupDetail.id !== renameTargetGroupId) {
      return { photoIdsInCurrentFolder: [] as string[], hasPhotosOutsideCurrentFolder: false }
    }

    const photoIdsInCurrentFolder: string[] = []
    let hasPhotosOutsideCurrentFolder = false

    for (const photo of groupDetail.photos) {
      if (matchesOutputPath(photo.outputRelativePath, pathSegments)) {
        photoIdsInCurrentFolder.push(photo.id)
      } else {
        hasPhotosOutsideCurrentFolder = true
      }
    }

    return { photoIdsInCurrentFolder, hasPhotosOutsideCurrentFolder }
  }, [groupDetail, renameTargetGroupId, pathSegments])

  const renamePreviewRows = useMemo(() => {
    if (!groupDetail || groupDetail.id !== renameTargetGroupId) {
      return []
    }

    const photoIdsInCurrentFolder = new Set(renameScope.photoIdsInCurrentFolder)
    const effectiveTitle = renameNewTitle.trim() || groupDetail.displayTitle

    return groupDetail.photos
      .filter((photo) => photoIdsInCurrentFolder.has(photo.id))
      .sort((left, right) => {
        const leftIso = left.capturedAtIso ?? ''
        const rightIso = right.capturedAtIso ?? ''

        if (leftIso !== rightIso) {
          return leftIso.localeCompare(rightIso)
        }

        return left.sourceFileName.localeCompare(right.sourceFileName)
      })
      .map((photo, index) => {
        const nextOutputRelativePath = buildGroupAwarePhotoOutputRelativePath(
          {
            sourceFileName: photo.sourceFileName,
            capturedAt: toPreviewTimestamp(photo.capturedAtIso),
            gps: photo.gps,
            regionName: photo.regionName,
            missingGpsCategory: photo.missingGpsCategory
          },
          effectiveTitle,
          index + 1,
          defaultOrganizationRules
        )

        return {
          photoId: photo.id,
          sourceFileName: photo.sourceFileName,
          currentOutputRelativePath: photo.outputRelativePath,
          nextOutputRelativePath,
          willChange: photo.outputRelativePath !== nextOutputRelativePath
        }
      })
  }, [groupDetail, renameNewTitle, renameTargetGroupId, renameScope])

  const renamePreviewSummary = useMemo(() => {
    const changedCount = renamePreviewRows.filter((row) => row.willChange).length

    return {
      changedCount,
      unchangedCount: Math.max(0, renamePreviewRows.length - changedCount)
    }
  }, [renamePreviewRows])

  return {
    canRenameGroupFolderFromTree,
    groupsInCurrentFolder,
    renamePreviewRows,
    renamePreviewSummary,
    renameScope
  }
}
