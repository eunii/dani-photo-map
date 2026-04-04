import type { FlatPhotoRow } from '@presentation/renderer/view-models/flattenLibraryPhotos'
import {
  NO_OUTPUT_PATH_SEGMENT,
  parseOutputDir,
  ROOT_LEVEL_FILES_SEGMENT,
  type OutputDirParsed
} from '@shared/utils/outputRelativePath'

export {
  NO_OUTPUT_PATH_SEGMENT,
  ROOT_LEVEL_FILES_SEGMENT,
  parseOutputDir,
  type OutputDirParsed
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

/**
 * `pathSegments` 바로 아래 `subfolderSegment` 폴더(또는 그 하위)에 있는 사진이 속한 첫 그룹 id.
 * (예: `2026/04` + `서울_산책` → 해당 경로 접두사를 가진 첫 사진의 그룹)
 */
export function findFirstGroupIdUnderSubfolder(
  rows: FlatPhotoRow[],
  pathSegments: string[],
  subfolderSegment: string
): string | undefined {
  const prefix = [...pathSegments, subfolderSegment]
  for (const row of rows) {
    const parsed = parseOutputDir(row.photo.outputRelativePath)
    if (parsed.kind !== 'nested') {
      continue
    }
    if (!pathStartsWith(parsed.segments, prefix)) {
      continue
    }
    return row.groupId
  }
  return undefined
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

/**
 * `pathSegments` 기준으로, 그 안쪽 폴더에 들어 있는 파일까지 모두 합친 사진 수.
 * 트리 노드의 `totalPhotoCount`와 같은 기준입니다.
 */
export function countPhotosInSubtree(
  rows: FlatPhotoRow[],
  pathSegments: string[]
): number {
  if (pathSegments.length === 0) {
    return rows.length
  }
  if (pathSegments.length === 1 && pathSegments[0] === NO_OUTPUT_PATH_SEGMENT) {
    return rows.filter(
      (row) => parseOutputDir(row.photo.outputRelativePath).kind === 'orphan'
    ).length
  }
  if (pathSegments.length === 1 && pathSegments[0] === ROOT_LEVEL_FILES_SEGMENT) {
    return rows.filter(
      (row) => parseOutputDir(row.photo.outputRelativePath).kind === 'rootFile'
    ).length
  }
  return countPhotosUnderPrefix(rows, pathSegments)
}

export function formatPathSegmentLabel(segment: string): string {
  if (segment === NO_OUTPUT_PATH_SEGMENT) return '출력 경로 없음'
  if (segment === ROOT_LEVEL_FILES_SEGMENT) return '출력 폴더 바로 아래'
  return segment
}

/** Stable key for `pathSegments` (folder identity in the tree). */
export function outputPathKey(segments: string[]): string {
  return segments.join('\x1e')
}

export interface OutputFolderTreeNode {
  pathSegments: string[]
  displayLabel: string
  segmentKey: string
  directRows: FlatPhotoRow[]
  children: OutputFolderTreeNode[]
  /** 직접 이 폴더에 있는 파일 + 자식 폴더들에 합산된 수(최안쪽 파일까지 합침). */
  totalPhotoCount: number
}

class MutableTreeNode {
  pathSegments: string[] = []
  displayLabel = ''
  segmentKey = ''
  directRows: FlatPhotoRow[] = []
  readonly children = new Map<string, MutableTreeNode>()
}

function ensureTreeChild(
  parent: MutableTreeNode,
  segmentKey: string,
  displayLabel: string,
  pathSegments: string[]
): MutableTreeNode {
  let node = parent.children.get(segmentKey)
  if (!node) {
    node = new MutableTreeNode()
    node.pathSegments = pathSegments
    node.segmentKey = segmentKey
    node.displayLabel = displayLabel
    parent.children.set(segmentKey, node)
  }
  return node
}

function insertRowIntoTree(root: MutableTreeNode, row: FlatPhotoRow): void {
  const parsed = parseOutputDir(row.photo.outputRelativePath)
  if (parsed.kind === 'orphan') {
    const n = ensureTreeChild(
      root,
      NO_OUTPUT_PATH_SEGMENT,
      '출력 경로 없음',
      [NO_OUTPUT_PATH_SEGMENT]
    )
    n.directRows.push(row)
    return
  }
  if (parsed.kind === 'rootFile') {
    const n = ensureTreeChild(
      root,
      ROOT_LEVEL_FILES_SEGMENT,
      '출력 폴더 바로 아래',
      [ROOT_LEVEL_FILES_SEGMENT]
    )
    n.directRows.push(row)
    return
  }
  let node = root
  for (let i = 0; i < parsed.segments.length; i++) {
    const seg = parsed.segments[i]!
    const pathSoFar = parsed.segments.slice(0, i + 1)
    node = ensureTreeChild(node, seg, seg, pathSoFar)
  }
  node.directRows.push(row)
}

function convertMutableNode(node: MutableTreeNode): OutputFolderTreeNode {
  const children = [...node.children.values()]
    .sort((a, b) =>
      a.displayLabel.localeCompare(b.displayLabel, undefined, {
        sensitivity: 'base'
      })
    )
    .map(convertMutableNode)
  const childTotal = children.reduce((sum, c) => sum + c.totalPhotoCount, 0)
  return {
    pathSegments: node.pathSegments,
    displayLabel: node.displayLabel,
    segmentKey: node.segmentKey,
    directRows: node.directRows,
    children,
    totalPhotoCount: node.directRows.length + childTotal
  }
}

/** Full folder tree for expand/collapse UI; root has `pathSegments: []`. */
export function buildOutputFolderTree(rows: FlatPhotoRow[]): OutputFolderTreeNode {
  const root = new MutableTreeNode()
  root.pathSegments = []
  root.segmentKey = ''
  root.displayLabel = '출력'
  for (const row of rows) {
    insertRowIntoTree(root, row)
  }
  return convertMutableNode(root)
}