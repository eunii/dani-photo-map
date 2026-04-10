import { create } from 'zustand'

import type { LoadLibraryIndexResult } from '@shared/types/preload'

const STORAGE_KEYS = {
  sourceRoot: 'photo-organizer/source-root',
  outputRoot: 'photo-organizer/output-root'
} as const

function readStoredPath(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function persistPath(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    void key
    void value
  }
}

interface LibraryWorkspaceState {
  sourceRoot: string
  outputRoot: string
  lastLoadedIndex: LoadLibraryIndexResult | null
  pendingFileListPathSegments: string[] | null
  setSourceRoot: (value: string) => void
  setOutputRoot: (value: string) => void
  setLastLoadedIndex: (value: LoadLibraryIndexResult | null) => void
  setPendingFileListPathSegments: (value: string[] | null) => void
  consumePendingFileListPathSegments: () => string[] | null
}

export const useLibraryWorkspaceStore = create<LibraryWorkspaceState>()(
  (set, get) => ({
    sourceRoot: readStoredPath(STORAGE_KEYS.sourceRoot),
    outputRoot: readStoredPath(STORAGE_KEYS.outputRoot),
    lastLoadedIndex: null,
    pendingFileListPathSegments: null,
    setSourceRoot: (value) => {
      persistPath(STORAGE_KEYS.sourceRoot, value)
      set({
        sourceRoot: value
      })
    },
    setOutputRoot: (value) => {
      persistPath(STORAGE_KEYS.outputRoot, value)
      set({
        outputRoot: value
      })
    },
    setLastLoadedIndex: (value) => {
      set({
        lastLoadedIndex: value
      })
    },
    setPendingFileListPathSegments: (value) => {
      set({
        pendingFileListPathSegments: value
      })
    },
    consumePendingFileListPathSegments: (): string[] | null => {
      const current = get().pendingFileListPathSegments

      set({
        pendingFileListPathSegments: null
      })

      return current
    }
  })
)
