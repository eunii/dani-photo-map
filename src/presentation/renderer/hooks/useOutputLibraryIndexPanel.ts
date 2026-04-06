import { useCallback, useEffect, useRef, useState } from 'react'

import { useLibraryWorkspaceStore } from '@presentation/renderer/store/useLibraryWorkspaceStore'
import type {
  LibraryIndexView,
  LibraryIndexLoadSource,
  LoadLibraryIndexResult
} from '@shared/types/preload'

const OUTPUT_DIALOG_OPTIONS = {
  title: '출력 폴더 선택',
  buttonLabel: '출력 폴더 선택'
} as const

export function getLoadSourceBadge(
  source: LibraryIndexLoadSource | null
): { label: string; tone: string; description: string } | null {
  if (source === 'merged') {
    return null
  }

  if (source === 'fallback') {
    return {
      label: '복구 기반',
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
      description: 'index.json 없이 출력 폴더를 스캔해 가능한 범위만 복구했습니다.'
    }
  }

  return null
}

export interface UseOutputLibraryIndexPanelResult {
  outputRoot: string
  setOutputRoot: (value: string) => void
  libraryIndex: LibraryIndexView | null
  loadSource: LibraryIndexLoadSource | null
  setLastLoadedIndex: (value: LoadLibraryIndexResult | null) => void
  isLoadingIndex: boolean
  errorMessage: string | null
  setErrorMessage: (value: string | null) => void
  selectOutputRoot: () => Promise<void>
  reloadLibraryIndex: () => Promise<void>
}

export function useOutputLibraryIndexPanel(): UseOutputLibraryIndexPanelResult {
  const outputRoot = useLibraryWorkspaceStore((state) => state.outputRoot)
  const setOutputRoot = useLibraryWorkspaceStore((state) => state.setOutputRoot)
  const setLastLoadedIndex = useLibraryWorkspaceStore(
    (state) => state.setLastLoadedIndex
  )
  const lastLoadedIndex = useLibraryWorkspaceStore((state) => state.lastLoadedIndex)

  const [isLoadingIndex, setIsLoadingIndex] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /** Tab switches: skip refetch if we already completed a fetch for this path (covers index === null). */
  const lastFetchedOutputRootRef = useRef<string | null>(null)

  useEffect(() => {
    if (!outputRoot) {
      setLastLoadedIndex(null)
      lastFetchedOutputRootRef.current = null
      return
    }

    if (lastFetchedOutputRootRef.current === outputRoot) {
      return
    }

    const cachedIndex =
      useLibraryWorkspaceStore.getState().lastLoadedIndex?.index ?? null
    if (cachedIndex?.outputRoot === outputRoot) {
      lastFetchedOutputRootRef.current = outputRoot
      return
    }

    setIsLoadingIndex(true)
    setErrorMessage(null)
    setLastLoadedIndex(null)

    void window.photoApp
      .loadLibraryIndex({ outputRoot })
      .then((result) => {
        setLastLoadedIndex(result)
        lastFetchedOutputRootRef.current = outputRoot
      })
      .catch((error) => {
        setLastLoadedIndex(null)
        lastFetchedOutputRootRef.current = outputRoot
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '저장된 출력 결과를 불러오지 못했습니다.'
        )
      })
      .finally(() => {
        setIsLoadingIndex(false)
      })
  }, [outputRoot, setLastLoadedIndex])

  const selectOutputRoot = useCallback(async () => {
    const selectedPath = await window.photoApp.selectDirectory(
      OUTPUT_DIALOG_OPTIONS
    )

    if (selectedPath) {
      lastFetchedOutputRootRef.current = null
      setOutputRoot(selectedPath)
      setLastLoadedIndex(null)
      setErrorMessage(null)
    }
  }, [setLastLoadedIndex, setOutputRoot])

  const reloadLibraryIndex = useCallback(async () => {
    if (!outputRoot) {
      setErrorMessage('출력 폴더를 먼저 선택하세요.')
      return
    }

    lastFetchedOutputRootRef.current = null
    setIsLoadingIndex(true)
    setErrorMessage(null)

    try {
      const result = await window.photoApp.loadLibraryIndex({ outputRoot })
      setLastLoadedIndex(result)
      lastFetchedOutputRootRef.current = outputRoot
    } catch (error) {
      lastFetchedOutputRootRef.current = outputRoot
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '저장된 출력 결과를 불러오지 못했습니다.'
      )
    } finally {
      setIsLoadingIndex(false)
    }
  }, [outputRoot, setLastLoadedIndex])

  return {
    outputRoot,
    setOutputRoot,
    libraryIndex: lastLoadedIndex?.index ?? null,
    loadSource: lastLoadedIndex?.source ?? null,
    setLastLoadedIndex,
    isLoadingIndex,
    errorMessage,
    setErrorMessage,
    selectOutputRoot,
    reloadLibraryIndex
  }
}
