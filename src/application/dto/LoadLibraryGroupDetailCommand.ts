import { z } from 'zod'

export const loadLibraryGroupDetailCommandSchema = z.object({
  outputRoot: z.string().min(1),
  groupId: z.string().min(1),
  pathSegments: z.array(z.string().min(1)).optional()
})

export type LoadLibraryGroupDetailCommand = z.infer<
  typeof loadLibraryGroupDetailCommandSchema
>
