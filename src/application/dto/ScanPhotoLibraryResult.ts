import { z } from 'zod'

export const scanPhotoLibraryResultSchema = z.object({
  scannedCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  keptCount: z.number().int().nonnegative(),
  groupCount: z.number().int().nonnegative()
})

export type ScanPhotoLibraryResult = z.infer<
  typeof scanPhotoLibraryResultSchema
>
