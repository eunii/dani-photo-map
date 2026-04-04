import { useCallback, useEffect, useState } from 'react'

import {
  formatPathSegmentLabel,
  outputPathKey,
  type OutputFolderTreeNode
} from '@presentation/renderer/view-models/outputPathNavigation'

function pathSegmentsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]!)
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

  const paddingLeft = 8 + depth * 14

  return (
    <li className="select-none">
      <div
        className="flex min-h-8 items-center gap-0.5 rounded-md pr-1 hover:bg-slate-50"
        style={{ paddingLeft }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
            aria-expanded={isExpanded}
            title={isExpanded ? '접기' : '펼치기'}
            onClick={(event) => {
              event.stopPropagation()
              onToggleExpand(key)
            }}
          >
            <span
              className="inline-block text-xs transition-transform"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              ▸
            </span>
          </button>
        ) : (
          <span className="inline-block w-7 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          className={`min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-sm ${
            isSelected
              ? 'bg-sky-100 font-medium text-sky-900'
              : 'text-slate-800'
          }`}
          onClick={() => onSelectPath(node.pathSegments)}
        >
          {formatPathSegmentLabel(node.segmentKey || node.displayLabel)}
          <span
            className="ml-1 shrink-0 text-xs font-normal text-slate-500"
            title="가장 안쪽 폴더에 있는 파일까지 모두 더한 합계입니다."
          >
            ({node.totalPhotoCount}장)
          </span>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-slate-100 pl-0">
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

  return (
    <div className="flex max-h-[min(70vh,800px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          폴더 트리
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          ▸로 펼치고 접을 수 있습니다. 폴더를 누르면 오른쪽에 그 안의 사진이
          표시됩니다.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <button
          type="button"
          className={`mb-2 w-full rounded-lg border px-2 py-1.5 text-left text-sm ${
            selectedPathSegments.length === 0
              ? 'border-sky-200 bg-sky-50 font-medium text-sky-900'
              : 'border-transparent text-slate-700 hover:bg-slate-50'
          }`}
          onClick={() => onSelectPath([])}
        >
          홈 (전체 보기)
        </button>
        <ul className="space-y-0.5">
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
