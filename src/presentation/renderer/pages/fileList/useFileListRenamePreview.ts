import { useMemo } from 'react'

import { buildGroupAwarePhotoOutputRelativePath } from '@domain/services/GroupAwarePhotoNamingService'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { stripLeadingDateFromGroupTitle } from '@presentation/common/formatters/groupTitle'
import { useLibraryGroupDetail } from '@presentation/renderer/hooks/useLibraryGroupDetail'
import {
  folderRenameLabelWithoutDate,
  toPreviewTimestamp
} from '@presentation/renderer/pages/fileList/fileListPageFormat'
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

  // Renaming applies to the whole group, wherever its photos physically live
  // (a group can span multiple output folders, which is the exact bug this
  // page's tree/grid fix addresses), so the preview is fetched for the full
  // group detail rather than just the photos in the current folder — and only
  // while the dialog is actually open, not on every folder navigation.
  const { groupDetail } = useLibraryGroupDetail({
    outputRoot: libraryIndex?.outputRoot ?? outputRoot,
    group: renameDialogOpen ? renameTargetGroupSummary ?? null : null
  })

  const renamePreviewRows = useMemo(() => {
    if (!groupDetail || groupDetail.id !== renameTargetGroupId) {
      return []
    }

    const effectiveTitle = renameNewTitle.trim() || groupDetail.displayTitle

    return [...groupDetail.photos]
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
  }, [groupDetail, renameNewTitle, renameTargetGroupId])

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
    renamePreviewSummary
  }
}
