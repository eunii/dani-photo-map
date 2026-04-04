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
