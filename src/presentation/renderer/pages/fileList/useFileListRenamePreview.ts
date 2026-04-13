import { useMemo } from 'react'

import { buildGroupAwarePhotoOutputRelativePath } from '@domain/services/GroupAwarePhotoNamingService'
import { defaultOrganizationRules } from '@domain/policies/OrganizationRules'
import { stripLeadingDateFromGroupTitle } from '@presentation/common/formatters/groupTitle'
import {
  folderRenameLabelWithoutDate,
  toPreviewTimestamp
} from '@presentation/renderer/pages/fileList/fileListPageFormat'
import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'
import type { GroupDetail, GroupSummary } from '@shared/types/preload'

export interface UseFileListRenamePreviewOptions {
  pathSegments: string[]
  groupAtPath: GroupSummary | undefined
  groupDetail: GroupDetail | null
  rowsInFolder: FlatPhotoRow[]
  renameNewTitle: string
  renameTargetGroupId: string
}

export function useFileListRenamePreview({
  pathSegments,
  groupAtPath,
  groupDetail,
  rowsInFolder,
  renameNewTitle,
  renameTargetGroupId
}: UseFileListRenamePreviewOptions) {
  const canRenameGroupFolderFromTree = pathSegments.length >= 3

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

  return {
    canRenameGroupFolderFromTree,
    groupsInCurrentFolder,
    renamePreviewRows,
    renamePreviewSummary
  }
}
