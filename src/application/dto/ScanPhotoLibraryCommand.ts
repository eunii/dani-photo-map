import { z } from 'zod'

export const scanPhotoLibraryCommandSchema = z.object({
  sourceRoot: z.string().min(1),
  outputRoot: z.string().min(1),
  groupMetadataOverrides: z
    .array(
      z.object({
        groupKey: z.string().min(1),
        title: z.string().min(1),
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
    .optional()
})

export type ScanPhotoLibraryCommand = z.infer<
  typeof scanPhotoLibraryCommandSchema
>
