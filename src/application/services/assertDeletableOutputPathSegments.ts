import {
  NO_OUTPUT_PATH_SEGMENT,
  ROOT_LEVEL_FILES_SEGMENT
} from '@shared/utils/outputRelativePath'

const INVALID_SEGMENT = new Set(['', '.', '..'])

/**
 * 출력 루트 아래에서 삭제·이동 가능한 트리 경로 세그먼트인지 검사합니다.
 */
export function assertDeletableOutputPathSegments(pathSegments: string[]): void {
  if (pathSegments.length === 0) {
    throw new Error('삭제할 폴더 경로가 비어 있습니다.')
  }

  for (const segment of pathSegments) {
    if (INVALID_SEGMENT.has(segment) || segment.includes('/') || segment.includes('\\')) {
      throw new Error('잘못된 폴더 경로입니다.')
    }
  }

  if (pathSegments[0] === '.photo-organizer') {
    throw new Error('내부 메타데이터 폴더는 삭제할 수 없습니다.')
  }

  if (
    pathSegments.length === 1 &&
    (pathSegments[0] === NO_OUTPUT_PATH_SEGMENT ||
      pathSegments[0] === ROOT_LEVEL_FILES_SEGMENT)
  ) {
    return
  }
}
