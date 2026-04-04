import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'

export const NO_OUTPUT_PATH_SEGMENT = '__no_output_path__'
export const ROOT_LEVEL_FILES_SEGMENT = '__root_level_files__'

export type OutputDirParsed =
  | { kind: 'orphan' }
  | { kind: 'rootFile' }
  | { kind: 'nested'; segments: string[] }

export function parseOutputDir(outputRelativePath?: string): OutputDirParsed {
  if (!outputRelativePath?.trim()) return { kind: 'orphan' }
  const normalized = outputRelativePath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter((p) => p.length > 0)
  if (parts.length === 0) return { kind: 'orphan' }
  parts.pop()
  if (parts.length === 0) return { kind: 'rootFile' }
  return { kind: 'nested', segments: parts }
}

function pathStartsWith(path: string[], prefix: string[]): boolean {
  if (prefix.length > path.length) return false
  return prefix.every((segment, index) => path[index] === segment)
}

function pathEquals(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]!)
}

function countPhotosUnderPrefix(rows: FlatPhotoRow[], prefix: string[]): number {
  let count = 0
  for (const row of rows) {
    const parsed = parseOutputDir(row.photo.outputRelativePath)
    if (parsed.kind === 'orphan') {
      if (prefix.length === 0) count += 1
      continue
    }
    if (parsed.kind === 'rootFile') {
      if (prefix.length === 0) count += 1
      continue
    }
    if (pathStartsWith(parsed.segments, prefix)) count += 1
  }
  return count
}

export interface SubfolderEntry {
  segment: string
  displayLabel: string
  photoCount: number
}

export function listSubfoldersAtPath(
  rows: FlatPhotoRow[],
  currentPath: string[]
): SubfolderEntry[] {
  const seen = new Map<string, SubfolderEntry>()
  if (currentPath.length === 0) {
    const orphanCount = rows.filter(
      (row) => parseOutputDir(row.photo.outputRelativePath).kind === 'orphan'
    ).length
    if (orphanCount > 0) {
      seen.set(NO_OUTPUT_PATH_SEGMENT, {
        segment: NO_OUTPUT_PATH_SEGMENT,
        displayLabel: '출력 경로 없음',
        photoCount: orphanCount
      })
    }
    const rootFileCount = rows.filter(
      (row) => parseOutputDir(row.photo.outputRelativePath).kind === 'rootFile'
    ).length
    if (rootFileCount > 0) {
      seen.set(ROOT_LEVEL_FILES_SEGMENT, {
        segment: ROOT_LEVEL_FILES_SEGMENT,
        displayLabel: '출력 폴더 바로 아래',
        photoCount: rootFileCount
      })
    }
  }
  const nextNames = new Set<string>()
  for (const row of rows) {
    const parsed = parseOutputDir(row.photo.outputRelativePath)
    if (parsed.kind !== 'nested') continue
    const { segments } = parsed
    if (!pathStartsWith(segments, currentPath)) continue
    if (segments.length <= currentPath.length) continue
    nextNames.add(segments[currentPath.length]!)
  }
  for (const name of nextNames) {
    const prefix = [...currentPath, name]
    seen.set(name, {
      segment: name,
      displayLabel: name,
      photoCount: countPhotosUnderPrefix(rows, prefix)
    })
  }
  return [...seen.values()].sort((a, b) =>
    a.displayLabel.localeCompare(b.displayLabel, undefined, { sensitivity: 'base' })
  )
}

export function filterRowsAtPath(
  rows: FlatPhotoRow[],
  currentPath: string[]
): FlatPhotoRow[] {
  if (currentPath.length === 1 && currentPath[0] === NO_OUTPUT_PATH_SEGMENT) {
    return rows.filter(
      (row) => parseOutputDir(row.photo.outputRelativePath).kind === 'orphan'
    )
  }
  if (currentPath.length === 1 && currentPath[0] === ROOT_LEVEL_FILES_SEGMENT) {
    return rows.filter(
      (row) => parseOutputDir(row.photo.outputRelativePath).kind === 'rootFile'
    )
  }
  return rows.filter((row) => {
    const parsed = parseOutputDir(row.photo.outputRelativePath)
    if (parsed.kind !== 'nested') return false
    return pathEquals(parsed.segments, currentPath)
  })
}

export function formatPathSegmentLabel(segment: string): string {
  if (segment === NO_OUTPUT_PATH_SEGMENT) return '출력 경로 없음'
  if (segment === ROOT_LEVEL_FILES_SEGMENT) return '출력 폴더 바로 아래'
  return segment
}
