import { describe, expect, it } from 'vitest'

import { buildGroupTitleSuggestions } from '@presentation/renderer/view-models/groupTitleSuggestions'
import { createGroupDetailFixture } from '@/test/factories/createGroupDetailFixture'

describe('groupTitleSuggestions', () => {
  it('returns nearby group titles ordered by distance', () => {
    const currentGroup = createGroupDetailFixture({
      id: 'current',
      title: '현재 그룹',
      representativeGps: {
        latitude: 37.5665,
        longitude: 126.978
      }
    })
    const suggestions = buildGroupTitleSuggestions(currentGroup, [
      currentGroup,
      createGroupDetailFixture({
        id: 'nearby',
        title: '서울 산책',
        representativeGps: {
          latitude: 37.567,
          longitude: 126.979
        }
      }),
      createGroupDetailFixture({
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
