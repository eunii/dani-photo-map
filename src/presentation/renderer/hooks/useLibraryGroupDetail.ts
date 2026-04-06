import { useEffect, useState } from 'react'

import type { GroupDetail, GroupSummary } from '@shared/types/preload'

const RESTART_HINT =
  '프리로드가 오래된 버전입니다. Electron 창을 다시 실행한 뒤 재시도하세요.'

interface UseLibraryGroupDetailOptions {
  outputRoot?: string
  group?: Pick<GroupSummary, 'id' | 'pathSegments'> | null
}

interface UseLibraryGroupDetailResult {
  groupDetail: GroupDetail | null
  isLoading: boolean
  errorMessage: string | null
}

async function loadLibraryGroupDetail(
  outputRoot: string,
  group: Pick<GroupSummary, 'id' | 'pathSegments'>
): Promise<GroupDetail | null> {
  const app = window.photoApp

  if (typeof app.loadLibraryGroupDetail === 'function') {
    const result = await app.loadLibraryGroupDetail({
      outputRoot,
      groupId: group.id,
      pathSegments: group.pathSegments
    })
    return result.group
  }

  if (typeof app.invokePhotoApp === 'function') {
    const result = (await app.invokePhotoApp('photo-app/load-library-group-detail', {
      outputRoot,
      groupId: group.id,
      pathSegments: group.pathSegments
    })) as { group?: GroupDetail | null }

    return result.group ?? null
  }

  throw new Error(RESTART_HINT)
}

export function useLibraryGroupDetail({
  outputRoot,
  group
}: UseLibraryGroupDetailOptions): UseLibraryGroupDetailResult {
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!outputRoot || !group) {
      setGroupDetail(null)
      setIsLoading(false)
      setErrorMessage(null)
      return () => {
        cancelled = true
      }
    }

    setIsLoading(true)
    setErrorMessage(null)

    void loadLibraryGroupDetail(outputRoot, group)
      .then((nextGroup) => {
        if (cancelled) {
          return
        }
        setGroupDetail(nextGroup)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setGroupDetail(null)
        setErrorMessage(
          error instanceof Error ? error.message : '그룹 상세를 불러오지 못했습니다.'
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [group?.id, group?.pathSegments, outputRoot])

  return {
    groupDetail,
    isLoading,
    errorMessage
  }
}
