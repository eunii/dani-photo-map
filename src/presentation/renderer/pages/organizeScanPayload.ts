import type {
  PreviewPendingOrganizationResult,
  ScanPhotoLibraryRequest
} from '@shared/types/preload'

export interface OrganizeCustomSplitInput {
  id: string
  title: string
  photoIds: string[]
}

export interface OrganizeScanFormInputs {
  groupTitleInputs: Record<string, string>
  groupCompanionsInputs: Record<string, string>
  groupNotesInputs: Record<string, string>
  groupAssignmentInputs: Record<string, string>
  groupCustomSplits: Record<string, OrganizeCustomSplitInput[]>
}

export function buildOrganizeScanPayload(
  previewResult: PreviewPendingOrganizationResult,
  includedGroupKeySet: Set<string>,
  inputs: OrganizeScanFormInputs
): Pick<
  ScanPhotoLibraryRequest,
  | 'groupMetadataOverrides'
  | 'pendingGroupAssignments'
  | 'pendingCustomGroupSplits'
  | 'defaultTitleManualPhotoIds'
> {
  const {
    groupTitleInputs,
    groupCompanionsInputs,
    groupNotesInputs,
    groupAssignmentInputs,
    groupCustomSplits
  } = inputs

  const groupMetadataOverrides = previewResult.groups
    .filter((group) => includedGroupKeySet.has(group.groupKey))
    .map((group) => ({
      groupKey: group.groupKey,
      title: groupTitleInputs[group.groupKey]?.trim() ?? '',
      companions: (groupCompanionsInputs[group.groupKey] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
      notes: groupNotesInputs[group.groupKey]?.trim() || undefined
    }))
    .filter((entry) => {
      const group = previewResult.groups.find(
        (candidate) => candidate.groupKey === entry.groupKey
      )

      return group?.assignmentMode !== 'manual-existing-group'
    })

  const pendingGroupAssignments = previewResult.groups
    .filter((group) => includedGroupKeySet.has(group.groupKey))
    .filter((group) => group.assignmentMode === 'manual-existing-group')
    .map((group) => ({
      groupKey: group.groupKey,
      targetGroupId: groupAssignmentInputs[group.groupKey] ?? ''
    }))
    .filter((entry) => entry.targetGroupId.length > 0)

  const pendingCustomGroupSplits = Object.entries(groupCustomSplits)
    .filter(([groupKey]) => includedGroupKeySet.has(groupKey))
    .flatMap(([groupKey, splits]) =>
      splits.map((split) => ({
        groupKey,
        splitId: split.id,
        title: split.title,
        photoIds: split.photoIds
      }))
    )

  const defaultTitleManualPhotoIds: NonNullable<
    ScanPhotoLibraryRequest['defaultTitleManualPhotoIds']
  > = []

  for (const group of previewResult.groups) {
    if (!includedGroupKeySet.has(group.groupKey)) {
      continue
    }

    if ((groupAssignmentInputs[group.groupKey] ?? '').trim().length > 0) {
      continue
    }

    const title = (groupTitleInputs[group.groupKey] ?? '').trim()

    if (!title) {
      continue
    }

    const assigned = new Set(
      (groupCustomSplits[group.groupKey] ?? []).flatMap((split) => split.photoIds)
    )

    for (const photo of group.representativePhotos) {
      if (!assigned.has(photo.id)) {
        defaultTitleManualPhotoIds.push({ photoId: photo.id, title })
      }
    }
  }

  return {
    groupMetadataOverrides,
    pendingGroupAssignments,
    pendingCustomGroupSplits,
    defaultTitleManualPhotoIds
  }
}
