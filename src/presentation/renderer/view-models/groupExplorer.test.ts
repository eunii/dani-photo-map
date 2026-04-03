import { describe, expect, it } from 'vitest'

import type { GroupDetail } from '@shared/types/preload'
import { buildGroupExplorerViewModel } from '@presentation/renderer/view-models/groupExplorer'

function createGroupDetail(overrides: Partial<GroupDetail> & Pick<GroupDetail, 'id' | 'title'>): GroupDetail {
  return {
    id: overrides.id,
    groupKey: overrides.groupKey ?? overrides.id,
    title: overrides.title,
    displayTitle: overrides.displayTitle ?? overrides.title,
    photoCount: overrides.photoCount ?? 1,
    photoIds: overrides.photoIds ?? ['photo-1'],
    representativePhotoId: overrides.representativePhotoId,
    representativeThumbnailRelativePath: overrides.representativeThumbnailRelativePath,
    representativeGps: overrides.representativeGps,
    companions: overrides.companions ?? [],
    notes: overrides.notes,
    photos: overrides.photos ?? []
  }
}

describe('groupExplorer view model', () => {
  it('partitions mapped and unmapped groups', () => {
    const viewModel = buildGroupExplorerViewModel(
      [
        createGroupDetail({
          id: 'mapped',
          title: 'Mapped',
          representativeGps: { latitude: 37.5, longitude: 127.0 }
        }),
        createGroupDetail({
          id: 'unmapped',
          title: 'Unmapped'
        })
      ],
      'title'
    )

    expect(viewModel.mappedGroups.map((group) => group.id)).toEqual(['mapped'])
    expect(viewModel.unmappedGroups.map((group) => group.id)).toEqual(['unmapped'])
  })

  it('sorts by most recent captured photo when recent sort is selected', () => {
    const viewModel = buildGroupExplorerViewModel(
      [
        createGroupDetail({
          id: 'older',
          title: 'Older',
          representativeGps: { latitude: 37.5, longitude: 127.0 },
          photos: [{ id: 'p1', sourceFileName: 'a.jpg', capturedAtIso: '2024-01-01T10:00:00.000Z', hasGps: true }]
        }),
        createGroupDetail({
          id: 'newer',
          title: 'Newer',
          representativeGps: { latitude: 37.5, longitude: 127.0 },
          photos: [{ id: 'p2', sourceFileName: 'b.jpg', capturedAtIso: '2025-01-01T10:00:00.000Z', hasGps: true }]
        })
      ],
      'recent'
    )

    expect(viewModel.mappedGroups.map((group) => group.id)).toEqual(['newer', 'older'])
  })
})
