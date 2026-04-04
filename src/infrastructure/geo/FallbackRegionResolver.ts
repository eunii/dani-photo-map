import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import type { GeoPoint } from '@domain/value-objects/GeoPoint'

export class FallbackRegionResolver implements RegionResolverPort {
  constructor(private readonly fallbackName = 'base') {}

  async resolveName(_gps: GeoPoint): Promise<string> {
    return this.fallbackName
  }
}
