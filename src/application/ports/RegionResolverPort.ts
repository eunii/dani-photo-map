import type { GeoPoint } from '@domain/value-objects/GeoPoint'

export interface RegionResolverPort {
  resolveName(gps: GeoPoint): Promise<string>
}
