import { describe, expect, it, vi } from 'vitest'

import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import { CachedRegionResolver } from '@infrastructure/geo/CachedRegionResolver'
import { CuratedRegionResolver } from '@infrastructure/geo/CuratedRegionResolver'

describe('CuratedRegionResolver', () => {
  it('resolves a curated metropolitan region when coordinates match', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('base')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: 37.5665,
        longitude: 126.978
      })
    ).resolves.toBe('seoul-jongno-gu')
  })

  it('falls back to a broader country-level region when no detailed box matches', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('base')
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
      resolveName: vi.fn().mockResolvedValue('base')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: -33.8688,
        longitude: 151.2093
      })
    ).resolves.toBe('base')
    expect(fallbackResolver.resolveName).toHaveBeenCalledOnce()
  })
})

describe('CachedRegionResolver', () => {
  it('reuses cached values for nearby identical rounded coordinates', async () => {
    const innerResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('seoul-jongno-gu')
    }
    const resolver = new CachedRegionResolver(innerResolver, 2)

    await expect(
      resolver.resolveName({
        latitude: 37.56654,
        longitude: 126.97801
      })
    ).resolves.toBe('seoul-jongno-gu')
    await expect(
      resolver.resolveName({
        latitude: 37.56651,
        longitude: 126.97804
      })
    ).resolves.toBe('seoul-jongno-gu')

    expect(innerResolver.resolveName).toHaveBeenCalledOnce()
  })
})

describe('CuratedRegionResolver finer regions', () => {
  it('resolves Gangwon inje-gun', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('base')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: 38.07,
        longitude: 128.17
      })
    ).resolves.toBe('inje-gun')
  })

  it('resolves Gyeonggi city before province', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('base')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: 37.27,
        longitude: 127.0
      })
    ).resolves.toBe('suwon-si')
  })

  it('resolves US city before state', async () => {
    const fallbackResolver: RegionResolverPort = {
      resolveName: vi.fn().mockResolvedValue('base')
    }
    const resolver = new CuratedRegionResolver(fallbackResolver)

    await expect(
      resolver.resolveName({
        latitude: 40.71,
        longitude: -74.0
      })
    ).resolves.toBe('new-york-city')
  })
})
