import type { GroupDetail } from '@shared/types/preload'

export type GroupSortOption = 'recent' | 'title' | 'photo-count'

export interface GroupExplorerViewModel {
  mappedGroups: GroupDetail[]
  unmappedGroups: GroupDetail[]
}

function getLatestCapturedAtIso(group: GroupDetail): string {
  return group.photos
    .map((photo) => photo.capturedAtIso ?? '')
    .sort()
    .at(-1) ?? ''
}

function compareGroupsBySortOption(
  left: GroupDetail,
  right: GroupDetail,
  sortOption: GroupSortOption
): number {
  switch (sortOption) {
    case 'photo-count':
      if (left.photoCount !== right.photoCount) {
        return right.photoCount - left.photoCount
      }

      return left.title.localeCompare(right.title)
    case 'title':
      return left.title.localeCompare(right.title)
    case 'recent':
    default: {
      const leftLatestCapturedAt = getLatestCapturedAtIso(left)
      const rightLatestCapturedAt = getLatestCapturedAtIso(right)

      if (leftLatestCapturedAt !== rightLatestCapturedAt) {
        return rightLatestCapturedAt.localeCompare(leftLatestCapturedAt)
      }

      return left.title.localeCompare(right.title)
    }
  }
}

export function buildGroupExplorerViewModel(
  groups: GroupDetail[],
  sortOption: GroupSortOption
): GroupExplorerViewModel {
  const sortedGroups = [...groups].sort((left, right) =>
    compareGroupsBySortOption(left, right, sortOption)
  )

  return {
    mappedGroups: sortedGroups.filter((group) => Boolean(group.representativeGps)),
    unmappedGroups: sortedGroups.filter((group) => !group.representativeGps)
  }
}
