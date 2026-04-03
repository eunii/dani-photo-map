import { describe, expect, it } from 'vitest'

import type { GroupDetail } from '@shared/types/preload'
import { buildGroupTitleSuggestions } from '@presentation/renderer/view-models/groupTitleSuggestions'

function createGroupDetail(
  overrides: Partial<GroupDetail> & Pick<GroupDetail, 'id' | 'title'>
): GroupDetail {
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

describe('groupTitleSuggestions', () => {
  it('returns nearby group titles ordered by distance', () => {
    const currentGroup = createGroupDetail({
      id: 'current',
      title: '현재 그룹',
      representativeGps: {
        latitude: 37.5665,
        longitude: 126.978
      }
    })
    const suggestions = buildGroupTitleSuggestions(currentGroup, [
      currentGroup,
      createGroupDetail({
        id: 'nearby',
        title: '서울 산책',
        representativeGps: {
          latitude: 37.567,
          longitude: 126.979
        }
      }),
      createGroupDetail({
        id: 'far',
        title: '부산 여행',
        representativeGps: {
          latitude: 35.1796,
          longitude: 129.0756
        }
      })
    ])

    expect(suggestions).toEqual(['서울 산책'])
  })
})
