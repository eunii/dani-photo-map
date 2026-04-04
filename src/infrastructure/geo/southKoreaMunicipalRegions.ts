/**
 * 대한민국 광역시·특별시 자치구, 세종, 제주 2시, 도 단위 시·군 대략 박스.
 * 행정 경계와 일치하지 않을 수 있음. 겹침은 배열 앞쪽 우선.
 */
import type { GeoBoundingRegion } from '@infrastructure/geo/gyeonggiMunicipalityRegions'

export type { GeoBoundingRegion }

function b(
  name: string,
  lat: number,
  lon: number,
  latSpan = 0.14,
  lonSpan = 0.14
): GeoBoundingRegion {
  const hLat = latSpan / 2
  const hLon = lonSpan / 2

  return {
    name,
    minLatitude: lat - hLat,
    maxLatitude: lat + hLat,
    minLongitude: lon - hLon,
    maxLongitude: lon + hLon
  }
}

/** 부산 16개 구·군 */
const BUSAN_REGIONS: GeoBoundingRegion[] = [
  b('busan-jung-gu', 35.106, 129.032, 0.06, 0.06),
  b('busan-seo-gu', 35.098, 129.024, 0.08, 0.08),
  b('busan-dong-gu', 35.129, 129.045, 0.08, 0.08),
  b('busan-yeongdo-gu', 35.091, 129.068, 0.06, 0.08),
  b('busan-busanjin-gu', 35.163, 129.053, 0.1, 0.1),
  b('busan-dongnae-gu', 35.203, 129.084, 0.08, 0.08),
  b('busan-nam-gu', 35.137, 129.085, 0.08, 0.08),
  b('busan-buk-gu', 35.197, 128.992, 0.1, 0.1),
  b('busan-haeundae-gu', 35.163, 129.164, 0.1, 0.12),
  b('busan-saha-gu', 35.105, 128.974, 0.1, 0.1),
  b('busan-geumjeong-gu', 35.243, 129.092, 0.1, 0.1),
  b('busan-yeonje-gu', 35.094, 129.049, 0.08, 0.08),
  b('busan-suyeong-gu', 35.145, 129.113, 0.08, 0.08),
  b('busan-sasang-gu', 35.146, 128.992, 0.1, 0.1),
  b('busan-gangseo-gu', 35.212, 128.982, 0.12, 0.12),
  b('busan-gijang-gun', 35.244, 129.222, 0.14, 0.18)
]

/** 대구 7구 + 군위군 */
const DAEGU_REGIONS: GeoBoundingRegion[] = [
  b('daegu-jung-gu', 35.869, 128.606, 0.08, 0.08),
  b('daegu-dong-gu', 35.886, 128.636, 0.1, 0.1),
  b('daegu-seo-gu', 35.872, 128.559, 0.1, 0.12),
  b('daegu-nam-gu', 35.846, 128.597, 0.1, 0.1),
  b('daegu-buk-gu', 35.894, 128.582, 0.1, 0.12),
  b('daegu-suseong-gu', 35.858, 128.631, 0.1, 0.1),
  b('daegu-dalseo-gu', 35.829, 128.534, 0.12, 0.14),
  b('daegu-dalseong-gun', 35.774, 128.431, 0.2, 0.22),
  b('gunwi-gun', 36.243, 128.573, 0.22, 0.28)
]

/** 인천 8구 + 강화·옹진 */
const INCHEON_REGIONS: GeoBoundingRegion[] = [
  b('incheon-jung-gu', 37.454, 126.632, 0.08, 0.1),
  b('incheon-dong-gu', 37.474, 126.643, 0.08, 0.08),
  b('incheon-michuhol-gu', 37.463, 126.65, 0.1, 0.1),
  b('incheon-yeonsu-gu', 37.41, 126.678, 0.12, 0.12),
  b('incheon-namdong-gu', 37.448, 126.731, 0.1, 0.12),
  b('incheon-bupyeong-gu', 37.507, 126.721, 0.12, 0.12),
  b('incheon-gyeyang-gu', 37.538, 126.737, 0.12, 0.12),
  b('incheon-seo-gu', 37.545, 126.676, 0.12, 0.14),
  b('ganghwa-gun', 37.747, 126.485, 0.25, 0.35),
  b('ongjin-gun', 37.147, 126.622, 0.2, 0.45)
]

