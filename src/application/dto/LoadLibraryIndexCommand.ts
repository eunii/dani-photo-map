import { z } from 'zod'

export const loadLibraryIndexCommandSchema = z.object({
  outputRoot: z.string().min(1),
  mode: z.enum(['default', 'folder-structure-only']).default('default')
})

export type LoadLibraryIndexCommand = z.infer<typeof loadLibraryIndexCommandSchema>
