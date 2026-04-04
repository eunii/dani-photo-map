import { z } from 'zod'

export const deleteOutputFolderSubtreeCommandSchema = z.object({
  outputRoot: z.string().min(1),
  pathSegments: z.array(z.string()).min(1)
})

export type DeleteOutputFolderSubtreeCommand = z.infer<
  typeof deleteOutputFolderSubtreeCommandSchema
>