/** 광주 5구 */
const GWANGJU_REGIONS: GeoBoundingRegion[] = [
  b('gwangju-dong-gu', 35.146, 126.923, 0.1, 0.1),
  b('gwangju-seo-gu', 35.152, 126.89, 0.12, 0.12),
  b('gwangju-nam-gu', 35.123, 126.909, 0.1, 0.1),
  b('gwangju-buk-gu', 35.174, 126.912, 0.1, 0.12),
  b('gwangju-gwangsan-gu', 35.14, 126.793, 0.12, 0.14)
]

/** 대전 5구 */
const DAEJEON_REGIONS: GeoBoundingRegion[] = [
  b('daejeon-dong-gu', 36.351, 127.445, 0.1, 0.12),
  b('daejeon-jung-gu', 36.325, 127.422, 0.08, 0.1),
  b('daejeon-seo-gu', 36.354, 127.384, 0.12, 0.14),
  b('daejeon-yuseong-gu', 36.364, 127.384, 0.12, 0.12),
  b('daejeon-daedeok-gu', 36.397, 127.409, 0.14, 0.18)
]

/** 울산 4구 + 울주군 */
const ULSAN_REGIONS: GeoBoundingRegion[] = [
  b('ulsan-jung-gu', 35.558, 129.321, 0.1, 0.12),
  b('ulsan-nam-gu', 35.538, 129.33, 0.12, 0.14),
  b('ulsan-dong-gu', 35.505, 129.417, 0.14, 0.16),
  b('ulsan-buk-gu', 35.582, 129.361, 0.12, 0.14),
  b('ulju-gun', 35.522, 129.242, 0.35, 0.4)
]

const SEJONG_REGIONS: GeoBoundingRegion[] = [
  b('sejong', 36.487, 127.282, 0.22, 0.28)
]

const JEJU_REGIONS: GeoBoundingRegion[] = [
  b('jeju-si', 33.499, 126.531, 0.35, 0.45),
  b('seogwipo-si', 33.254, 126.51, 0.35, 0.4)
]

/** 강원특별자치도 18개 시·군 */
const GANGWON_REGIONS: GeoBoundingRegion[] = [
  b('chuncheon-si', 37.881, 127.73, 0.2, 0.22),
  b('wonju-si', 37.342, 127.92, 0.2, 0.22),
  b('gangneung-si', 37.752, 128.876, 0.18, 0.2),
  b('donghae-si', 37.524, 129.114, 0.14, 0.16),
  b('taebaek-si', 37.164, 128.986, 0.12, 0.14),
  b('sokcho-si', 38.207, 128.592, 0.14, 0.16),
  b('samcheok-si', 37.45, 129.165, 0.16, 0.2),
  b('hongcheon-gun', 37.698, 127.889, 0.28, 0.32),
  b('hoengseong-gun', 37.489, 127.988, 0.28, 0.32),
  b('pyeongchang-gun', 37.37, 128.394, 0.35, 0.45),
  b('yeongwol-gun', 37.184, 128.461, 0.35, 0.4),
  b('jeongseon-gun', 37.381, 128.661, 0.35, 0.4),
  b('cheorwon-gun', 38.211, 127.211, 0.3, 0.35),
  b('hwacheon-gun', 38.108, 127.706, 0.28, 0.35),
  b('yanggu-gun', 38.106, 127.989, 0.25, 0.3),
  b('inje-gun', 38.07, 128.17, 0.22, 0.28),
  b('goseong-gun-gangwon', 38.38, 128.468, 0.25, 0.35),
  b('yangyang-gun', 38.075, 128.619, 0.28, 0.32)
]

/** 충청북도 3시 8군 */
const CHUNGBUK_REGIONS: GeoBoundingRegion[] = [
  b('cheongju-si', 36.642, 127.489, 0.35, 0.4),
  b('chungju-si', 36.971, 127.932, 0.22, 0.25),
  b('jecheon-si', 37.133, 128.214, 0.2, 0.22),
  b('boeun-gun', 36.489, 127.729, 0.28, 0.3),
  b('okcheon-gun', 36.306, 127.568, 0.28, 0.3),
  b('yeongdong-gun', 36.176, 127.783, 0.28, 0.32),
  b('jeungpyeong-gun', 36.785, 127.583, 0.2, 0.22),
  b('jincheon-gun', 36.857, 127.443, 0.25, 0.28),
  b('goesan-gun', 36.819, 127.792, 0.35, 0.38),
  b('eumseong-gun', 36.935, 127.692, 0.32, 0.35),
  b('danyang-gun', 36.987, 128.366, 0.45, 0.5)
]

