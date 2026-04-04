import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import { movePhotosIntoGroup } from '@application/services/movePhotosIntoGroup'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'

export function normalizeMergeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ')
}

/**
 * 같은 제목(title)을 가진 그룹을 하나로 합칩니다. 대표 GPS가 있는 그룹을
 * 우선 목적지로 하고, 모두 GPS가 없으면 사진 수·id 순으로 목적지를 고릅니다.
 */
export async function mergeGroupsByMatchingTitle(params: {
  index: LibraryIndex
  outputRoot: string
  fileSystem: Pick<
    PhotoLibraryFileSystemPort,
    'ensureDirectory' | 'listDirectoryFileNames' | 'moveFile'
  >
  rules: OrganizationRules
}): Promise<LibraryIndex> {
  const { fileSystem, index, outputRoot, rules } = params
  const byTitle = new Map<string, typeof index.groups>()

  for (const group of index.groups) {
    const key = normalizeMergeTitle(group.title)

    if (!key) {
      continue
    }

    const list = byTitle.get(key) ?? []

    list.push(group)
    byTitle.set(key, list)
  }

  let next = index

  for (const [, groups] of byTitle) {
    if (groups.length < 2) {
      continue
    }

    const sorted = [...groups].sort((a, b) => {
      const aG = a.representativeGps ? 1 : 0
      const bG = b.representativeGps ? 1 : 0

      if (aG !== bG) {
        return bG - aG
      }

      if (b.photoIds.length !== a.photoIds.length) {
        return b.photoIds.length - a.photoIds.length
      }

      return a.id.localeCompare(b.id)
    })

    const dest = sorted[0]

    if (!dest) {
      continue
    }

    for (const source of sorted.slice(1)) {
      const currentDest = next.groups.find((group) => group.id === dest.id)
      const currentSource = next.groups.find((group) => group.id === source.id)

      if (
        !currentDest ||
        !currentSource ||
        currentSource.photoIds.length === 0 ||
        currentDest.id === currentSource.id
      ) {
        continue
      }

      next = await movePhotosIntoGroup({
        index: next,
        outputRoot,
        sourceGroupId: currentSource.id,
        destinationGroupId: currentDest.id,
        photoIds: currentSource.photoIds,
        fileSystem,
        rules,
        allowDestinationWithoutGps: !currentDest.representativeGps
      })
    }
  }

  return next
}
