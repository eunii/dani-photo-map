import type { Photo } from '@domain/entities/Photo'
import {
  NO_OUTPUT_PATH_SEGMENT,
  parseOutputDir,
  ROOT_LEVEL_FILES_SEGMENT
} from '@shared/utils/outputRelativePath'

function pathStartsWith(path: string[], prefix: string[]): boolean {
  if (prefix.length > path.length) {
    return false
  }
  return prefix.every((segment, index) => path[index] === segment)
}

/**
 * 트리에서 선택한 `pathSegments`와 동일한 기준으로(직접 자식이 아니라) 해당 경로 **접두사**에 속한 모든 사진 id를 모읍니다.
 */
export function collectPhotoIdsUnderOutputPath(
  photos: Photo[],
  pathSegments: string[]
): Set<string> {
  const out = new Set<string>()

  if (pathSegments.length === 1 && pathSegments[0] === NO_OUTPUT_PATH_SEGMENT) {
    for (const photo of photos) {
      if (parseOutputDir(photo.outputRelativePath).kind === 'orphan') {
        out.add(photo.id)
      }
    }
    return out
  }

  if (pathSegments.length === 1 && pathSegments[0] === ROOT_LEVEL_FILES_SEGMENT) {
    for (const photo of photos) {
      if (parseOutputDir(photo.outputRelativePath).kind === 'rootFile') {
        out.add(photo.id)
      }
    }
    return out
  }

  for (const photo of photos) {
    const parsed = parseOutputDir(photo.outputRelativePath)
    if (parsed.kind !== 'nested') {
      continue
    }
    if (pathStartsWith(parsed.segments, pathSegments)) {
      out.add(photo.id)
    }
  }

  return out
}
