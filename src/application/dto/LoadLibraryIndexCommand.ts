import { z } from 'zod'

export const loadLibraryIndexCommandSchema = z.object({
  outputRoot: z.string().min(1)
})

export type LoadLibraryIndexCommand = z.infer<typeof loadLibraryIndexCommandSchema>
