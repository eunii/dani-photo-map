import type { ScanPhotoLibraryCommand } from '@application/dto/ScanPhotoLibraryCommand'
import { createPhotoGroups } from '@domain/services/PhotoGroupingService'
import { resolveGroupLabelForOutputFileName } from '@domain/services/PhotoNamingService'
import type { OrganizationRules } from '@domain/policies/OrganizationRules'

import type { PreparedPhotoRecord } from './photoLibraryScanTypes'
import {
  applyDefaultTitleManualGrouping,
  applyPendingCustomGroupSplits
} from './photoLibraryScanGroupingHelpers'

export function computeGroupingMaps(
  preparedPhotoRecords: PreparedPhotoRecord[],
  missingGpsGroupingBasis: ScanPhotoLibraryCommand['missingGpsGroupingBasis'],
  pendingCustomGroupSplits: Array<{
    groupKey: string
    splitId: string
    title: string
    photoIds: string[]
  }>,
  defaultTitleManualPhotoIds: Array<{
    photoId: string
    title: string
  }>
): {
  photoIdToGroupKey: Map<string, string>
  photoIdToDisplayTitle: Map<string, string>
} {
  const photos = preparedPhotoRecords.map((record) => ({ ...record.photo }))
  const afterSplits = applyPendingCustomGroupSplits(
    photos,
    pendingCustomGroupSplits
  )
  const afterManual = applyDefaultTitleManualGrouping(
    afterSplits,
    defaultTitleManualPhotoIds
  )
  const photoIdToGroupKey = new Map<string, string>()
  const photoIdToDisplayTitle = new Map<string, string>()

  for (
    const group of createPhotoGroups(afterManual, {
      missingGpsGroupingBasis
    })
  ) {
    for (const photoId of group.photoIds) {
      photoIdToGroupKey.set(photoId, group.groupKey)
      photoIdToDisplayTitle.set(photoId, group.displayTitle)
    }
  }

  return { photoIdToGroupKey, photoIdToDisplayTitle }
}

export function buildPhotoIdToGroupFileLabelMap(
  preparedPhotoRecords: PreparedPhotoRecord[],
  photoIdToGroupKey: Map<string, string>,
  photoIdToDisplayTitle: Map<string, string>,
  groupMetadataOverrides: Array<{
    groupKey: string
    title: string
    companions: string[]
    notes?: string
  }>,
  rules: OrganizationRules
): Map<string, string> {
  const overrideByGroupKey = new Map(
    groupMetadataOverrides.map(
      (override) => [override.groupKey, override.title] as const
    )
  )
  const photoById = new Map(
    preparedPhotoRecords.map((record) => [record.photo.id, record.photo])
  )
  const result = new Map<string, string>()

  for (const [photoId, groupKey] of photoIdToGroupKey) {
    const displayTitle = photoIdToDisplayTitle.get(photoId) ?? ''
    const photo = photoById.get(photoId)

    const rawOverride = overrideByGroupKey.get(groupKey)

    result.set(
      photoId,
      resolveGroupLabelForOutputFileName(
        {
          displayTitle,
          overrideTitle: rawOverride !== undefined ? rawOverride : undefined,
          regionName: photo?.regionName
        },
        rules
      )
    )
  }

  return result
}
