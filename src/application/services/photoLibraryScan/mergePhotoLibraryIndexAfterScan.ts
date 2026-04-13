import type { ExistingOutputLibrarySnapshot } from '@application/ports/ExistingOutputScannerPort'
import { mergeGroupsByMatchingTitle } from '@application/services/mergeGroupsByMatchingTitle'
import { mergeStoredLibraryMetadata } from '@application/services/mergeStoredLibraryMetadata'
import { movePhotosIntoGroup } from '@application/services/movePhotosIntoGroup'
import { rebuildLibraryIndexFromExistingOutput } from '@application/services/rebuildLibraryIndexFromExistingOutput'
import {
  LIBRARY_INDEX_VERSION,
  type LibraryIndex
} from '@domain/entities/LibraryIndex'
import type { Photo } from '@domain/entities/Photo'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'
import { createPhotoGroups } from '@domain/services/PhotoGroupingService'

import type { ScanPathContext, ScanPhotoLibraryDependencies } from './photoLibraryScanTypes'
import {
  applyDefaultTitleManualGrouping,
  applyPendingCustomGroupSplits
} from './photoLibraryScanGroupingHelpers'

export async function loadStoredLibraryIndexSafely(
  outputRoot: string,
  libraryIndexStore: ScanPhotoLibraryDependencies['libraryIndexStore']
): Promise<LibraryIndex | null> {
  try {
    return await libraryIndexStore.load(outputRoot)
  } catch {
    return null
  }
}

function applyGroupMetadataOverrides(
  index: LibraryIndex,
  copiedPhotos: Photo[],
  groupMetadataOverrides: Array<{
    groupKey: string
    title: string
    companions: string[]
    notes?: string
  }>
): LibraryIndex {
  if (copiedPhotos.length === 0 || groupMetadataOverrides.length === 0) {
    return index
  }

  const overrideByPendingGroupKey = new Map(
    groupMetadataOverrides
      .map((override) => [
        override.groupKey,
        {
          title: override.title.trim(),
          companions: Array.from(
            new Set(
              override.companions
                .map((companion) => companion.trim())
                .filter((companion) => companion.length > 0)
            )
          ),
          notes: override.notes?.trim() || undefined
        }
      ] as const)
      .filter((entry) => entry[1].title.length > 0)
  )

  if (overrideByPendingGroupKey.size === 0) {
    return index
  }

  const pendingGroups = createPhotoGroups(copiedPhotos)
  const pendingGroupKeyByPhotoId = new Map<string, string>()

  for (const group of pendingGroups) {
    for (const photoId of group.photoIds) {
      pendingGroupKeyByPhotoId.set(photoId, group.groupKey)
    }
  }

  return {
    ...index,
    groups: index.groups.map((group) => {
      const override = group.photoIds
        .map((photoId) => pendingGroupKeyByPhotoId.get(photoId))
        .map((pendingGroupKey) =>
          pendingGroupKey
            ? overrideByPendingGroupKey.get(pendingGroupKey)
            : undefined
        )
        .find((value) => Boolean(value))

      return override
        ? {
            ...group,
            title: override.title,
            companions: override.companions,
            notes: override.notes
          }
        : group
    })
  }
}

async function applyPendingGroupAssignments(
  index: LibraryIndex,
  outputRoot: string,
  pendingGroupAssignments: Array<{
    groupKey: string
    targetGroupId: string
  }>,
  dependencies: ScanPhotoLibraryDependencies,
  rules: OrganizationRules
): Promise<LibraryIndex> {
  if (pendingGroupAssignments.length === 0) {
    return index
  }

  let nextIndex = index

  for (const assignment of pendingGroupAssignments) {
    const sourceGroup = nextIndex.groups.find(
      (group) => group.groupKey === assignment.groupKey
    )

    if (!sourceGroup || sourceGroup.photoIds.length === 0) {
      continue
    }

    const destinationGroup = nextIndex.groups.find(
      (group) => group.id === assignment.targetGroupId
    )

    if (!destinationGroup) {
      continue
    }

    nextIndex = await movePhotosIntoGroup({
      index: nextIndex,
      outputRoot,
      sourceGroupId: sourceGroup.id,
      destinationGroupId: assignment.targetGroupId,
      photoIds: sourceGroup.photoIds,
      fileSystem: dependencies.fileSystem,
      rules,
      allowDestinationWithoutGps: !destinationGroup.representativeGps
    })
  }

  return nextIndex
}

export async function buildMergedLibraryIndex(
  paths: ScanPathContext,
  existingOutputSnapshot: ExistingOutputLibrarySnapshot,
  storedIndex: LibraryIndex | null,
  copiedPhotos: Photo[],
  groupMetadataOverrides: Array<{
    groupKey: string
    title: string
    companions: string[]
    notes?: string
  }>,
  pendingGroupAssignments: Array<{
    groupKey: string
    targetGroupId: string
  }>,
  pendingCustomGroupSplits: Array<{
    groupKey: string
    splitId: string
    title: string
    photoIds: string[]
  }>,
  defaultTitleManualPhotoIds: Array<{
    photoId: string
    title: string
  }>,
  dependencies: ScanPhotoLibraryDependencies,
  rules: OrganizationRules
): Promise<LibraryIndex> {
  const rebuiltExistingIndex = rebuildLibraryIndexFromExistingOutput(
    existingOutputSnapshot,
    storedIndex
  )
  const mergedBasePhotos = rebuiltExistingIndex?.photos ?? []
  const afterSplits = applyPendingCustomGroupSplits(
    copiedPhotos,
    pendingCustomGroupSplits
  )
  const customizedCopiedPhotos = applyDefaultTitleManualGrouping(
    afterSplits,
    defaultTitleManualPhotoIds
  )
  const rebuiltIndex: LibraryIndex = {
    version: LIBRARY_INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    sourceRoot: paths.sourceRoot,
    outputRoot: paths.outputRoot,
    photos: [...mergedBasePhotos, ...customizedCopiedPhotos],
    groups: createPhotoGroups([...mergedBasePhotos, ...customizedCopiedPhotos])
  }

  const metadataAppliedIndex = applyGroupMetadataOverrides(
    mergeStoredLibraryMetadata(rebuiltIndex, storedIndex),
    customizedCopiedPhotos,
    groupMetadataOverrides
  )

  const afterAssignments = await applyPendingGroupAssignments(
    metadataAppliedIndex,
    paths.outputRoot,
    pendingGroupAssignments,
    dependencies,
    rules
  )

  return mergeGroupsByMatchingTitle({
    index: afterAssignments,
    outputRoot: paths.outputRoot,
    fileSystem: dependencies.fileSystem,
    rules
  })
}
