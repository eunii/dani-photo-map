import { z } from 'zod'

export const movePhotosToGroupCommandSchema = z.object({
  outputRoot: z.string().min(1),
  sourceGroupId: z.string().min(1),
  destinationGroupId: z.string().min(1),
  photoIds: z.array(z.string().min(1)).min(1)
})

export type MovePhotosToGroupCommand = z.infer<
  typeof movePhotosToGroupCommandSchema
>
