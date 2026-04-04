/**
 * 경기도 31개 시·군 대략 경계(위도·경도 박스). 겹치는 구역은 배열 앞쪽 항목이 우선 매칭됩니다.
 * 행정 경계와 완전히 일치하지 않을 수 있으며, 박스 밖은 `gyeonggi-do` 광역으로 폴백됩니다.
 */
export interface GeoBoundingRegion {
  name: string
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

export const GYEONGGI_MUNICIPAL_REGIONS: GeoBoundingRegion[] = [
  { name: 'gwacheon-si', minLatitude: 37.38, maxLatitude: 37.46, minLongitude: 126.96, maxLongitude: 127.04 },
  { name: 'gunpo-si', minLatitude: 37.34, maxLatitude: 37.39, minLongitude: 126.91, maxLongitude: 126.98 },
  { name: 'uiwang-si', minLatitude: 37.32, maxLatitude: 37.37, minLongitude: 126.96, maxLongitude: 127.02 },
  { name: 'gwangmyeong-si', minLatitude: 37.44, maxLatitude: 37.52, minLongitude: 126.8, maxLongitude: 126.93 },
  { name: 'gwangju-si', minLatitude: 37.33, maxLatitude: 37.45, minLongitude: 127.18, maxLongitude: 127.32 },
  { name: 'osan-si', minLatitude: 37.12, maxLatitude: 37.2, minLongitude: 127.02, maxLongitude: 127.14 },
  { name: 'bucheon-si', minLatitude: 37.47, maxLatitude: 37.53, minLongitude: 126.75, maxLongitude: 126.82 },
  { name: 'anyang-si', minLatitude: 37.37, maxLatitude: 37.42, minLongitude: 126.88, maxLongitude: 126.97 },
  { name: 'suwon-si', minLatitude: 37.24, maxLatitude: 37.32, minLongitude: 126.95, maxLongitude: 127.05 },
  { name: 'seongnam-si', minLatitude: 37.38, maxLatitude: 37.47, minLongitude: 127.1, maxLongitude: 127.16 },
  { name: 'goyang-si', minLatitude: 37.61, maxLatitude: 37.68, minLongitude: 126.75, maxLongitude: 126.87 },
  { name: 'yongin-si', minLatitude: 37.2, maxLatitude: 37.3, minLongitude: 127.08, maxLongitude: 127.24 },
  { name: 'pyeongtaek-si', minLatitude: 36.96, maxLatitude: 37.04, minLongitude: 126.95, maxLongitude: 127.1 },
  { name: 'hwaseong-si', minLatitude: 37.16, maxLatitude: 37.26, minLongitude: 126.75, maxLongitude: 127.02 },
  { name: 'paju-si', minLatitude: 37.7, maxLatitude: 37.8, minLongitude: 126.68, maxLongitude: 126.85 },
  { name: 'gimpo-si', minLatitude: 37.58, maxLatitude: 37.66, minLongitude: 126.66, maxLongitude: 126.76 },
  { name: 'siheung-si', minLatitude: 37.42, maxLatitude: 37.5, minLongitude: 126.72, maxLongitude: 126.84 },
  { name: 'hanam-si', minLatitude: 37.52, maxLatitude: 37.56, minLongitude: 127.18, maxLongitude: 127.22 },
  { name: 'guri-si', minLatitude: 37.58, maxLatitude: 37.64, minLongitude: 127.1, maxLongitude: 127.2 },
  { name: 'namyangju-si', minLatitude: 37.58, maxLatitude: 37.68, minLongitude: 127.15, maxLongitude: 127.28 },
  { name: 'dongducheon-si', minLatitude: 37.86, maxLatitude: 37.94, minLongitude: 126.98, maxLongitude: 127.1 },
  { name: 'yangju-si', minLatitude: 37.76, maxLatitude: 37.82, minLongitude: 126.95, maxLongitude: 127.12 },
  { name: 'uijeongbu-si', minLatitude: 37.72, maxLatitude: 37.78, minLongitude: 126.98, maxLongitude: 127.08 },
  { name: 'pocheon-si', minLatitude: 37.78, maxLatitude: 37.96, minLongitude: 127.05, maxLongitude: 127.32 },
  { name: 'yeoju-si', minLatitude: 37.22, maxLatitude: 37.34, minLongitude: 127.52, maxLongitude: 127.72 },
  { name: 'icheon-si', minLatitude: 37.22, maxLatitude: 37.32, minLongitude: 127.38, maxLongitude: 127.52 },
  { name: 'ansan-si', minLatitude: 37.28, maxLatitude: 37.36, minLongitude: 126.78, maxLongitude: 126.9 },
  { name: 'anseong-si', minLatitude: 36.98, maxLatitude: 37.1, minLongitude: 127.18, maxLongitude: 127.38 },
  { name: 'gapyeong-gun', minLatitude: 37.68, maxLatitude: 38.02, minLongitude: 127.35, maxLongitude: 127.65 },
  { name: 'yangpyeong-gun', minLatitude: 37.38, maxLatitude: 37.58, minLongitude: 127.32, maxLongitude: 127.62 },
  { name: 'yeoncheon-gun', minLatitude: 37.98, maxLatitude: 38.2, minLongitude: 126.92, maxLongitude: 127.2 }
]
