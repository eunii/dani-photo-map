import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import type { GeoPoint } from '@domain/value-objects/GeoPoint'

function createCacheKey(gps: GeoPoint, precision: number): string {
  return `${gps.latitude.toFixed(precision)},${gps.longitude.toFixed(precision)}`
}

export class CachedRegionResolver implements RegionResolverPort {
  private readonly cache = new Map<string, string>()

  constructor(
    private readonly regionResolver: RegionResolverPort,
    private readonly precision = 2
  ) {}

  async resolveName(gps: GeoPoint): Promise<string> {
    const cacheKey = createCacheKey(gps, this.precision)
    const cachedValue = this.cache.get(cacheKey)

    if (cachedValue) {
      return cachedValue
    }

    const resolvedName = await this.regionResolver.resolveName(gps)

    this.cache.set(cacheKey, resolvedName)

    return resolvedName
  }
}
