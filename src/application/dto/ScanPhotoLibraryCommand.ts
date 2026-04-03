import { z } from 'zod'

export const scanPhotoLibraryCommandSchema = z.object({
  sourceRoot: z.string().min(1),
  outputRoot: z.string().min(1),
  groupTitleOverrides: z
    .array(
      z.object({
        groupKey: z.string().min(1),
        title: z.string().min(1)
      })
    )
    .optional()
})

export type ScanPhotoLibraryCommand = z.infer<
  typeof scanPhotoLibraryCommandSchema
>
