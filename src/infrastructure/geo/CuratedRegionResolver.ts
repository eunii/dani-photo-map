import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import type { GeoPoint } from '@domain/value-objects/GeoPoint'

interface GeoBoundingRegion {
  name: string
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

const SPECIFIC_REGIONS: GeoBoundingRegion[] = [
  { name: 'seoul', minLatitude: 37.41, maxLatitude: 37.72, minLongitude: 126.73, maxLongitude: 127.27 },
  { name: 'incheon', minLatitude: 37.2, maxLatitude: 37.85, minLongitude: 126.3, maxLongitude: 126.85 },
  { name: 'busan', minLatitude: 35.03, maxLatitude: 35.39, minLongitude: 128.79, maxLongitude: 129.35 },
  { name: 'daegu', minLatitude: 35.73, maxLatitude: 36.02, minLongitude: 128.45, maxLongitude: 128.78 },
  { name: 'daejeon', minLatitude: 36.2, maxLatitude: 36.48, minLongitude: 127.28, maxLongitude: 127.53 },
  { name: 'gwangju', minLatitude: 35.05, maxLatitude: 35.24, minLongitude: 126.75, maxLongitude: 127.01 },
  { name: 'ulsan', minLatitude: 35.43, maxLatitude: 35.72, minLongitude: 129.14, maxLongitude: 129.47 },
  { name: 'sejong', minLatitude: 36.45, maxLatitude: 36.7, minLongitude: 127.15, maxLongitude: 127.35 },
  { name: 'jeju-do', minLatitude: 33.1, maxLatitude: 33.6, minLongitude: 126.1, maxLongitude: 126.95 },
  { name: 'gyeonggi-do', minLatitude: 36.9, maxLatitude: 38.3, minLongitude: 126.4, maxLongitude: 127.9 },
  { name: 'gangwon-do', minLatitude: 37.0, maxLatitude: 38.65, minLongitude: 127.0, maxLongitude: 129.4 },
  { name: 'chungcheongbuk-do', minLatitude: 36.0, maxLatitude: 37.3, minLongitude: 127.3, maxLongitude: 128.8 },
  { name: 'chungcheongnam-do', minLatitude: 35.95, maxLatitude: 37.2, minLongitude: 126.2, maxLongitude: 127.7 },
  { name: 'jeollabuk-do', minLatitude: 35.3, maxLatitude: 36.2, minLongitude: 126.5, maxLongitude: 127.9 },
  { name: 'jeollanam-do', minLatitude: 34.0, maxLatitude: 35.55, minLongitude: 125.0, maxLongitude: 127.6 },
  { name: 'gyeongsangbuk-do', minLatitude: 35.6, maxLatitude: 37.3, minLongitude: 128.0, maxLongitude: 129.6 },
  { name: 'gyeongsangnam-do', minLatitude: 34.6, maxLatitude: 35.9, minLongitude: 127.6, maxLongitude: 129.3 },
  { name: 'tokyo', minLatitude: 35.52, maxLatitude: 35.9, minLongitude: 139.56, maxLongitude: 139.96 },
  { name: 'osaka', minLatitude: 34.55, maxLatitude: 34.82, minLongitude: 135.3, maxLongitude: 135.7 },
  { name: 'kyoto', minLatitude: 34.87, maxLatitude: 35.18, minLongitude: 135.6, maxLongitude: 135.95 },
  { name: 'taipei', minLatitude: 24.94, maxLatitude: 25.22, minLongitude: 121.42, maxLongitude: 121.68 },
  { name: 'bangkok', minLatitude: 13.55, maxLatitude: 13.95, minLongitude: 100.3, maxLongitude: 100.9 },
  { name: 'singapore', minLatitude: 1.2, maxLatitude: 1.47, minLongitude: 103.6, maxLongitude: 104.05 },
  { name: 'hong-kong', minLatitude: 22.15, maxLatitude: 22.58, minLongitude: 113.82, maxLongitude: 114.45 }
]

const COUNTRY_REGIONS: GeoBoundingRegion[] = [
  { name: 'south-korea', minLatitude: 33.0, maxLatitude: 38.7, minLongitude: 124.5, maxLongitude: 131.0 },
  { name: 'japan', minLatitude: 24.0, maxLatitude: 46.5, minLongitude: 122.0, maxLongitude: 146.5 },
  { name: 'taiwan', minLatitude: 21.7, maxLatitude: 25.5, minLongitude: 119.8, maxLongitude: 122.2 },
  { name: 'thailand', minLatitude: 5.4, maxLatitude: 20.8, minLongitude: 97.1, maxLongitude: 105.7 },
  { name: 'vietnam', minLatitude: 8.1, maxLatitude: 23.5, minLongitude: 102.0, maxLongitude: 109.8 },
  { name: 'philippines', minLatitude: 4.5, maxLatitude: 21.5, minLongitude: 116.8, maxLongitude: 126.6 },
  { name: 'united-states', minLatitude: 24.0, maxLatitude: 49.5, minLongitude: -125.0, maxLongitude: -66.5 },
  { name: 'france', minLatitude: 41.0, maxLatitude: 51.5, minLongitude: -5.5, maxLongitude: 9.8 },
  { name: 'italy', minLatitude: 36.5, maxLatitude: 47.2, minLongitude: 6.0, maxLongitude: 18.8 },
  { name: 'united-kingdom', minLatitude: 49.8, maxLatitude: 59.5, minLongitude: -8.7, maxLongitude: 2.2 }
]

function isWithinRegion(gps: GeoPoint, region: GeoBoundingRegion): boolean {
  return (
    gps.latitude >= region.minLatitude &&
    gps.latitude <= region.maxLatitude &&
    gps.longitude >= region.minLongitude &&
    gps.longitude <= region.maxLongitude
  )
}

export class CuratedRegionResolver implements RegionResolverPort {
  constructor(private readonly fallbackResolver: RegionResolverPort) {}

  async resolveName(gps: GeoPoint): Promise<string> {
    const specificRegion = SPECIFIC_REGIONS.find((region) =>
      isWithinRegion(gps, region)
    )

    if (specificRegion) {
      return specificRegion.name
    }

    const countryRegion = COUNTRY_REGIONS.find((region) =>
      isWithinRegion(gps, region)
    )

    if (countryRegion) {
      return countryRegion.name
    }

    return this.fallbackResolver.resolveName(gps)
  }
}
