import { z } from 'zod'

export const mapGroupSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  photoCount: z.number().int().nonnegative(),
  latitude: z.number(),
  longitude: z.number()
})

export const scanPhotoLibraryResultSchema = z.object({
  scannedCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  keptCount: z.number().int().nonnegative(),
  groupCount: z.number().int().nonnegative(),
  mapGroups: z.array(mapGroupSummarySchema)
})

export type ScanPhotoLibraryResult = z.infer<
  typeof scanPhotoLibraryResultSchema
>
