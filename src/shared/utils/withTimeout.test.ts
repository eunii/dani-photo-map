import { describe, expect, it } from 'vitest'

import { TimeoutError, withTimeout } from '@shared/utils/withTimeout'

describe('withTimeout', () => {
  it('resolves when the work finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(7), 50, 'fast')).resolves.toBe(7)
  })

  it('rejects when the work exceeds the limit', async () => {
    await expect(
      withTimeout(new Promise(() => undefined), 10, 'slow-op')
    ).rejects.toBeInstanceOf(TimeoutError)
  })
})
