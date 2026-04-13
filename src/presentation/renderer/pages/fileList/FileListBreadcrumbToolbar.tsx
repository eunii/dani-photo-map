import { Button } from '@heroui/react'

import { BreadcrumbDropdown } from '@presentation/renderer/components/files/BreadcrumbDropdown'
import {
  listSubfoldersAtPath as listGroupSubfoldersAtPath
} from '@presentation/renderer/view-models/groupFolderNavigation'
import { formatPathSegmentLabel } from '@presentation/renderer/view-models/outputPathNavigation'
import type { GroupSummary, LibraryIndexView } from '@shared/types/preload'

interface RootBreadcrumbOption {
  key: string
  label: string
  pathSegments: string[]
  photoCount: number
}

interface FileListBreadcrumbToolbarProps {
  pathSegments: string[]
  groups: GroupSummary[]
  libraryIndex: LibraryIndexView | null
  rootBreadcrumbOptions: RootBreadcrumbOption[]
  onNavigate: (segments: string[]) => void
  onRequestDeleteFolder: () => void
  isDeleteFolderDisabled: boolean
}

export function FileListBreadcrumbToolbar({
  pathSegments,
  groups,
  libraryIndex,
  rootBreadcrumbOptions,
  onNavigate,
  onRequestDeleteFolder,
  isDeleteFolderDisabled
}: FileListBreadcrumbToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] px-2 py-1.5">
      <nav
        className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm text-[var(--app-foreground)]"
        aria-label="폴더 경로"
      >
        <BreadcrumbDropdown
          label="홈"
          currentPathSegments={[]}
          options={rootBreadcrumbOptions}
          onNavigate={onNavigate}
        />
        {pathSegments.map((segment, index) => (
          <span key={`${segment}-${index}`} className="flex items-center gap-1">
            <span className="text-[var(--app-muted)]" aria-hidden>
              &gt;
            </span>
            <BreadcrumbDropdown
              label={formatPathSegmentLabel(segment)}
              currentPathSegments={pathSegments.slice(0, index + 1)}
              options={listGroupSubfoldersAtPath(
                groups,
                pathSegments.slice(0, index)
              ).map((entry) => ({
                key: `sibling:${pathSegments.slice(0, index).join('/')}:${
                  entry.segment
                }`,
                label: entry.displayLabel,
                pathSegments: [...pathSegments.slice(0, index), entry.segment],
                photoCount: entry.photoCount
              }))}
              onNavigate={onNavigate}
            />
          </span>
        ))}
      </nav>
      {pathSegments.length > 0 && libraryIndex ? (
        <Button
          variant="ghost"
          className="h-7 shrink-0 rounded-[10px] border border-[var(--app-danger)] bg-[var(--app-danger)] px-2.5 text-[11px] font-medium text-[var(--app-danger-foreground)] disabled:opacity-50"
          isDisabled={isDeleteFolderDisabled}
          onPress={onRequestDeleteFolder}
        >
          폴더 삭제
        </Button>
      ) : null}
    </div>
  )
}
