export const NO_OUTPUT_PATH_SEGMENT = '__no_output_path__'
export const ROOT_LEVEL_FILES_SEGMENT = '__root_level_files__'

export type OutputDirParsed =
  | { kind: 'orphan' }
  | { kind: 'rootFile' }
  | { kind: 'nested'; segments: string[] }

export function parseOutputDir(outputRelativePath?: string): OutputDirParsed {
  if (!outputRelativePath?.trim()) {
    return { kind: 'orphan' }
  }
  const normalized = outputRelativePath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter((p) => p.length > 0)
  if (parts.length === 0) {
    return { kind: 'orphan' }
  }
  parts.pop()
  if (parts.length === 0) {
    return { kind: 'rootFile' }
  }
  return { kind: 'nested', segments: parts }
}

/**
 * `outputRelativePath`가 가리키는 폴더가 `pathSegments`(파일 목록 트리의 경로, `NO_OUTPUT_PATH_SEGMENT`/
 * `ROOT_LEVEL_FILES_SEGMENT` 가상 세그먼트 포함 가능)와 정확히 같은 폴더인지 확인합니다.
 */
export function matchesOutputPath(
  outputRelativePath: string | undefined,
  pathSegments: string[]
): boolean {
  const parsed = parseOutputDir(outputRelativePath)

  if (pathSegments.length === 1 && pathSegments[0] === NO_OUTPUT_PATH_SEGMENT) {
    return parsed.kind === 'orphan'
  }

  if (pathSegments.length === 1 && pathSegments[0] === ROOT_LEVEL_FILES_SEGMENT) {
    return parsed.kind === 'rootFile'
  }

  if (parsed.kind !== 'nested') {
    return false
  }

  return (
    parsed.segments.length === pathSegments.length &&
    parsed.segments.every((segment, index) => segment === pathSegments[index])
  )
}
