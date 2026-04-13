import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

import type { MissingGpsGroupingBasis } from '@domain/policies/MissingGpsGroupingBasis'
import type {
  PreviewPendingOrganizationResult,
  LoadLibraryIndexResult
} from '@shared/types/preload'
import { getInitialGroupTitleValue } from '@presentation/renderer/pages/organize/organizeGroupForm'

export interface UseOrganizePreviewOptions {
  sourceRoot: string | null
  outputRoot: string | null
  missingGpsGroupingBasis: MissingGpsGroupingBasis
  setLastLoadedIndex: (index: LoadLibraryIndexResult) => void
  setWizardStepIndex: Dispatch<SetStateAction<number>>
  setGroupTitleInputs: Dispatch<SetStateAction<Record<string, string>>>
  setGroupCompanionsInputs: Dispatch<SetStateAction<Record<string, string>>>
  setGroupNotesInputs: Dispatch<SetStateAction<Record<string, string>>>
  setPreviewImageLoadFailedByPhotoId: Dispatch<
    SetStateAction<Record<string, boolean>>
  >
  resetSavePipelineAfterPreview: () => void
  setErrorMessage: (message: string | null) => void
  setOpenScanResultDetail: Dispatch<
    SetStateAction<
      | null
      | 'inBatchDup'
      | 'incrementalSkip'
      | 'existingSkip'
      | 'warnings'
      | 'failures'
    >
  >
}

export function useOrganizePreview({
  sourceRoot,
  outputRoot,
  missingGpsGroupingBasis,
  setLastLoadedIndex,
  setWizardStepIndex,
  setGroupTitleInputs,
  setGroupCompanionsInputs,
  setGroupNotesInputs,
  setPreviewImageLoadFailedByPhotoId,
  resetSavePipelineAfterPreview,
  setErrorMessage,
  setOpenScanResultDetail
}: UseOrganizePreviewOptions) {
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewResult, setPreviewResult] =
    useState<PreviewPendingOrganizationResult | null>(null)

  const handlePreview = useCallback(
    async (basisOverride?: MissingGpsGroupingBasis): Promise<void> => {
      if (!sourceRoot || !outputRoot) {
        setErrorMessage('원본 폴더와 설정의 출력 폴더를 먼저 준비하세요.')
        return
      }

      const basis = basisOverride ?? missingGpsGroupingBasis

      setIsLoadingPreview(true)
      setErrorMessage(null)

      try {
        const nextPreview = await window.photoApp.previewPendingOrganization({
          sourceRoot,
          outputRoot,
          missingGpsGroupingBasis: basis
        })

        setPreviewResult(nextPreview)
        setWizardStepIndex(0)
        setPreviewImageLoadFailedByPhotoId({})
        setGroupTitleInputs(
          Object.fromEntries(
            nextPreview.groups.map((group) => [
              group.groupKey,
              getInitialGroupTitleValue(group)
            ])
          )
        )
        setGroupCompanionsInputs(
          Object.fromEntries(
            nextPreview.groups.map((group) => [group.groupKey, ''])
          )
        )
        setGroupNotesInputs(
          Object.fromEntries(
            nextPreview.groups.map((group) => [group.groupKey, ''])
          )
        )

        const loadedIndex = await window.photoApp.loadLibraryIndex({ outputRoot })
        setLastLoadedIndex(loadedIndex)
        resetSavePipelineAfterPreview()
        setOpenScanResultDetail(null)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '신규 정리 후보를 불러오지 못했습니다.'
        )
      } finally {
        setIsLoadingPreview(false)
      }
    },
    [
      sourceRoot,
      outputRoot,
      missingGpsGroupingBasis,
      setLastLoadedIndex,
      setWizardStepIndex,
      setGroupTitleInputs,
      setGroupCompanionsInputs,
      setGroupNotesInputs,
      setPreviewImageLoadFailedByPhotoId,
      resetSavePipelineAfterPreview,
      setErrorMessage,
      setOpenScanResultDetail
    ]
  )

  return {
    previewResult,
    setPreviewResult,
    isLoadingPreview,
    handlePreview
  }
}
