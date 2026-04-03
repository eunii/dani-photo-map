import { describe, expect, it, vi } from 'vitest'

import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import { CachedRegionResolver } from '@infrastructure/geo/CachedRegionResolver'
import { CuratedRegionResolver } from '@infrastructure/geo/CuratedRegionResolver'

describe('CuratedRegionResolver', () => {
  it('resolves a curated metropolitan region when coordinates match', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('location-unknown')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: 37.5665,
        longitude: 126.978
      })
    ).resolves.toBe('seoul')
  })

  it('falls back to a broader country-level region when no detailed box matches', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('location-unknown')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: 35.6762,
        longitude: 140.1
      })
    ).resolves.toBe('japan')
  })

  it('delegates to the fallback resolver when no curated region matches', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('location-unknown')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: -33.8688,
        longitude: 151.2093
      })
    ).resolves.toBe('location-unknown')
    expect(fallbackResolver.resolveName).toHaveBeenCalledOnce()
  })
})

describe('CachedRegionResolver', () => {
  it('reuses cached values for nearby identical rounded coordinates', async () => {
    const innerResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('seoul')
    }
    const resolver = new CachedRegionResolver(innerResolver, 2)

    await expect(
      resolver.resolveName({
        latitude: 37.56654,
        longitude: 126.97801
      })
    ).resolves.toBe('seoul')
    await expect(
      resolver.resolveName({
        latitude: 37.56651,
        longitude: 126.97804
      })
    ).resolves.toBe('seoul')

    expect(innerResolver.resolveName).toHaveBeenCalledOnce()
  })
})
