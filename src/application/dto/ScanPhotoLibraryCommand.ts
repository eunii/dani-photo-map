import { z } from 'zod'

export const scanPhotoLibraryCommandSchema = z.object({
  sourceRoot: z.string().min(1),
  outputRoot: z.string().min(1)
})

export type ScanPhotoLibraryCommand = z.infer<
  typeof scanPhotoLibraryCommandSchema
>
