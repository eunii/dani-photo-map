import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button, Chip } from '@heroui/react'

import {
  FolderClosedIcon,
  FolderOpenIcon,
  LibraryRootIcon
} from '@presentation/renderer/components/app/AppIcons'
import {
  formatPathSegmentLabel,
  outputPathKey,
  type OutputFolderTreeNode
} from '@presentation/renderer/view-models/outputPathNavigation'

function pathSegmentsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]!)
}

/** 하위가 있는 모든 노드의 `outputPathKey` */
function collectExpandablePathKeys(root: OutputFolderTreeNode): Set<string> {
  const keys = new Set<string>()
  const walk = (node: OutputFolderTreeNode) => {
    if (node.children.length > 0) {
      keys.add(outputPathKey(node.pathSegments))
      for (const child of node.children) {
        walk(child)
      }
    }
  }
  walk(root)
  return keys
}

interface TreeBranchProps {
  node: OutputFolderTreeNode
  depth: number
  selectedPathSegments: string[]
  expandedKeys: Set<string>
  onToggleExpand: (key: string) => void
  onSelectPath: (segments: string[]) => void
}

function TreeBranch({
  node,
  depth,
  selectedPathSegments,
  expandedKeys,
  onToggleExpand,
  onSelectPath
}: TreeBranchProps) {
  const key = outputPathKey(node.pathSegments)
  const hasChildren = node.children.length > 0
  const isExpanded = expandedKeys.has(key)
  const isSelected = pathSegmentsEqual(node.pathSegments, selectedPathSegments)

  const paddingLeft = 4 + depth * 10

  const FolderGlyph = hasChildren
    ? isExpanded
      ? FolderOpenIcon
      : FolderClosedIcon
    : FolderClosedIcon

  const rowMuted = isSelected
    ? 'text-[var(--app-accent-foreground)]/85'
    : 'text-[var(--app-muted)]'

  return (
    <li className="select-none">
      <div
        className={`group flex min-h-9 items-center gap-1 rounded-lg pr-0.5 transition-colors ${
          isSelected
            ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)] shadow-sm'
            : 'hover:bg-[var(--app-surface-strong)]'
        }`}
        style={{ paddingLeft }}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              type="button"
              className={`flex h-7 w-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-1 ${
                isSelected
                  ? 'text-[var(--app-accent-foreground)] hover:bg-white/15'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-foreground)]'
              }`}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? '하위 폴더 접기' : '하위 폴더 펼치기'}
              onClick={(event) => {
                event.stopPropagation()
                onToggleExpand(key)
              }}
            >
              <FolderGlyph className={`h-[18px] w-[18px] ${rowMuted}`} />
            </button>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
              <FolderClosedIcon
                className={`h-[18px] w-[18px] opacity-55 ${rowMuted}`}
                title="폴더"
              />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
          <button
            type="button"
            className={`min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left text-[14px] leading-snug ${
              isSelected
                ? 'font-medium text-[var(--app-accent-foreground)]'
                : 'text-[var(--app-foreground)]'
            }`}
            onClick={() => onSelectPath(node.pathSegments)}
          >
            {formatPathSegmentLabel(node.segmentKey || node.displayLabel)}
          </button>
          <Chip
            size="sm"
            variant="soft"
            color="default"
            className={`max-w-[5rem] shrink-0 border-0 px-1.5 py-0 text-[10px] font-medium leading-tight ${
              isSelected
                ? 'bg-white/20 text-[var(--app-accent-foreground)]'
                : 'bg-[var(--app-surface-strong)] text-[var(--app-muted)]'
            }`}
            title="가장 안쪽 폴더에 있는 파일까지 모두 더한 합계입니다."
          >
            {node.totalPhotoCount}장
          </Chip>
        </div>
      </div>
      {hasChildren && isExpanded ? (
        <ul className="relative mt-px space-y-px pl-0">
          {node.children.map((child) => (
            <TreeBranch
              key={outputPathKey(child.pathSegments)}
              node={child}
              depth={depth + 1}
              selectedPathSegments={selectedPathSegments}
              expandedKeys={expandedKeys}
              onToggleExpand={onToggleExpand}
              onSelectPath={onSelectPath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export interface OutputFolderTreePanelProps {
  folderTreeRoot: OutputFolderTreeNode
  selectedPathSegments: string[]
  onSelectPath: (segments: string[]) => void
}

export function OutputFolderTreePanel({
  folderTreeRoot,
  selectedPathSegments,
  onSelectPath
}: OutputFolderTreePanelProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      for (let i = 1; i <= selectedPathSegments.length; i++) {
        next.add(outputPathKey(selectedPathSegments.slice(0, i)))
      }
      return next
    })
  }, [selectedPathSegments])

  const onToggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const rootSelected = selectedPathSegments.length === 0

  const expandableKeys = useMemo(
    () => collectExpandablePathKeys(folderTreeRoot),
    [folderTreeRoot]
  )

  const treeFullyExpanded = useMemo(() => {
    if (expandableKeys.size === 0) {
      return false
    }
    for (const key of expandableKeys) {
      if (!expandedKeys.has(key)) {
        return false
      }
    }
    return true
  }, [expandableKeys, expandedKeys])

  const handleHomePress = useCallback(() => {
    onSelectPath([])
    setExpandedKeys((prev) => {
      const allKeys = collectExpandablePathKeys(folderTreeRoot)
      if (allKeys.size === 0) {
        return new Set()
      }
      const fully = [...allKeys].every((k) => prev.has(k))
      if (fully) {
        return new Set()
      }
      return new Set(allKeys)
    })
  }, [folderTreeRoot, onSelectPath])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2 py-1.5">
        <LibraryRootIcon className="h-4 w-4 shrink-0 text-[var(--app-accent-strong)]" aria-hidden />
        <div className="min-w-0 flex-1 leading-tight">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
            폴더 트리
          </h3>
        </div>
        <Button
          variant={rootSelected ? 'primary' : 'secondary'}
          size="sm"
          className={`h-7 shrink-0 rounded-lg px-2 py-0 text-[12px] font-medium ${
            rootSelected
              ? 'bg-[var(--app-accent)] text-[var(--app-accent-foreground)]'
              : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)] hover:bg-[var(--app-surface)]/90'
          }`}
          aria-expanded={expandableKeys.size > 0 ? treeFullyExpanded : undefined}
          title={
            expandableKeys.size === 0
              ? '루트로 이동'
              : treeFullyExpanded
                ? '트리 전체 접기'
                : '루트로 이동 후 트리 전체 펼치기'
          }
          onPress={handleHomePress}
        >
          홈 (전체 보기)
        </Button>
      </div>
      <div className="app-scroll min-h-0 flex-1 px-1.5 pt-1.5 pb-6">
        <ul className="space-y-px">
          {folderTreeRoot.children.map((node) => (
            <TreeBranch
              key={outputPathKey(node.pathSegments)}
              node={node}
              depth={0}
              selectedPathSegments={selectedPathSegments}
              expandedKeys={expandedKeys}
              onToggleExpand={onToggleExpand}
              onSelectPath={onSelectPath}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
