import {
  getLoadSourceBadge,
  useOutputLibraryIndexPanel
} from '@presentation/renderer/hooks/useOutputLibraryIndexPanel'
import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'

export function useFileListLibraryContext() {
  const panel = useOutputLibraryIndexPanel()
  const pendingFileListPathSegments = useLibraryWorkspaceStore(
    (state) => state.pendingFileListPathSegments
  )
  const consumePendingFileListPathSegments = useLibraryWorkspaceStore(
    (state) => state.consumePendingFileListPathSegments
  )

  const groups = panel.libraryIndex?.groups ?? []
  const sourceBadge = getLoadSourceBadge(panel.loadSource)

  return {
    ...panel,
    groups,
    sourceBadge,
    pendingFileListPathSegments,
    consumePendingFileListPathSegments
  }
}