/** 충청남도 8시 7군 */
const CHUNGNAM_REGIONS: GeoBoundingRegion[] = [
  b('cheonan-si', 36.815, 127.114, 0.28, 0.32),
  b('gongju-si', 36.456, 127.124, 0.22, 0.25),
  b('boryeong-si', 36.334, 126.613, 0.22, 0.28),
  b('asan-si', 36.79, 126.998, 0.22, 0.28),
  b('seosan-si', 36.782, 126.452, 0.25, 0.3),
  b('nonsan-si', 36.204, 127.084, 0.22, 0.28),
  b('gyeryong-si', 36.276, 127.289, 0.12, 0.14),
  b('dangjin-si', 36.89, 126.627, 0.25, 0.35),
  b('geumsan-gun', 36.109, 127.488, 0.28, 0.3),
  b('buyeo-gun', 36.276, 126.91, 0.35, 0.4),
  b('seocheon-gun', 36.078, 126.691, 0.35, 0.4),
  b('cheongyang-gun', 36.446, 126.802, 0.35, 0.38),
  b('hongseong-gun', 36.601, 126.665, 0.35, 0.4),
  b('yesan-gun', 36.661, 126.844, 0.35, 0.38),
  b('taean-gun', 36.746, 126.298, 0.4, 0.55)
]

/** 전북특별자치도 6시 8군 */
const JEONBUK_REGIONS: GeoBoundingRegion[] = [
  b('jeonju-si', 35.824, 127.148, 0.28, 0.32),
  b('gunsan-si', 35.968, 126.737, 0.22, 0.28),
  b('iksan-si', 35.943, 126.954, 0.22, 0.28),
  b('jeongeup-si', 35.57, 126.846, 0.22, 0.28),
  b('namwon-si', 35.41, 127.386, 0.22, 0.28),
  b('gimje-si', 35.803, 126.88, 0.22, 0.28),
  b('wanju-gun', 35.845, 127.148, 0.35, 0.4),
  b('jinan-gun', 35.791, 127.425, 0.45, 0.5),
  b('muju-gun', 36.009, 127.661, 0.45, 0.5),
  b('jangsu-gun', 35.647, 127.522, 0.4, 0.45),
  b('imsil-gun', 35.612, 127.244, 0.38, 0.42),
  b('sunchang-gun', 35.374, 127.138, 0.35, 0.38),
  b('gochang-gun', 35.436, 126.699, 0.45, 0.5),
  b('buan-gun', 35.732, 126.733, 0.35, 0.45)
]

/** 전라남도 5시 17군 */
const JEONNAM_REGIONS: GeoBoundingRegion[] = [
  b('mokpo-si', 34.812, 126.392, 0.2, 0.22),
  b('yeosu-si', 34.76, 127.662, 0.28, 0.35),
  b('suncheon-si', 34.951, 127.488, 0.25, 0.3),
  b('naju-si', 35.015, 126.711, 0.22, 0.28),
  b('gwangyang-si', 34.941, 127.696, 0.22, 0.28),
  b('damyang-gun', 35.32, 126.989, 0.35, 0.4),
  b('gokseong-gun', 35.163, 127.285, 0.4, 0.45),
  b('gurye-gun', 35.209, 127.465, 0.38, 0.42),
  b('goheung-gun', 34.612, 127.285, 0.55, 0.6),
  b('boseong-gun', 34.772, 127.08, 0.45, 0.55),
  b('hwasun-gun', 35.064, 126.987, 0.45, 0.5),
  b('jangheung-gun', 35.682, 126.907, 0.45, 0.5),
  b('gangjin-gun', 34.642, 126.767, 0.45, 0.5),
  b('haenam-gun', 34.573, 126.599, 0.55, 0.6),
  b('yeongam-gun', 34.8, 126.697, 0.45, 0.5),
  b('muan-gun', 34.99, 126.482, 0.45, 0.55),
  b('hampyeong-gun', 35.065, 126.517, 0.35, 0.4),
  b('yeonggwang-gun', 35.276, 126.511, 0.45, 0.5),
  b('jangseong-gun', 35.302, 126.784, 0.4, 0.45),
  b('wando-gun', 34.311, 126.755, 0.35, 0.45),
  b('jindo-gun', 34.487, 126.264, 0.3, 0.4),
  b('sinan-gun', 34.827, 126.244, 0.55, 0.75)
]

