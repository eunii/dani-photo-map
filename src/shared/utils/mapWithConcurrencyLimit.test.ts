import { describe, expect, it, vi } from 'vitest'

import { mapWithConcurrencyLimit } from '@shared/utils/mapWithConcurrencyLimit'

describe('mapWithConcurrencyLimit', () => {
  it('preserves input order while running with limited concurrency', async () => {
    const values = [1, 2, 3, 4]

    const results = await mapWithConcurrencyLimit(values, 2, async (value) => {
      await Promise.resolve()
      return value * 10
    })

    expect(results).toEqual([10, 20, 30, 40])
  })

  it('never runs more workers than the configured limit', async () => {
    let running = 0
    let maxRunning = 0

    await mapWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async (value) => {
      running += 1
      maxRunning = Math.max(maxRunning, running)

      await new Promise((resolve) => setTimeout(resolve, value === 1 ? 10 : 1))

      running -= 1
      return value
    })

    expect(maxRunning).toBeLessThanOrEqual(2)
  })

  it('rejects invalid limits', async () => {
    await expect(
      mapWithConcurrencyLimit([1], 0, async (value) => value)
    ).rejects.toThrow('Concurrency limit must be a positive integer.')
  })

  it('supports empty input without calling the worker', async () => {
    const worker = vi.fn(async (value: number) => value)

    const results = await mapWithConcurrencyLimit([], 2, worker)

    expect(results).toEqual([])
    expect(worker).not.toHaveBeenCalled()
  })
})
