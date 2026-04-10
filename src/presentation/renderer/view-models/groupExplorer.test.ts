import { describe, expect, it } from 'vitest'

import { buildGroupExplorerViewModel } from '@presentation/renderer/view-models/groupExplorer'
import { createGroupDetailFixture } from '@/test/factories/createGroupDetailFixture'

describe('groupExplorer view model', () => {
  it('partitions mapped and unmapped groups', () => {
    const viewModel = buildGroupExplorerViewModel(
      [
        createGroupDetailFixture({
          id: 'mapped',
          title: 'Mapped',
          representativeGps: { latitude: 37.5, longitude: 127.0 }
        }),
        createGroupDetailFixture({
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
        createGroupDetailFixture({
          id: 'older',
          title: 'Older',
          representativeGps: { latitude: 37.5, longitude: 127.0 },
          photos: [{ id: 'p1', sourceFileName: 'a.jpg', capturedAtIso: '2024-01-01T10:00:00.000Z', hasGps: true }]
        }),
        createGroupDetailFixture({
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
