import { useMemo, useState } from 'react'

import {
  DEST_CUSTOM,
  DEST_YEAR_MONTH_ONLY
} from '@presentation/renderer/pages/fileList/fileListPageConstants'
import { folderLabelMatches } from '@presentation/renderer/pages/fileList/fileListPageFormat'
import {
  findFirstGroupIdUnderSubfolder as findFirstGroupIdUnderSummaryPath,
  listSubfoldersAtPath as listGroupSubfoldersAtPath
} from '@presentation/renderer/view-models/groupFolderNavigation'
import { formatPathSegmentLabel } from '@presentation/renderer/view-models/outputPathNavigation'
import type { GroupSummary } from '@shared/types/preload'

export interface MoveDestinationFolderOption {
  groupId: string
  segment: string
  label: string
  photoCount: number
}

export function useFileListMoveDestination(
  groups: GroupSummary[],
  pathSegments: string[]
) {
  const [destinationSelect, setDestinationSelect] = useState('')
  const [manualDestinationFolder, setManualDestinationFolder] = useState('')

  const moveDestinationUsesChildFolders = pathSegments.length < 3

  const destinationListContextLabel = useMemo(() => {
    if (moveDestinationUsesChildFolders) {
      if (pathSegments.length === 0) {
        return '홈'
      }
      return pathSegments.map(formatPathSegmentLabel).join(' > ')
    }
    if (pathSegments.length <= 1) {
      return '홈'
    }
    return pathSegments
      .slice(0, -1)
      .map(formatPathSegmentLabel)
      .join(' > ')
  }, [pathSegments, moveDestinationUsesChildFolders])

  const moveDestinationFolderOptions = useMemo(() => {
    const listBasePath = moveDestinationUsesChildFolders
      ? pathSegments
      : pathSegments.length > 0
        ? pathSegments.slice(0, -1)
        : ([] as string[])
    const entries = listGroupSubfoldersAtPath(groups, listBasePath)
    const out: MoveDestinationFolderOption[] = []
    for (const entry of entries) {
      const groupId = findFirstGroupIdUnderSummaryPath(
        groups,
        listBasePath,
        entry.segment
      )
      if (groupId) {
        out.push({
          groupId,
          segment: entry.segment,
          label: entry.displayLabel,
          photoCount: entry.photoCount
        })
      }
    }
    return out
  }, [groups, pathSegments, moveDestinationUsesChildFolders])

  function applyDestinationFromSelect(value: string): void {
    if (value === '') {
      setDestinationSelect('')
      setManualDestinationFolder('')
      return
    }
    if (value === DEST_YEAR_MONTH_ONLY) {
      setDestinationSelect(DEST_YEAR_MONTH_ONLY)
      setManualDestinationFolder('')
      return
    }
    const item = moveDestinationFolderOptions.find((i) => i.groupId === value)
    setDestinationSelect(value)
    setManualDestinationFolder(item?.label ?? '')
  }

  function handleManualDestinationInput(value: string): void {
    setManualDestinationFolder(value)
    const trimmed = value.trim()
    if (!trimmed) {
      setDestinationSelect('')
      return
    }
    const match = moveDestinationFolderOptions.find((item) =>
      folderLabelMatches(trimmed, item.label)
    )
    if (match) {
      setDestinationSelect(match.groupId)
      return
    }
    setDestinationSelect(DEST_CUSTOM)
  }

  return {
    moveDestinationUsesChildFolders,
    destinationListContextLabel,
    moveDestinationFolderOptions,
    destinationSelect,
    setDestinationSelect,
    manualDestinationFolder,
    setManualDestinationFolder,
    applyDestinationFromSelect,
    handleManualDestinationInput
  }
}
