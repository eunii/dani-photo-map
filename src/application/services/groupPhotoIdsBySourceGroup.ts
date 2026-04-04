import type { LibraryIndex } from '@domain/entities/LibraryIndex'

/**
 * 인덱스에서 각 사진이 속한 그룹 id별로 묶습니다. (파일 목록 등 다중 소스 이동용)
 */
export function groupPhotoIdsBySourceGroup(
  index: LibraryIndex,
  photoIds: string[]
): Map<string, string[]> {
  const unique = Array.from(new Set(photoIds))
  const map = new Map<string, string[]>()

  for (const photoId of unique) {
    const group = index.groups.find((g) => g.photoIds.includes(photoId))

    if (!group) {
      throw new Error(`사진이 어느 그룹에도 없습니다: ${photoId}`)
    }

    const list = map.get(group.id) ?? []

    list.push(photoId)
    map.set(group.id, list)
  }

  return map
}