/** 경상북도 10시 13군 (군위는 대구 이전 반영 시 중복 주의 — 경북 내 군위 제외하고 gunwi는 대구 배열에만) */
const GYEONGBUK_REGIONS: GeoBoundingRegion[] = [
  b('pohang-si', 36.019, 129.344, 0.35, 0.45),
  b('gyeongju-si', 35.856, 129.225, 0.35, 0.4),
  b('gimcheon-si', 36.14, 128.114, 0.28, 0.32),
  b('andong-si', 36.568, 128.729, 0.25, 0.3),
  b('gumi-si', 36.12, 128.345, 0.28, 0.32),
  b('yeongju-si', 36.806, 128.624, 0.25, 0.3),
  b('yeongcheon-si', 35.973, 128.939, 0.28, 0.32),
  b('sangju-si', 36.416, 128.161, 0.28, 0.35),
  b('mungyeong-si', 36.595, 128.199, 0.28, 0.32),
  b('gyeongsan-si', 35.825, 128.742, 0.25, 0.3),
  b('uiseong-gun', 36.353, 128.697, 0.45, 0.5),
  b('cheongsong-gun', 36.433, 129.057, 0.45, 0.5),
  b('yeongyang-gun', 36.666, 129.112, 0.4, 0.45),
  b('yeongdeok-gun', 36.413, 129.365, 0.5, 0.55),
  b('cheongdo-gun', 35.647, 128.735, 0.35, 0.4),
  b('goryeong-gun', 35.727, 128.263, 0.35, 0.4),
  b('seongju-gun', 35.919, 128.284, 0.4, 0.45),
  b('chilgok-gun', 35.993, 128.402, 0.4, 0.45),
  b('yecheon-gun', 36.656, 128.452, 0.45, 0.5),
  b('bonghwa-gun', 36.894, 128.732, 0.55, 0.6),
  b('uljin-gun', 36.993, 129.401, 0.45, 0.55),
  b('ulleung-gun', 37.484, 130.905, 0.12, 0.18)
]

/** 경상남도 8시 10군 */
const GYEONGNAM_REGIONS: GeoBoundingRegion[] = [
  b('changwon-si', 35.228, 128.682, 0.45, 0.55),
  b('jinju-si', 35.18, 128.108, 0.28, 0.32),
  b('tongyeong-si', 34.854, 128.433, 0.18, 0.22),
  b('sacheon-si', 35.004, 128.065, 0.22, 0.28),
  b('gimhae-si', 35.229, 128.889, 0.28, 0.35),
  b('miryang-si', 35.503, 128.745, 0.28, 0.35),
  b('geoje-si', 34.881, 128.621, 0.35, 0.45),
  b('yangsan-si', 35.339, 129.037, 0.28, 0.35),
  b('geochang-gun', 35.687, 127.91, 0.45, 0.5),
  b('hapcheon-gun', 35.567, 128.166, 0.45, 0.5),
  b('hadong-gun', 35.138, 127.745, 0.5, 0.55),
  b('sancheong-gun', 35.415, 127.874, 0.45, 0.5),
  b('hamyang-gun', 35.52, 127.726, 0.5, 0.55),
  b('uiryeong-gun', 35.32, 128.262, 0.4, 0.45),
  b('changnyeong-gun', 35.541, 128.495, 0.45, 0.5),
  b('goseong-gun-gyeongnam', 34.974, 128.324, 0.45, 0.5),
  b('namhae-gun', 34.838, 127.894, 0.45, 0.5),
  b('haman-gun', 35.272, 128.406, 0.4, 0.45)
]

export const SOUTH_KOREA_MUNICIPAL_REGIONS: GeoBoundingRegion[] = [
  ...BUSAN_REGIONS,
  ...DAEGU_REGIONS,
  ...INCHEON_REGIONS,
  ...GWANGJU_REGIONS,
  ...DAEJEON_REGIONS,
  ...ULSAN_REGIONS,
  ...SEJONG_REGIONS,
  ...JEJU_REGIONS,
  ...GANGWON_REGIONS,
  ...CHUNGBUK_REGIONS,
  ...CHUNGNAM_REGIONS,
  ...JEONBUK_REGIONS,
  ...JEONNAM_REGIONS,
  ...GYEONGBUK_REGIONS,
  ...GYEONGNAM_REGIONS
]
