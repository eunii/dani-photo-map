import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import type { GeoPoint } from '@domain/value-objects/GeoPoint'

export class FallbackRegionResolver implements RegionResolverPort {
  constructor(private readonly fallbackName = 'location-unknown') {}

  async resolveName(_gps: GeoPoint): Promise<string> {
    return this.fallbackName
  }
}
