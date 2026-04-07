import { describe, expect, it } from 'vitest'

import { getLoadSourceBadge } from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'

describe('getLoadSourceBadge', () => {
  it('returns a dedicated badge for folder-structure mode', () => {
    expect(getLoadSourceBadge('folder-structure')).toMatchObject({
      label: '폴더 구조 기반'
    })
  })

  it('keeps the existing fallback badge', () => {
    expect(getLoadSourceBadge('fallback')).toMatchObject({
      label: '복구 기반'
    })
  })

  it('does not show a badge for merged source', () => {
    expect(getLoadSourceBadge('merged')).toBeNull()
  })
})
