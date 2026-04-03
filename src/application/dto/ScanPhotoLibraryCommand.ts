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
    .optional()
})

export type ScanPhotoLibraryCommand = z.infer<
  typeof scanPhotoLibraryCommandSchema
>
