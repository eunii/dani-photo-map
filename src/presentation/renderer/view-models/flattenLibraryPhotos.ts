import type { GroupDetail, GroupPhotoSummary } from '@shared/types/preload'

export type PhotoListSortOption = 'captured-desc' | 'filename-asc'

export interface FlatPhotoRow {
  photo: GroupPhotoSummary
  groupId: string
  groupDisplayTitle: string
}

/** One row per photo; skips duplicate photo ids if they ever appear in multiple groups. */
export function flattenLibraryGroupsToPhotos(groups: GroupDetail[]): FlatPhotoRow[] {
  const seen = new Set<string>()
  const rows: FlatPhotoRow[] = []

  for (const group of groups) {
    for (const photo of group.photos) {
      if (seen.has(photo.id)) {
        continue
      }
      seen.add(photo.id)
      rows.push({
        photo,
        groupId: group.id,
        groupDisplayTitle: group.displayTitle
      })
    }
  }

  return rows
}

export function sortFlatPhotoRows(
  rows: FlatPhotoRow[],
  sort: PhotoListSortOption
): FlatPhotoRow[] {
  const copy = [...rows]

  if (sort === 'filename-asc') {
    copy.sort((a, b) =>
      a.photo.sourceFileName.localeCompare(b.photo.sourceFileName, undefined, {
        sensitivity: 'base'
      })
    )
    return copy
  }

  copy.sort((a, b) => {
    const ta = a.photo.capturedAtIso ? Date.parse(a.photo.capturedAtIso) : NaN
    const tb = b.photo.capturedAtIso ? Date.parse(b.photo.capturedAtIso) : NaN
    const aOk = !Number.isNaN(ta)
    const bOk = !Number.isNaN(tb)
    if (aOk && bOk && ta !== tb) {
      return tb - ta
    }
    if (aOk !== bOk) {
      return aOk ? -1 : 1
    }
    return a.photo.sourceFileName.localeCompare(b.photo.sourceFileName, undefined, {
      sensitivity: 'base'
    })
  })

  return copy
}
