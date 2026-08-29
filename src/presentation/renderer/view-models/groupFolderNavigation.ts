import type { GroupSummary } from '@shared/types/preload'

import { type OutputFolderTreeNode } from '@presentation/renderer/view-models/outputPathNavigation'

class MutableTreeNode {
  pathSegments: string[] = []
  displayLabel = ''
  segmentKey = ''
  readonly children = new Map<string, MutableTreeNode>()
  totalPhotoCount = 0
}

function pathStartsWith(path: string[], prefix: string[]): boolean {
  if (prefix.length > path.length) {
    return false
  }

  return prefix.every((segment, index) => path[index] === segment)
}

function ensureTreeChild(
  parent: MutableTreeNode,
  segmentKey: string,
  pathSegments: string[]
): MutableTreeNode {
  let node = parent.children.get(segmentKey)

  if (!node) {
    node = new MutableTreeNode()
    node.segmentKey = segmentKey
    node.displayLabel = segmentKey
    node.pathSegments = pathSegments
    parent.children.set(segmentKey, node)
  }

  return node
}

function convertMutableNode(node: MutableTreeNode): OutputFolderTreeNode {
  const children = [...node.children.values()]
    .sort((left, right) => left.displayLabel.localeCompare(right.displayLabel))
    .map(convertMutableNode)

  return {
    pathSegments: node.pathSegments,
    displayLabel: node.displayLabel,
    segmentKey: node.segmentKey,
    directRows: [],
    children,
    totalPhotoCount: node.totalPhotoCount
  }
}

export function buildGroupFolderTree(groups: GroupSummary[]): OutputFolderTreeNode {
  const root = new MutableTreeNode()
  root.displayLabel = '출력'

  for (const group of groups) {
    let node = root

    for (let index = 0; index < group.pathSegments.length; index += 1) {
      const nextPath = group.pathSegments.slice(0, index + 1)
      node = ensureTreeChild(node, group.pathSegments[index]!, nextPath)
      node.totalPhotoCount += group.photoCount
    }

    root.totalPhotoCount += group.photoCount
  }

  return convertMutableNode(root)
}

export function countPhotosInGroupSubtree(
  groups: GroupSummary[],
  pathSegments: string[]
): number {
  if (pathSegments.length === 0) {
    return groups.reduce((sum, group) => sum + group.photoCount, 0)
  }

  return groups
    .filter((group) => pathStartsWith(group.pathSegments, pathSegments))
    .reduce((sum, group) => sum + group.photoCount, 0)
}

export function findGroupByPath(
  groups: GroupSummary[],
  pathSegments: string[]
): GroupSummary | undefined {
  return groups.find(
    (group) =>
      group.pathSegments.length === pathSegments.length &&
      group.pathSegments.every((segment, index) => segment === pathSegments[index])
  )
}
