import type { RegionResolverPort } from '@application/ports/RegionResolverPort'
import type { GeoPoint } from '@domain/value-objects/GeoPoint'
import { GYEONGGI_MUNICIPAL_REGIONS } from '@infrastructure/geo/gyeonggiMunicipalityRegions'
import { SOUTH_KOREA_MUNICIPAL_REGIONS } from '@infrastructure/geo/southKoreaMunicipalRegions'

interface GeoBoundingRegion {
  name: string
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

/** 서울 자치구(시·구 단위). 경계 인접 구는 순서에 따라 먼저 매칭됩니다. */
const SEOUL_GU_REGIONS: GeoBoundingRegion[] = [
  { name: 'seoul-jongno-gu', minLatitude: 37.55, maxLatitude: 37.61, minLongitude: 126.96, maxLongitude: 127.02 },
  { name: 'seoul-jung-gu', minLatitude: 37.55, maxLatitude: 37.57, minLongitude: 126.98, maxLongitude: 127.02 },
  { name: 'seoul-yongsan-gu', minLatitude: 37.52, maxLatitude: 37.56, minLongitude: 126.95, maxLongitude: 127.02 },
  { name: 'seoul-gangnam-gu', minLatitude: 37.47, maxLatitude: 37.53, minLongitude: 127.02, maxLongitude: 127.09 },
  { name: 'seoul-seocho-gu', minLatitude: 37.46, maxLatitude: 37.51, minLongitude: 126.97, maxLongitude: 127.04 },
  { name: 'seoul-songpa-gu', minLatitude: 37.48, maxLatitude: 37.52, minLongitude: 127.09, maxLongitude: 127.15 },
  { name: 'seoul-gangdong-gu', minLatitude: 37.52, maxLatitude: 37.56, minLongitude: 127.11, maxLongitude: 127.18 },
  { name: 'seoul-mapo-gu', minLatitude: 37.53, maxLatitude: 37.59, minLongitude: 126.88, maxLongitude: 126.97 },
  { name: 'seoul-yangcheon-gu', minLatitude: 37.51, maxLatitude: 37.54, minLongitude: 126.85, maxLongitude: 126.89 },
  { name: 'seoul-gangseo-gu', minLatitude: 37.54, maxLatitude: 37.59, minLongitude: 126.79, maxLongitude: 126.88 },
  { name: 'seoul-eunpyeong-gu', minLatitude: 37.59, maxLatitude: 37.65, minLongitude: 126.91, maxLongitude: 126.98 },
  { name: 'seoul-seongbuk-gu', minLatitude: 37.58, maxLatitude: 37.62, minLongitude: 127.0, maxLongitude: 127.06 },
  { name: 'seoul-gangbuk-gu', minLatitude: 37.63, maxLatitude: 37.67, minLongitude: 127.0, maxLongitude: 127.05 },
  { name: 'seoul-dobong-gu', minLatitude: 37.66, maxLatitude: 37.69, minLongitude: 127.02, maxLongitude: 127.06 },
  { name: 'seoul-nowon-gu', minLatitude: 37.64, maxLatitude: 37.68, minLongitude: 127.05, maxLongitude: 127.1 },
  { name: 'seoul-jungnang-gu', minLatitude: 37.58, maxLatitude: 37.61, minLongitude: 127.08, maxLongitude: 127.11 },
  { name: 'seoul-seongdong-gu', minLatitude: 37.54, maxLatitude: 37.57, minLongitude: 127.02, maxLongitude: 127.07 },
  { name: 'seoul-dongdaemun-gu', minLatitude: 37.56, maxLatitude: 37.59, minLongitude: 127.02, maxLongitude: 127.07 },
  { name: 'seoul-gwangjin-gu', minLatitude: 37.54, maxLatitude: 37.56, minLongitude: 127.07, maxLongitude: 127.12 },
  { name: 'seoul-gwanak-gu', minLatitude: 37.46, maxLatitude: 37.5, minLongitude: 126.94, maxLongitude: 127.02 },
  { name: 'seoul-dongjak-gu', minLatitude: 37.49, maxLatitude: 37.51, minLongitude: 126.93, maxLongitude: 126.99 },
  { name: 'seoul-geumcheon-gu', minLatitude: 37.44, maxLatitude: 37.47, minLongitude: 126.88, maxLongitude: 126.91 },
  { name: 'seoul-guro-gu', minLatitude: 37.48, maxLatitude: 37.51, minLongitude: 126.82, maxLongitude: 126.88 },
  { name: 'seoul-yeongdeungpo-gu', minLatitude: 37.51, maxLatitude: 37.54, minLongitude: 126.89, maxLongitude: 126.94 },
  { name: 'seoul-seodaemun-gu', minLatitude: 37.56, maxLatitude: 37.58, minLongitude: 126.93, maxLongitude: 126.97 }
]

/** 미국 주요 도시(주(state) 박스보다 먼저 매칭). */
const US_CITY_REGIONS: GeoBoundingRegion[] = [
  { name: 'new-york-city', minLatitude: 40.48, maxLatitude: 40.92, minLongitude: -74.26, maxLongitude: -73.7 },
  { name: 'los-angeles', minLatitude: 33.7, maxLatitude: 34.35, minLongitude: -118.7, maxLongitude: -118.15 },
  { name: 'san-francisco', minLatitude: 37.7, maxLatitude: 37.83, minLongitude: -122.52, maxLongitude: -122.35 },
  { name: 'chicago', minLatitude: 41.64, maxLatitude: 42.05, minLongitude: -87.95, maxLongitude: -87.52 },
  { name: 'seattle', minLatitude: 47.45, maxLatitude: 47.75, minLongitude: -122.45, maxLongitude: -122.25 },
  { name: 'miami', minLatitude: 25.6, maxLatitude: 25.87, minLongitude: -80.35, maxLongitude: -80.05 }
]

/** 미국 주(대략적 경계). 도시 박스에 안 걸리면 주 단위. */
const US_STATE_REGIONS: GeoBoundingRegion[] = [
  { name: 'california', minLatitude: 32.5, maxLatitude: 42.0, minLongitude: -124.5, maxLongitude: -114.0 },
  { name: 'texas', minLatitude: 25.8, maxLatitude: 36.5, minLongitude: -106.7, maxLongitude: -93.5 },
  { name: 'florida', minLatitude: 24.5, maxLatitude: 31.0, minLongitude: -87.6, maxLongitude: -80.0 },
  { name: 'new-york-state', minLatitude: 40.5, maxLatitude: 45.0, minLongitude: -79.8, maxLongitude: -71.9 },
  { name: 'washington-state', minLatitude: 45.5, maxLatitude: 49.0, minLongitude: -124.8, maxLongitude: -116.9 },
  { name: 'illinois', minLatitude: 36.9, maxLatitude: 42.5, minLongitude: -91.5, maxLongitude: -87.0 },
  { name: 'colorado', minLatitude: 36.9, maxLatitude: 41.0, minLongitude: -109.1, maxLongitude: -102.0 },
  { name: 'arizona', minLatitude: 31.3, maxLatitude: 37.0, minLongitude: -114.8, maxLongitude: -109.0 }
]

const SPECIFIC_REGIONS: GeoBoundingRegion[] = [
  ...SEOUL_GU_REGIONS,
  { name: 'seoul', minLatitude: 37.41, maxLatitude: 37.72, minLongitude: 126.73, maxLongitude: 127.27 },
  ...GYEONGGI_MUNICIPAL_REGIONS,
  ...SOUTH_KOREA_MUNICIPAL_REGIONS,
  { name: 'incheon', minLatitude: 37.2, maxLatitude: 37.85, minLongitude: 126.3, maxLongitude: 126.85 },
  { name: 'busan', minLatitude: 35.03, maxLatitude: 35.39, minLongitude: 128.79, maxLongitude: 129.35 },
  { name: 'daegu', minLatitude: 35.73, maxLatitude: 36.02, minLongitude: 128.45, maxLongitude: 128.78 },
  { name: 'daejeon', minLatitude: 36.2, maxLatitude: 36.48, minLongitude: 127.28, maxLongitude: 127.53 },
  { name: 'gwangju', minLatitude: 35.05, maxLatitude: 35.24, minLongitude: 126.75, maxLongitude: 127.01 },
  { name: 'ulsan', minLatitude: 35.43, maxLatitude: 35.72, minLongitude: 129.14, maxLongitude: 129.47 },
  { name: 'jeju-do', minLatitude: 33.1, maxLatitude: 33.6, minLongitude: 126.1, maxLongitude: 126.95 },
  { name: 'gyeonggi-do', minLatitude: 36.9, maxLatitude: 38.3, minLongitude: 126.4, maxLongitude: 127.9 },
  { name: 'gangwon-do', minLatitude: 37.0, maxLatitude: 38.65, minLongitude: 127.0, maxLongitude: 129.4 },
  { name: 'chungcheongbuk-do', minLatitude: 36.0, maxLatitude: 37.3, minLongitude: 127.3, maxLongitude: 128.8 },
  { name: 'chungcheongnam-do', minLatitude: 35.95, maxLatitude: 37.2, minLongitude: 126.2, maxLongitude: 127.7 },
  { name: 'jeollabuk-do', minLatitude: 35.3, maxLatitude: 36.2, minLongitude: 126.5, maxLongitude: 127.9 },
  { name: 'jeollanam-do', minLatitude: 34.0, maxLatitude: 35.55, minLongitude: 125.0, maxLongitude: 127.6 },
  { name: 'gyeongsangbuk-do', minLatitude: 35.6, maxLatitude: 37.3, minLongitude: 128.0, maxLongitude: 129.6 },
  { name: 'gyeongsangnam-do', minLatitude: 34.6, maxLatitude: 35.9, minLongitude: 127.6, maxLongitude: 129.3 },
  ...US_CITY_REGIONS,
  ...US_STATE_REGIONS,
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
