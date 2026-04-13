import { useState, type Dispatch, type SetStateAction } from 'react'

export interface OrganizeGroupInputsState {
  groupTitleInputs: Record<string, string>
  setGroupTitleInputs: Dispatch<SetStateAction<Record<string, string>>>
  groupCompanionsInputs: Record<string, string>
  setGroupCompanionsInputs: Dispatch<SetStateAction<Record<string, string>>>
  groupNotesInputs: Record<string, string>
  setGroupNotesInputs: Dispatch<SetStateAction<Record<string, string>>>
  previewImageLoadFailedByPhotoId: Record<string, boolean>
  setPreviewImageLoadFailedByPhotoId: Dispatch<
    SetStateAction<Record<string, boolean>>
  >
}

export function useOrganizeGroupInputsState(): OrganizeGroupInputsState {
  const [groupTitleInputs, setGroupTitleInputs] = useState<
    Record<string, string>
  >({})
  const [groupCompanionsInputs, setGroupCompanionsInputs] = useState<
    Record<string, string>
  >({})
  const [groupNotesInputs, setGroupNotesInputs] = useState<
    Record<string, string>
  >({})
  const [previewImageLoadFailedByPhotoId, setPreviewImageLoadFailedByPhotoId] =
    useState<Record<string, boolean>>({})

  return {
    groupTitleInputs,
    setGroupTitleInputs,
    groupCompanionsInputs,
    setGroupCompanionsInputs,
    groupNotesInputs,
    setGroupNotesInputs,
    previewImageLoadFailedByPhotoId,
    setPreviewImageLoadFailedByPhotoId
  }
}
