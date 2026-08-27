import type { PhotoLibraryFileSystemPort } from '@application/ports/PhotoLibraryFileSystemPort'
import { movePhotosIntoGroup } from '@application/services/movePhotosIntoGroup'
import type { LibraryIndex } from '@domain/entities/LibraryIndex'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'

export function normalizeMergeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ')
}

/**
 * 같은 제목(title)을 가진 그룹을 하나로 합칩니다.
 * 이미 저장돼 있던 그룹(이번 실행에서 새로 들어온 사진이 아닌 쪽)을 목적지로
 * 우선하고, 그다음 대표 GPS·사진 수·id 순입니다.
 */
export async function mergeGroupsByMatchingTitle(params: {
  index: LibraryIndex
  outputRoot: string
  fileSystem: Pick<
    PhotoLibraryFileSystemPort,
    'ensureDirectory' | 'listDirectoryFileNames' | 'moveFile'
  >
  rules: OrganizationRules
  /** 이번 저장에서 새로 복사된 사진. 있으면 기존 그룹을 합치기 목적지로 유지합니다. */
  incomingPhotoIds?: ReadonlySet<string>
}): Promise<LibraryIndex> {
  const { fileSystem, incomingPhotoIds, index, outputRoot, rules } = params
  const incomingIds = incomingPhotoIds ?? new Set<string>()
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

    const existingPhotoCount = (group: (typeof groups)[number]): number =>
      group.photoIds.filter((photoId) => !incomingIds.has(photoId)).length

    const sorted = [...groups].sort((a, b) => {
      const existingDelta = existingPhotoCount(b) - existingPhotoCount(a)

      if (existingDelta !== 0) {
        return existingDelta
      }

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
