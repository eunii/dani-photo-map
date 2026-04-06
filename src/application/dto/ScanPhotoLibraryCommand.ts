import { z } from 'zod'

import {
  defaultMissingGpsGroupingBasis,
  missingGpsGroupingBases
} from '@domain/policies/MissingGpsGroupingBasis'

export const scanPhotoLibraryCommandSchema = z.object({
  sourceRoot: z.string().min(1),
  outputRoot: z.string().min(1),
  missingGpsGroupingBasis: z
    .enum(missingGpsGroupingBases)
    .default(defaultMissingGpsGroupingBasis),
  groupMetadataOverrides: z
    .array(
      z.object({
        groupKey: z.string().min(1),
        title: z.string(),
        companions: z.array(z.string().min(1)),
        notes: z.string().min(1).optional()
      })
    )
    .optional(),
  pendingGroupAssignments: z
    .array(
      z.object({
        groupKey: z.string().min(1),
        targetGroupId: z.string().min(1)
      })
    )
    .optional(),
  pendingCustomGroupSplits: z
    .array(
      z.object({
        groupKey: z.string().min(1),
        splitId: z.string().min(1),
        title: z.string().min(1),
        photoIds: z.array(z.string().min(1)).min(1)
      })
    )
    .optional(),
  defaultTitleManualPhotoIds: z
    .array(
      z.object({
        photoId: z.string().min(1),
        title: z.string().min(1)
      })
    )
    .optional(),
  /** If set, only photos whose logical groupKey is in this list are copied this run (wizard steps). Omit for full copy. */
  copyGroupKeysInThisRun: z.array(z.string().min(1)).optional()
})

export type ScanPhotoLibraryCommand = z.infer<
  typeof scanPhotoLibraryCommandSchema
>
