import { describe, expect, it } from 'vitest'

import { createRunLogFileName } from '@shared/logging/appLog'

describe('createRunLogFileName', () => {
  it('builds a windows-safe timestamped file name per run kind', () => {
    const at = new Date('2026-08-27T14:05:09.007Z')

    expect(createRunLogFileName('preview', at)).toMatch(
      /^\d{8}-\d{6}-\d{3}-preview\.log$/
    )
    expect(createRunLogFileName('scan', at)).toContain('-scan.log')
    expect(createRunLogFileName('Preview Save!', at)).toContain('-previewsave.log')
  })
})
